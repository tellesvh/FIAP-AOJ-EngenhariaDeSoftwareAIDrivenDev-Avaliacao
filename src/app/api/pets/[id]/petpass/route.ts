import { NextRequest, NextResponse } from "next/server";
import { addDays } from "date-fns";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { avaliarCompliance, type RegistroCompliance } from "@/lib/compliance";
import { registrarNaPolygon } from "@/lib/mocks/polygon";
import { VALIDADE_PETPASS_DIAS, type TipoRegistro } from "@/types/domain";

interface Contexto {
  params: Promise<{ id: string }>;
}

const emitirPetPassSchema = z.object({
  destino_codigo: z.enum(["BR", "UE", "JP"]),
  pagamento_id: z.string().min(1),
});

// POST /api/pets/[id]/petpass — emite o Smart Pet Pass
// Fluxo: valida pagamento aprovado → carrega registros + regra → avaliarCompliance →
// se Apto, grava na Polygon (mock) e salva hash_polygon → dispara evento de domínio.
export async function POST(req: NextRequest, ctx: Contexto): Promise<NextResponse> {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const parsed = emitirPetPassSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }
    const { destino_codigo, pagamento_id } = parsed.data;

    const pet = await prisma.pet.findUnique({ where: { id } });
    if (!pet) {
      return NextResponse.json({ error: "Pet não encontrado" }, { status: 404 });
    }

    // RB-PAG-01: emissão exige pagamento aprovado
    const pagamento = await prisma.pagamento.findUnique({ where: { id: pagamento_id } });
    if (!pagamento) {
      return NextResponse.json({ error: "Pagamento não encontrado" }, { status: 404 });
    }
    if (pagamento.status !== "approved") {
      return NextResponse.json({ error: "Pagamento não aprovado" }, { status: 422 });
    }

    const regra = await prisma.regraDestino.findUnique({ where: { destino_codigo } });
    if (!regra) {
      return NextResponse.json({ error: "Destino não encontrado" }, { status: 404 });
    }

    const registros = await prisma.registroSanitario.findMany({ where: { pet_id: id } });
    const registrosCompliance: RegistroCompliance[] = registros.map((r) => ({
      tipo: r.tipo as TipoRegistro,
      data_aplicacao: r.data_aplicacao,
    }));

    const hoje = new Date();
    const resultado = avaliarCompliance(
      registrosCompliance,
      {
        periodo_carencia_dias: regra.periodo_carencia_dias,
        sorologia_obrigatoria: regra.sorologia_obrigatoria,
        carencia_sorologia_dias: regra.carencia_sorologia_dias,
      },
      hoje,
    );

    let hashPolygon: string | null = null;
    if (resultado.status === "Apto") {
      // I4: registro imutável gravado na Polygon (mock)
      const registroBlockchain = registrarNaPolygon({ pet_id: id, destino_codigo, data_emissao: hoje.toISOString() });
      hashPolygon = registroBlockchain.hash_polygon;
    }

    const petpass = await prisma.petPass.create({
      data: {
        pet_id: id,
        status_compliance: resultado.status,
        motivo: resultado.motivo,
        data_liberacao: resultado.dataLiberacao,
        destino_codigo,
        data_emissao: hoje,
        data_expiracao: addDays(hoje, VALIDADE_PETPASS_DIAS),
        hash_polygon: hashPolygon,
      },
    });

    // Vincula o pagamento ao PetPass emitido (Pagamento não é imutável)
    await prisma.pagamento.update({ where: { id: pagamento_id }, data: { petpass_id: petpass.id } });

    // RB-PP-05: eventos de domínio
    if (resultado.status === "Apto") {
      console.log(`[EVENTO] PetPassEmitido { petpass_id: "${petpass.id}", pet_id: "${id}", destino: "${destino_codigo}" }`);
    } else {
      console.log(`[EVENTO] ComplianceReprovado { pet_id: "${id}", destino: "${destino_codigo}", motivo: "${resultado.motivo}" }`);
    }

    return NextResponse.json(petpass, { status: 201 });
  } catch (erro) {
    return NextResponse.json({ error: "Erro ao emitir Pet Pass" }, { status: 500 });
  }
}
