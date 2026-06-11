import { describe, it, expect } from 'vitest'
import { addDays, subDays } from 'date-fns'
import { avaliarCompliance, type RegistroCompliance, type RegraCompliance } from './compliance'
import {
  PERIODO_CARENCIA_BRASIL_DIAS,
  CARENCIA_SOROLOGIA_UE_DIAS,
  CARENCIA_SOROLOGIA_JP_DIAS,
} from '@/types/domain'

// Data fixa: garante que os cálculos de carência sejam sempre determinísticos.
const HOJE = new Date('2025-01-15T12:00:00.000Z')

const REGRA_BR: RegraCompliance = {
  periodo_carencia_dias: PERIODO_CARENCIA_BRASIL_DIAS,
  sorologia_obrigatoria: false,
  carencia_sorologia_dias: null,
}

const REGRA_UE: RegraCompliance = {
  periodo_carencia_dias: PERIODO_CARENCIA_BRASIL_DIAS,
  sorologia_obrigatoria: true,
  carencia_sorologia_dias: CARENCIA_SOROLOGIA_UE_DIAS,
}

const REGRA_JP: RegraCompliance = {
  periodo_carencia_dias: PERIODO_CARENCIA_BRASIL_DIAS,
  sorologia_obrigatoria: true,
  carencia_sorologia_dias: CARENCIA_SOROLOGIA_JP_DIAS,
}

function reg(tipo: RegistroCompliance['tipo'], diasAtras: number): RegistroCompliance {
  return { tipo, data_aplicacao: subDays(HOJE, diasAtras) }
}

describe('avaliarCompliance', () => {
  // ─── I1 — Vacina antirrábica (todos os destinos) ───────────────────────────
  describe('I1 — Vacina antirrábica', () => {
    it('sem nenhuma vacina → Inapto com mensagem "Nenhuma vacina antirrábica registrada"', () => {
      const r = avaliarCompliance([], REGRA_BR, HOJE)
      expect(r.status).toBe('Inapto')
      expect(r.motivo).toBe('Nenhuma vacina antirrábica registrada')
      expect(r.dataLiberacao).toBeNull()
    })

    it(`vacina há ${PERIODO_CARENCIA_BRASIL_DIAS - 11}d → Inapto com dataLiberacao = aplicacao + carência`, () => {
      const diasAtras = PERIODO_CARENCIA_BRASIL_DIAS - 11 // 10 dias — abaixo da carência de 21d
      const r = avaliarCompliance([reg('Vacina', diasAtras)], REGRA_BR, HOJE)
      expect(r.status).toBe('Inapto')
      const liberacaoEsperada = addDays(subDays(HOJE, diasAtras), PERIODO_CARENCIA_BRASIL_DIAS)
      expect(r.dataLiberacao?.toISOString()).toBe(liberacaoEsperada.toISOString())
    })

    it(`vacina há ${PERIODO_CARENCIA_BRASIL_DIAS + 9}d + destino BR → Apto`, () => {
      // 30 dias atrás — cumpre I1 (≥ 21d)
      const r = avaliarCompliance([reg('Vacina', PERIODO_CARENCIA_BRASIL_DIAS + 9)], REGRA_BR, HOJE)
      expect(r.status).toBe('Apto')
      expect(r.motivo).toBeNull()
      expect(r.dataLiberacao).toBeNull()
    })
  })

  // ─── I2 — Sorologia UE (carência 90d) ─────────────────────────────────────
  describe('I2 — Sorologia UE', () => {
    const vacinaOk = reg('Vacina', PERIODO_CARENCIA_BRASIL_DIAS + 9)

    it('vacina ok + sem sorologia + destino UE → Inapto "Sorologia obrigatória não realizada"', () => {
      const r = avaliarCompliance([vacinaOk], REGRA_UE, HOJE)
      expect(r.status).toBe('Inapto')
      expect(r.motivo).toBe('Sorologia obrigatória não realizada')
    })

    it(`vacina ok + sorologia há ${CARENCIA_SOROLOGIA_UE_DIAS - 10}d + destino UE → Inapto`, () => {
      // 80 dias — abaixo da carência de 90d
      const r = avaliarCompliance(
        [vacinaOk, reg('Sorologia', CARENCIA_SOROLOGIA_UE_DIAS - 10)],
        REGRA_UE,
        HOJE,
      )
      expect(r.status).toBe('Inapto')
    })

    it(`vacina ok + sorologia há ${CARENCIA_SOROLOGIA_UE_DIAS + 5}d + destino UE → Apto`, () => {
      // 95 dias — cumpre I2 (≥ 90d)
      const r = avaliarCompliance(
        [vacinaOk, reg('Sorologia', CARENCIA_SOROLOGIA_UE_DIAS + 5)],
        REGRA_UE,
        HOJE,
      )
      expect(r.status).toBe('Apto')
    })
  })

  // ─── I3 — Sorologia JP (carência 180d) ────────────────────────────────────
  describe('I3 — Sorologia JP', () => {
    const vacinaOk = reg('Vacina', PERIODO_CARENCIA_BRASIL_DIAS + 9)

    it(`sorologia há ${CARENCIA_SOROLOGIA_UE_DIAS + 5}d + destino JP → Inapto (caso Thor: cumpre UE, não JP)`, () => {
      // 95 dias — cumpre I2 mas não I3 (< 180d)
      const r = avaliarCompliance(
        [vacinaOk, reg('Sorologia', CARENCIA_SOROLOGIA_UE_DIAS + 5)],
        REGRA_JP,
        HOJE,
      )
      expect(r.status).toBe('Inapto')
    })

    it(`sorologia há ${CARENCIA_SOROLOGIA_JP_DIAS + 20}d + destino JP → Apto (caso Rex)`, () => {
      // 200 dias — cumpre I3 (≥ 180d)
      const r = avaliarCompliance(
        [vacinaOk, reg('Sorologia', CARENCIA_SOROLOGIA_JP_DIAS + 20)],
        REGRA_JP,
        HOJE,
      )
      expect(r.status).toBe('Apto')
    })
  })

  // ─── I4 — BR: sorologia não é avaliada ────────────────────────────────────
  describe('I4 — Brasil: sorologia presente é ignorada', () => {
    it('vacina ok + sorologia presente + destino BR → Apto (sorologia não avaliada)', () => {
      const r = avaliarCompliance(
        [reg('Vacina', PERIODO_CARENCIA_BRASIL_DIAS + 9), reg('Sorologia', CARENCIA_SOROLOGIA_JP_DIAS + 20)],
        REGRA_BR,
        HOJE,
      )
      expect(r.status).toBe('Apto')
    })
  })
})
