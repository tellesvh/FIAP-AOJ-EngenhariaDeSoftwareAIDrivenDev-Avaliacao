import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface Contexto {
  params: Promise<{ id: string }>;
}

// GET /api/petpass/[id] — retorna petpass com pet incluído
export async function GET(_req: NextRequest, ctx: Contexto): Promise<NextResponse> {
  try {
    const { id } = await ctx.params;
    const petpass = await prisma.petPass.findUnique({
      where: { id },
      include: { pet: true },
    });
    if (!petpass) {
      return NextResponse.json({ error: "Pet Pass não encontrado" }, { status: 404 });
    }
    return NextResponse.json(petpass, { status: 200 });
  } catch (erro) {
    return NextResponse.json({ error: "Erro ao buscar Pet Pass" }, { status: 500 });
  }
}
