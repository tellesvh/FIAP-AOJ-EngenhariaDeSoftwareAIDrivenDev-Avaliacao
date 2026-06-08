// Mock local da blockchain Polygon (ADR 004). Não usa SDK real.
// Retorna um hash determinístico em formato UUID.

import { randomUUID } from "crypto";

export interface RegistroPolygon {
  hash_polygon: string;
}

export function registrarNaPolygon(_payload: Record<string, unknown>): RegistroPolygon {
  const hash_polygon = randomUUID();
  return { hash_polygon };
}
