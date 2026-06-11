import { NextRequest, NextResponse } from "next/server";
import { addDays } from "date-fns";
import { z } from "zod";
import type { Pet, PetPass } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { avaliarCompliance, type RegraCompliance, type RegistroCompliance, type ResultadoCompliance } from "@/lib/compliance";
import { registrarNaPolygon } from "@/lib/mocks/polygon";
import { VALIDADE_PETPASS_DIAS, type TipoRegistro } from "@/types/domain";
import { RouteError } from "@/lib/route-error";

interface Contexto {
  params: Promise<{ id: string }>;
}

interface ContextoCompliance {
  pet: Pet;
  regra: RegraCompliance;
  registrosCompliance: RegistroCompliance[];
}

const emitirPetPassSchema = z.object({
  destino_codigo: z.enum(["BR", "UE", "JP"]),
  pagamento_id: z.string().min(1),
});

// RB-PAG-01: emissão exige pagamento aprovado
async function validarPagamentoAprovado(pagamentoId: string): Promise<void> {
  const pagamento = await prisma.pagamento.findUnique({ where: { id: pagamentoId } });
  if (!pagamento) throw new RouteError(404, "Pagamento não encontrado");
  if (pagamento.status !== "approved") throw new RouteError(422, "Pagamento não aprovado");
}

// Carrega pet, regra de destino e registros sanitários mapeados para compliance.
async function carregarContextoCompliance(petId: string, destinoCodigo: string): Promise<ContextoCompliance> {
  const pet = await prisma.pet.findUnique({ where: { id: petId } });
  if (!pet) throw new RouteError(404, "Pet não encontrado");

  const regraDestino = await prisma.regraDestino.findUnique({ where: { destino_codigo: destinoCodigo } });
  if (!regraDestino) throw new RouteError(404, "Destino não encontrado");

  const registros = await prisma.registroSanitario.findMany({ where: { pet_id: petId } });
  const registrosCompliance: RegistroCompliance[] = registros.map((r) => ({
    tipo: r.tipo as TipoRegistro,
    data_aplicacao: r.data_aplicacao,
  }));

  const regra: RegraCompliance = {
    periodo_carencia_dias: regraDestino.periodo_carencia_dias,
    sorologia_obrigatoria: regraDestino.sorologia_obrigatoria,
    carencia_sorologia_dias: regraDestino.carencia_sorologia_dias,
  };

  return { pet, regra, registrosCompliance };
}

// Persiste o PetPass, registra na Polygon (mock) se Apto (I4) e vincula o pagamento.
async function gravarPetPassEVincularPagamento(dados: {
  petId: string;
  destinoCodigo: string;
  resultado: ResultadoCompliance;
  pagamentoId: string;
  hoje: Date;
}): Promise<PetPass> {
  const { petId, destinoCodigo, resultado, pagamentoId, hoje } = dados;

  let hashPolygon: string | null = null;
  if (resultado.status === "Apto") {
    // I4: registro imutável gravado na Polygon (mock)
    hashPolygon = registrarNaPolygon({ pet_id: petId, destino_codigo: destinoCodigo, data_emissao: hoje.toISOString() }).hash_polygon;
  }

  const petpass = await prisma.petPass.create({
    data: {
      pet_id: petId,
      status_compliance: resultado.status,
      motivo: resultado.motivo,
      data_liberacao: resultado.dataLiberacao,
      destino_codigo: destinoCodigo,
      data_emissao: hoje,
      data_expiracao: addDays(hoje, VALIDADE_PETPASS_DIAS),
      hash_polygon: hashPolygon,
    },
  });

  // Vincula o pagamento ao PetPass emitido (Pagamento não é imutável)
  await prisma.pagamento.update({ where: { id: pagamentoId }, data: { petpass_id: petpass.id } });

  return petpass;
}

// POST /api/pets/[id]/petpass — emite o Smart Pet Pass
// Fluxo: valida pagamento → carrega contexto → avaliarCompliance → grava → evento de domínio.
export async function POST(req: NextRequest, ctx: Contexto): Promise<NextResponse> {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const parsed = emitirPetPassSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
    const { destino_codigo, pagamento_id } = parsed.data;

    await validarPagamentoAprovado(pagamento_id);
    const { regra, registrosCompliance } = await carregarContextoCompliance(id, destino_codigo);
    const hoje = new Date();
    const resultado = avaliarCompliance(registrosCompliance, regra, hoje);
    const petpass = await gravarPetPassEVincularPagamento({ petId: id, destinoCodigo: destino_codigo, resultado, pagamentoId: pagamento_id, hoje });

    // RB-PP-05: eventos de domínio
    if (resultado.status === "Apto") {
      console.log(`[EVENTO] PetPassEmitido { petpass_id: "${petpass.id}", pet_id: "${id}", destino: "${destino_codigo}" }`);
    } else {
      console.log(`[EVENTO] ComplianceReprovado { pet_id: "${id}", destino: "${destino_codigo}", motivo: "${resultado.motivo}" }`);
    }

    return NextResponse.json(petpass, { status: 201 });
  } catch (erro) {
    if (erro instanceof RouteError) return NextResponse.json({ error: erro.message }, { status: erro.status });
    console.error("[ROUTE_ERROR] POST /api/pets/[id]/petpass:", erro);
    return NextResponse.json({ error: "Erro ao emitir Pet Pass" }, { status: 500 });
  }
}
