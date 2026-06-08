import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { avaliarCompliance, type RegistroCompliance } from "@/lib/compliance";
import { registrarNaPolygon } from "@/lib/mocks/polygon";
import type { TipoRegistro } from "@/types/domain";

interface Contexto {
  params: Promise<{ id: string }>;
}

// POST /api/petpass/[id]/compliance — reavalia e atualiza status no banco.
// I4 / Restrição 2: um PetPass "Apto" é IMUTÁVEL — nunca é atualizado.
export async function POST(_req: NextRequest, ctx: Contexto): Promise<NextResponse> {
  try {
    const { id } = await ctx.params;
    const petpass = await prisma.petPass.findUnique({ where: { id } });
    if (!petpass) {
      return NextResponse.json({ error: "Pet Pass não encontrado" }, { status: 404 });
    }

    // I4: PetPass emitido como Apto é imutável — retorna sem alterar.
    if (petpass.status_compliance === "Apto") {
      return NextResponse.json(
        { ...petpass, imutavel: true, mensagem: "PetPass Apto é imutável (I4); reavaliação não altera o registro." },
        { status: 200 },
      );
    }

    const regra = await prisma.regraDestino.findUnique({ where: { destino_codigo: petpass.destino_codigo } });
    if (!regra) {
      return NextResponse.json({ error: "Destino não encontrado" }, { status: 404 });
    }

    const registros = await prisma.registroSanitario.findMany({ where: { pet_id: petpass.pet_id } });
    const registrosCompliance: RegistroCompliance[] = registros.map((r) => ({
      tipo: r.tipo as TipoRegistro,
      data_aplicacao: r.data_aplicacao,
    }));

    const resultado = avaliarCompliance(
      registrosCompliance,
      {
        periodo_carencia_dias: regra.periodo_carencia_dias,
        sorologia_obrigatoria: regra.sorologia_obrigatoria,
        carencia_sorologia_dias: regra.carencia_sorologia_dias,
      },
      new Date(),
    );

    // Atualização permitida: o registro atual é "Inapto" (não imutável).
    let hashPolygon: string | null = petpass.hash_polygon;
    if (resultado.status === "Apto" && !hashPolygon) {
      hashPolygon = registrarNaPolygon({ pet_id: petpass.pet_id, destino_codigo: petpass.destino_codigo }).hash_polygon;
    }

    const atualizado = await prisma.petPass.update({
      where: { id },
      data: {
        status_compliance: resultado.status,
        motivo: resultado.motivo,
        data_liberacao: resultado.dataLiberacao,
        hash_polygon: hashPolygon,
      },
    });

    if (resultado.status === "Apto") {
      console.log(`[EVENTO] PetPassEmitido { petpass_id: "${atualizado.id}", pet_id: "${atualizado.pet_id}", via: "reavaliacao" }`);
    } else {
      console.log(`[EVENTO] ComplianceReprovado { petpass_id: "${atualizado.id}", motivo: "${resultado.motivo}" }`);
    }

    return NextResponse.json(atualizado, { status: 200 });
  } catch (erro) {
    return NextResponse.json({ error: "Erro ao reavaliar compliance" }, { status: 500 });
  }
}
