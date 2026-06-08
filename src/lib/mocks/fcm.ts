// Mock local do Firebase Cloud Messaging (ADR 004). Não usa SDK real.
// Loga a mensagem do alerta no console.

export interface ResultadoFcm {
  enviado: true;
}

export function enviarAlertaFcm(mensagem: string): ResultadoFcm {
  console.log(`[FCM] Alerta: ${mensagem}`);
  return { enviado: true };
}
