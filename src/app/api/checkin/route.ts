import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { PetPass } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { avaliarCompliance, type RegistroCompliance } from "@/lib/compliance";
import type { TipoRegistro } from "@/types/domain";

const checkinSchema = z.object({
  microchip: z.string().min(1),
  destino_codigo: z.enum(["BR", "UE", "JP"]),
});

// RB-CP-03: busca PetPass Apto e não expirado para o pet + destino no momento do embarque.
async function localizarPetPassAtivo(petId: string, destinoCodigo: string, hoje: Date): Promise<PetPass | null> {
  return prisma.petPass.findFirst({
    where: {
      pet_id: petId,
      destino_codigo: destinoCodigo,
      status_compliance: "Apto",
      data_expiracao: { gt: hoje },
    },
    orderBy: { data_emissao: "desc" },
  });
}

// POST /api/checkin — valida embarque por leitura de microchip (RB-CP-03)
// Busca pet pelo microchip → petpass ativo (Apto + não expirado) → reavalia → libera.
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const parsed = checkinSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
    const { microchip, destino_codigo } = parsed.data;

    const pet = await prisma.pet.findUnique({ where: { microchip } });
    if (!pet) return NextResponse.json({ error: "Microchip não encontrado" }, { status: 404 });

    const hoje = new Date();
    const petpass = await localizarPetPassAtivo(pet.id, destino_codigo, hoje);
    if (!petpass) return NextResponse.json({ liberado: false, motivo: "Nenhum Pet Pass ativo (Apto e válido) para o destino informado" }, { status: 200 });

    const regra = await prisma.regraDestino.findUnique({ where: { destino_codigo } });
    if (!regra) return NextResponse.json({ error: "Destino não encontrado" }, { status: 404 });

    const registros = await prisma.registroSanitario.findMany({ where: { pet_id: pet.id } });
    const registrosCompliance: RegistroCompliance[] = registros.map((r) => ({ tipo: r.tipo as TipoRegistro, data_aplicacao: r.data_aplicacao }));

    // Reavaliação read-only no momento do embarque (I4: não muta o PetPass Apto)
    const resultado = avaliarCompliance(registrosCompliance, { periodo_carencia_dias: regra.periodo_carencia_dias, sorologia_obrigatoria: regra.sorologia_obrigatoria, carencia_sorologia_dias: regra.carencia_sorologia_dias }, hoje);

    if (resultado.status === "Apto") {
      return NextResponse.json({ liberado: true, pet: { id: pet.id, nome: pet.nome }, destino_codigo, petpass_id: petpass.id }, { status: 200 });
    }
    return NextResponse.json({ liberado: false, motivo: resultado.motivo }, { status: 200 });
  } catch (erro) {
    console.error("[ROUTE_ERROR] POST /api/checkin:", erro);
    return NextResponse.json({ error: "Erro ao processar check-in" }, { status: 500 });
  }
}
