// Motor de Compliance as a Service (CaaS) — função pura.
// Não importa Prisma nem faz chamadas de rede (restrição de implementação 4).
// Rastreável às invariantes I1 (vacina 21d BR), I2 (sorologia 90d UE), I3 (sorologia 180d JP).

import { addDays, differenceInDays } from "date-fns";
import type { StatusCompliance, TipoRegistro } from "@/types/domain";

export interface RegistroCompliance {
  tipo: TipoRegistro;
  data_aplicacao: Date;
}

export interface RegraCompliance {
  periodo_carencia_dias: number;
  sorologia_obrigatoria: boolean;
  carencia_sorologia_dias: number | null;
}

export interface ResultadoCompliance {
  status: StatusCompliance;
  motivo: string | null;
  dataLiberacao: Date | null;
}

// Retorna o registro mais recente de um tipo (ordena por data_aplicacao DESC).
function maisRecentePorTipo(
  registros: RegistroCompliance[],
  tipo: TipoRegistro,
): RegistroCompliance | null {
  const ordenados = registros
    .filter((r) => r.tipo === tipo)
    .sort((a, b) => b.data_aplicacao.getTime() - a.data_aplicacao.getTime());
  return ordenados[0] ?? null;
}

export function avaliarCompliance(
  registros: RegistroCompliance[],
  regra: RegraCompliance,
  hoje: Date = new Date(),
): ResultadoCompliance {
  // I1 — Vacina antirrábica (todos os destinos)
  const vacina = maisRecentePorTipo(registros, "Vacina");
  if (!vacina) {
    return { status: "Inapto", motivo: "Nenhuma vacina antirrábica registrada", dataLiberacao: null };
  }

  const diasDesdeVacina = differenceInDays(hoje, vacina.data_aplicacao);
  if (diasDesdeVacina < regra.periodo_carencia_dias) {
    return {
      status: "Inapto",
      motivo: `Carência de vacina não cumprida (${diasDesdeVacina}/${regra.periodo_carencia_dias} dias)`,
      dataLiberacao: addDays(vacina.data_aplicacao, regra.periodo_carencia_dias),
    };
  }

  // I2/I3 — Sorologia (apenas se obrigatória para o destino)
  if (regra.sorologia_obrigatoria) {
    const carenciaSorologia = regra.carencia_sorologia_dias ?? 0;
    const sorologia = maisRecentePorTipo(registros, "Sorologia");
    if (!sorologia) {
      return { status: "Inapto", motivo: "Sorologia obrigatória não realizada", dataLiberacao: null };
    }

    const diasDesdeSorologia = differenceInDays(hoje, sorologia.data_aplicacao);
    if (diasDesdeSorologia < carenciaSorologia) {
      return {
        status: "Inapto",
        motivo: `Carência de sorologia não cumprida (${diasDesdeSorologia}/${carenciaSorologia} dias)`,
        dataLiberacao: addDays(sorologia.data_aplicacao, carenciaSorologia),
      };
    }
  }

  // Nenhuma invariante violada → Apto
  return { status: "Apto", motivo: null, dataLiberacao: null };
}
