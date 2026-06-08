import { NextRequest, NextResponse } from "next/server";
import { addDays, differenceInDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { INTERVALO_DOSE_DIAS, JANELA_ALERTA_DIAS, TIPOS_REGISTRO_VALIDOS, type TipoRegistro } from "@/types/domain";

interface Contexto {
  params: Promise<{ id: string }>;
}

interface Alerta {
  tipo: TipoRegistro;
  proxima_dose: string;
  dias_restantes: number;
  janela: "D-1" | "D-3" | "D-7";
}

// Classifica o alerta na janela proativa D-7/D-3/D-1 (US001).
function classificarJanela(diasRestantes: number): Alerta["janela"] {
  if (diasRestantes <= 1) return "D-1";
  if (diasRestantes <= 3) return "D-3";
  return "D-7";
}

// GET /api/pets/[id]/alertas — procedimentos que vencem em 1, 3 ou 7 dias a partir de hoje (ADR 005, on-demand)
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
    const alertas: Alerta[] = [];

    for (const tipo of TIPOS_REGISTRO_VALIDOS) {
      const ultimo = registros.find((r) => r.tipo === tipo);
      if (!ultimo) continue;
      const proxima = addDays(ultimo.data_aplicacao, INTERVALO_DOSE_DIAS[tipo]);
      const diasRestantes = differenceInDays(proxima, hoje);
      // Janela proativa: vence em até 7 dias a partir de hoje (D-7/D-3/D-1)
      if (diasRestantes >= 0 && diasRestantes <= JANELA_ALERTA_DIAS) {
        alertas.push({
          tipo,
          proxima_dose: proxima.toISOString(),
          dias_restantes: diasRestantes,
          janela: classificarJanela(diasRestantes),
        });
      }
    }

    return NextResponse.json({ pet_id: id, alertas }, { status: 200 });
  } catch (erro) {
    return NextResponse.json({ error: "Erro ao calcular alertas" }, { status: 500 });
  }
}
