// Tipos do domínio iPet / Smart Pet Pass.
// PascalCase sem prefixo "I" (standards.md).

export type StatusCompliance = "Apto" | "Inapto";
export type TipoEspecie = "Cao" | "Gato";
export type TipoRegistro = "Vacina" | "Vermifugo" | "Antipulga" | "Sorologia";
export type DestinoCodigo = "BR" | "UE" | "JP";

// Valor de emissão do Smart Pet Pass (taxa B2B2C — mock).
export const VALOR_EMISSAO_PETPASS = 149.9;

// Validade do PetPass emitido, em dias.
export const VALIDADE_PETPASS_DIAS = 90;

// Períodos de carência por invariante (I1 — Brasil, I2 — UE, I3 — Japão).
export const PERIODO_CARENCIA_BRASIL_DIAS = 21;
export const CARENCIA_SOROLOGIA_UE_DIAS = 90;
export const CARENCIA_SOROLOGIA_JP_DIAS = 180;

// Janela de alertas proativos (US001 — D-7/D-3/D-1).
export const JANELA_ALERTA_DIAS = 7;

// Intervalo padrão entre doses por tipo de procedimento, em dias.
export const INTERVALO_DOSE_DIAS: Record<TipoRegistro, number> = {
  Vacina: 365,
  Vermifugo: 90,
  Antipulga: 30,
  Sorologia: 365,
};

export const DESTINOS_VALIDOS: readonly DestinoCodigo[] = ["BR", "UE", "JP"] as const;
export const ESPECIES_VALIDAS: readonly TipoEspecie[] = ["Cao", "Gato"] as const;
export const TIPOS_REGISTRO_VALIDOS: readonly TipoRegistro[] = ["Vacina", "Vermifugo", "Antipulga", "Sorologia"] as const;
