import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { enviarAlertaFcm } from "@/lib/mocks/fcm";

interface Contexto {
  params: Promise<{ id: string }>;
}

const criarRegistroSchema = z.object({
  veterinario_id: z.string().min(1),
  tipo: z.enum(["Vacina", "Vermifugo", "Antipulga", "Sorologia"]),
  data_aplicacao: z.coerce.date(),
  sorologia_result: z.string().optional(),
});

// GET /api/pets/[id]/registros-sanitarios — histórico ordenado por data DESC
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
      include: { veterinario: true },
    });
    return NextResponse.json(registros, { status: 200 });
  } catch (erro) {
    console.error("[ROUTE_ERROR] GET /api/pets/[id]/registros-sanitarios:", erro);
    return NextResponse.json({ error: "Erro ao listar registros sanitários" }, { status: 500 });
  }
}

// POST /api/pets/[id]/registros-sanitarios — cria registro; após salvar, dispara mock FCM
export async function POST(req: NextRequest, ctx: Contexto): Promise<NextResponse> {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const parsed = criarRegistroSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }
    const dados = parsed.data;

    const pet = await prisma.pet.findUnique({ where: { id } });
    if (!pet) {
      return NextResponse.json({ error: "Pet não encontrado" }, { status: 404 });
    }

    const veterinario = await prisma.veterinario.findUnique({ where: { id: dados.veterinario_id } });
    if (!veterinario) {
      return NextResponse.json({ error: "Veterinário não encontrado" }, { status: 404 });
    }
    // RB-VET-01: apenas veterinário habilitado origina registro válido
    if (!veterinario.habilitado) {
      return NextResponse.json({ error: "Veterinário não habilitado" }, { status: 422 });
    }
    // RB-GS-03: não se registra evento sanitário no futuro
    if (dados.data_aplicacao.getTime() > Date.now()) {
      return NextResponse.json({ error: "Data de aplicação não pode ser futura" }, { status: 422 });
    }

    const registro = await prisma.registroSanitario.create({
      data: {
        pet_id: id,
        veterinario_id: dados.veterinario_id,
        tipo: dados.tipo,
        data_aplicacao: dados.data_aplicacao,
        sorologia_result: dados.sorologia_result ?? null,
      },
    });

    // ADR 004: alerta proativo via mock FCM
    enviarAlertaFcm(`Novo registro de ${dados.tipo} para o pet ${pet.nome} (${pet.id}).`);

    return NextResponse.json(registro, { status: 201 });
  } catch (erro) {
    console.error("[ROUTE_ERROR] POST /api/pets/[id]/registros-sanitarios:", erro);
    return NextResponse.json({ error: "Erro ao criar registro sanitário" }, { status: 500 });
  }
}
