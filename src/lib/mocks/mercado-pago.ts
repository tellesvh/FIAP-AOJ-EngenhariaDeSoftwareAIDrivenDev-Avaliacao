// Mock local do Mercado Pago (ADR 004). Não usa SDK real.
// Conformist (RB-PAG-01): retorna sempre approved com id fixo.

export interface ResultadoMercadoPago {
  status: "approved";
  id: string;
}

export function processarPagamento(): ResultadoMercadoPago {
  return { status: "approved", id: "mock-pagamento-001" };
}
