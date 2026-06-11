import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { processarPagamento } from "@/lib/mocks/mercado-pago";
import { VALOR_EMISSAO_PETPASS } from "@/types/domain";

const criarPagamentoSchema = z.object({
  responsavel_id: z.string().min(1),
  valor: z.number().positive().optional(),
  metodo: z.string().min(1).optional(),
});

// POST /api/pagamentos — chama mock Mercado Pago, cria e retorna Pagamento approved
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const parsed = criarPagamentoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }
    const dados = parsed.data;

    const responsavel = await prisma.responsavel.findUnique({ where: { id: dados.responsavel_id } });
    if (!responsavel) {
      return NextResponse.json({ error: "Responsável não encontrado" }, { status: 404 });
    }

    // ADR 004 / RB-PAG-01: mock retorna approved determinístico.
    // O id do gateway (resultado.id) é fixo no mock; o PK do Pagamento é gerado pelo Prisma.
    const resultado = processarPagamento();

    const pagamento = await prisma.pagamento.create({
      data: {
        responsavel_id: dados.responsavel_id,
        valor: dados.valor ?? VALOR_EMISSAO_PETPASS,
        metodo: dados.metodo ?? "mercado_pago",
        status: resultado.status,
      },
    });

    return NextResponse.json(pagamento, { status: 201 });
  } catch (erro) {
    console.error("[ROUTE_ERROR] POST /api/pagamentos:", erro);
    return NextResponse.json({ error: "Erro ao processar pagamento" }, { status: 500 });
  }
}
