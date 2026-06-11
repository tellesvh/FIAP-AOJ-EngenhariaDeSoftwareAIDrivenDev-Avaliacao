import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const criarPetSchema = z.object({
  nome: z.string().min(1),
  data_nascimento: z.coerce.date(),
  tipo_especie: z.enum(["Cao", "Gato"]),
  microchip: z.string().min(1),
  responsavel_id: z.string().min(1),
});

// GET /api/pets — lista pets; filtro opcional ?responsavel_id=
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const responsavelId = req.nextUrl.searchParams.get("responsavel_id");
    const pets = await prisma.pet.findMany({
      where: responsavelId ? { responsavel_id: responsavelId } : undefined,
      include: { responsavel: true },
      orderBy: { nome: "asc" },
    });
    return NextResponse.json(pets, { status: 200 });
  } catch (erro) {
    console.error("[ROUTE_ERROR] GET /api/pets:", erro);
    return NextResponse.json({ error: "Erro ao listar pets" }, { status: 500 });
  }
}

// POST /api/pets — cria pet (valida tipo_especie e microchip único)
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const parsed = criarPetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }
    const dados = parsed.data;

    const responsavel = await prisma.responsavel.findUnique({ where: { id: dados.responsavel_id } });
    if (!responsavel) {
      return NextResponse.json({ error: "Responsável não encontrado" }, { status: 404 });
    }

    const microchipExistente = await prisma.pet.findUnique({ where: { microchip: dados.microchip } });
    if (microchipExistente) {
      return NextResponse.json({ error: "Microchip já cadastrado" }, { status: 422 });
    }

    const pet = await prisma.pet.create({
      data: {
        nome: dados.nome,
        data_nascimento: dados.data_nascimento,
        tipo_especie: dados.tipo_especie,
        microchip: dados.microchip,
        responsavel_id: dados.responsavel_id,
      },
    });
    return NextResponse.json(pet, { status: 201 });
  } catch (erro) {
    console.error("[ROUTE_ERROR] POST /api/pets:", erro);
    return NextResponse.json({ error: "Erro ao criar pet" }, { status: 500 });
  }
}
