import { NextRequest, NextResponse } from "next/server";
import { addDays, differenceInDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { INTERVALO_DOSE_DIAS, TIPOS_REGISTRO_VALIDOS, type TipoRegistro } from "@/types/domain";

interface Contexto {
  params: Promise<{ id: string }>;
}

interface DoseCronograma {
  tipo: TipoRegistro;
  ultima_aplicacao: string;
  proxima_dose: string;
  intervalo_dias: number;
  dias_restantes: number;
}

// GET /api/pets/[id]/cronograma — próxima dose de cada tipo com dias_restantes
export async function GET(_req: NextRequest, ctx: Contexto): Promise<NextResponse> {
  try {
    const { id } = await ctx.params;
    const pet = await prisma.pet.findUnique({ where: { id } });
    if (!pet) {
      return NextResponse.json({ error: "Pet não encontrado" }, { status: 404 });
    }

    const registros = await prisma.registroSanitario.findMany({
      where: { pet_id: id },
      orderBy: { data_aplicacao: "desc" },
    });

    const hoje = new Date();
    const doses: DoseCronograma[] = [];

    for (const tipo of TIPOS_REGISTRO_VALIDOS) {
      const ultimo = registros.find((r) => r.tipo === tipo);
      if (!ultimo) continue;
      const intervalo = INTERVALO_DOSE_DIAS[tipo];
      const proxima = addDays(ultimo.data_aplicacao, intervalo);
      doses.push({
        tipo,
        ultima_aplicacao: ultimo.data_aplicacao.toISOString(),
        proxima_dose: proxima.toISOString(),
        intervalo_dias: intervalo,
        dias_restantes: differenceInDays(proxima, hoje),
      });
    }

    return NextResponse.json({ pet_id: id, doses }, { status: 200 });
  } catch (erro) {
    return NextResponse.json({ error: "Erro ao calcular cronograma" }, { status: 500 });
  }
}
