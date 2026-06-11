// Erro tipado para propagar status HTTP a partir de funções auxiliares de route handlers.
// Permite que try/catch no handler devolva 4xx/5xx sem misturar NextResponse com lógica de domínio.
export class RouteError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "RouteError";
  }
}
