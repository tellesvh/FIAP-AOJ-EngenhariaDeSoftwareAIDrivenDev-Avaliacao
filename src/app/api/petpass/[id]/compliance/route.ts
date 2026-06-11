import { NextRequest, NextResponse } from "next/server";
import { addDays } from "date-fns";
import type { PetPass } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { avaliarCompliance, type RegraCompliance, type RegistroCompliance, type ResultadoCompliance } from "@/lib/compliance";
import { registrarNaPolygon } from "@/lib/mocks/polygon";
import { VALIDADE_PETPASS_DIAS, type TipoRegistro } from "@/types/domain";
import { RouteError } from "@/lib/route-error";

interface Contexto {
  params: Promise<{ id: string }>;
}

interface DadosReavaliacao {
  petpass: PetPass;
  regra: RegraCompliance;
  registrosCompliance: RegistroCompliance[];
}

// Carrega PetPass, regra de destino e registros sanitários para reavaliação.
async function carregarDadosParaReavaliacao(petPassId: string): Promise<DadosReavaliacao> {
  const petpass = await prisma.petPass.findUnique({ where: { id: petPassId } });
  if (!petpass) throw new RouteError(404, "Pet Pass não encontrado");

  const regraDestino = await prisma.regraDestino.findUnique({ where: { destino_codigo: petpass.destino_codigo } });
  if (!regraDestino) throw new RouteError(404, "Destino não encontrado");

  const registros = await prisma.registroSanitario.findMany({ where: { pet_id: petpass.pet_id } });
  const registrosCompliance: RegistroCompliance[] = registros.map((r) => ({
    tipo: r.tipo as TipoRegistro,
    data_aplicacao: r.data_aplicacao,
  }));

  const regra: RegraCompliance = {
    periodo_carencia_dias: regraDestino.periodo_carencia_dias,
    sorologia_obrigatoria: regraDestino.sorologia_obrigatoria,
    carencia_sorologia_dias: regraDestino.carencia_sorologia_dias,
  };

  return { petpass, regra, registrosCompliance };
}

// Persiste a reavaliação de um PetPass Inapto.
// FQ-007: se o novo status for Apto, estende data_expiracao para agora + VALIDADE_PETPASS_DIAS,
// evitando o estado inconsistente Apto + Expirado.
async function reavaliarEPersistir(
  petPassId: string,
  petpassAtual: PetPass,
  resultado: ResultadoCompliance,
): Promise<PetPass> {
  let hashPolygon: string | null = petpassAtual.hash_polygon;
  if (resultado.status === "Apto" && !hashPolygon) {
    hashPolygon = registrarNaPolygon({ pet_id: petpassAtual.pet_id, destino_codigo: petpassAtual.destino_codigo }).hash_polygon;
  }

  return prisma.petPass.update({
    where: { id: petPassId },
    data: {
      status_compliance: resultado.status,
      motivo: resultado.motivo,
      data_liberacao: resultado.dataLiberacao,
      hash_polygon: hashPolygon,
      data_expiracao: resultado.status === "Apto" ? addDays(new Date(), VALIDADE_PETPASS_DIAS) : undefined,
    },
  });
}

// POST /api/petpass/[id]/compliance — reavalia e atualiza status no banco.
// I4 / Restrição 2: um PetPass "Apto" é IMUTÁVEL — nunca é atualizado.
export async function POST(_req: NextRequest, ctx: Contexto): Promise<NextResponse> {
  try {
    const { id } = await ctx.params;
    const { petpass, regra, registrosCompliance } = await carregarDadosParaReavaliacao(id);

    // I4: PetPass emitido como Apto é imutável — retorna sem alterar.
    if (petpass.status_compliance === "Apto") {
      return NextResponse.json(
        { ...petpass, imutavel: true, mensagem: "PetPass Apto é imutável (I4); reavaliação não altera o registro." },
        { status: 200 },
      );
    }

    const resultado = avaliarCompliance(registrosCompliance, regra, new Date());
    const atualizado = await reavaliarEPersistir(id, petpass, resultado);

    if (resultado.status === "Apto") {
      console.log(`[EVENTO] PetPassEmitido { petpass_id: "${atualizado.id}", pet_id: "${atualizado.pet_id}", via: "reavaliacao" }`);
    } else {
      console.log(`[EVENTO] ComplianceReprovado { petpass_id: "${atualizado.id}", motivo: "${resultado.motivo}" }`);
    }

    return NextResponse.json(atualizado, { status: 200 });
  } catch (erro) {
    if (erro instanceof RouteError) return NextResponse.json({ error: erro.message }, { status: erro.status });
    console.error("[ROUTE_ERROR] POST /api/petpass/[id]/compliance:", erro);
    return NextResponse.json({ error: "Erro ao reavaliar compliance" }, { status: 500 });
  }
}
