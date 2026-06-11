import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface Contexto {
  params: Promise<{ codigo: string }>;
}

// GET /api/destinos/[codigo] — retorna a RegraDestino
export async function GET(_req: NextRequest, ctx: Contexto): Promise<NextResponse> {
  try {
    const { codigo } = await ctx.params;
    const regra = await prisma.regraDestino.findUnique({ where: { destino_codigo: codigo.toUpperCase() } });
    if (!regra) {
      return NextResponse.json({ error: "Destino não encontrado" }, { status: 404 });
    }
    return NextResponse.json(regra, { status: 200 });
  } catch (erro) {
    console.error("[ROUTE_ERROR] GET /api/destinos/[codigo]:", erro);
    return NextResponse.json({ error: "Erro ao buscar destino" }, { status: 500 });
  }
}
