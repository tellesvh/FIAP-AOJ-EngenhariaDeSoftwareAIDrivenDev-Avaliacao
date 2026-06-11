import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface Contexto {
  params: Promise<{ id: string }>;
}

// GET /api/pets/[id] — pet + registros sanitários + petpass mais recente
export async function GET(_req: NextRequest, ctx: Contexto): Promise<NextResponse> {
  try {
    const { id } = await ctx.params;
    const pet = await prisma.pet.findUnique({
      where: { id },
      include: {
        responsavel: true,
        registros: { orderBy: { data_aplicacao: "desc" } },
        petpasses: { orderBy: { data_emissao: "desc" } },
      },
    });

    if (!pet) {
      return NextResponse.json({ error: "Pet não encontrado" }, { status: 404 });
    }

    const { petpasses, ...dadosPet } = pet;
    return NextResponse.json(
      { ...dadosPet, registros: pet.registros, petpass: petpasses[0] ?? null },
      { status: 200 },
    );
  } catch (erro) {
    console.error("[ROUTE_ERROR] GET /api/pets/[id]:", erro);
    return NextResponse.json({ error: "Erro ao buscar pet" }, { status: 500 });
  }
}
