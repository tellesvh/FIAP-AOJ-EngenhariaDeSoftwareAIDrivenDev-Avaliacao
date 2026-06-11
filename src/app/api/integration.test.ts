// DATABASE_URL precisa ser definido antes que qualquer módulo importe o singleton do Prisma.
// A garantia real vem do src/test/setup.ts (setupFiles no vitest.config.ts);
// esta linha serve de documentação e redundância explícita.
process.env.DATABASE_URL = 'file:./prisma/test.db'

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'child_process'
import { subDays, addDays, startOfDay } from 'date-fns'
import { NextRequest } from 'next/server'

import { GET as getPets, POST as postPets } from './pets/route'
import { POST as postPagamentos } from './pagamentos/route'
import { POST as postPetPass } from './pets/[id]/petpass/route'
import { GET as getAlertas } from './pets/[id]/alertas/route'
import { GET as getCronograma } from './pets/[id]/cronograma/route'
import { POST as postCheckin } from './checkin/route'
import { POST as postRegistros } from './pets/[id]/registros-sanitarios/route'

import { prisma } from '@/lib/prisma'
import { INTERVALO_DOSE_DIAS } from '@/types/domain'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function jsonPost(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeCtx(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

// ─── Setup / Teardown ────────────────────────────────────────────────────────

beforeAll(() => {
  // Banco de teste limpo a cada execução para garantir dados determinísticos.
  execSync('rm -f ./prisma/test.db ./prisma/test.db-wal ./prisma/test.db-shm', { stdio: 'pipe' })
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: 'file:./prisma/test.db' },
    stdio: 'pipe',
  })
  execSync('npx prisma db seed', {
    env: { ...process.env, DATABASE_URL: 'file:./prisma/test.db' },
    stdio: 'pipe',
  })
})

afterAll(async () => {
  await prisma.$disconnect()
  const fs = await import('fs')
  for (const f of ['./prisma/test.db', './prisma/test.db-wal', './prisma/test.db-shm']) {
    try { fs.unlinkSync(f) } catch { /* arquivo pode não existir */ }
  }
})

// ─── Fluxo 1 — Emissão de PetPass ────────────────────────────────────────────

describe('Fluxo 1 — Emissão de PetPass', () => {
  it('POST /api/pets com dados válidos → 201 com id', async () => {
    const req = jsonPost('http://localhost/api/pets', {
      nome: 'Fido Integração',
      data_nascimento: subDays(new Date(), 365).toISOString(),
      tipo_especie: 'Cao',
      microchip: 'TEST-INT-001',
      responsavel_id: 'resp-001',
    })
    const res = await postPets(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body).toHaveProperty('id')
    expect(body.microchip).toBe('TEST-INT-001')
  })

  it('POST /api/pagamentos → status approved', async () => {
    const req = jsonPost('http://localhost/api/pagamentos', { responsavel_id: 'resp-001' })
    const res = await postPagamentos(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.status).toBe('approved')
    expect(body).toHaveProperty('id')
  })

  it('emite PetPass Apto para Rex (vacina ≥ 21d, destino BR)', async () => {
    // Rex (pet-001) tem vacina há PERIODO_CARENCIA_BRASIL_DIAS + 9 = 30d → cumpre I1
    const pagRes = await postPagamentos(jsonPost('http://localhost/api/pagamentos', { responsavel_id: 'resp-001' }))
    const pag = await pagRes.json()

    const req = jsonPost('http://localhost/api/pets/pet-001/petpass', {
      destino_codigo: 'BR',
      pagamento_id: pag.id,
    })
    const res = await postPetPass(req, makeCtx('pet-001'))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.status_compliance).toBe('Apto')
    expect(body.hash_polygon).toBeTruthy()
  })

  it('emite PetPass Inapto para Luna (vacina < 21d, destino BR)', async () => {
    // Luna (pet-002) tem vacina há PERIODO_CARENCIA_BRASIL_DIAS - 11 = 10d → não cumpre I1
    const pagRes = await postPagamentos(jsonPost('http://localhost/api/pagamentos', { responsavel_id: 'resp-001' }))
    const pag = await pagRes.json()

    const req = jsonPost('http://localhost/api/pets/pet-002/petpass', {
      destino_codigo: 'BR',
      pagamento_id: pag.id,
    })
    const res = await postPetPass(req, makeCtx('pet-002'))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.status_compliance).toBe('Inapto')
    expect(body.motivo).toMatch(/Carência de vacina/)
  })
})

// ─── Fluxo 2 — Alertas proativos ─────────────────────────────────────────────

describe('Fluxo 2 — Alertas proativos', () => {
  let petAlertaId: string

  beforeAll(async () => {
    // Cria pet específico para o cenário de alerta D-3
    const petRes = await postPets(
      jsonPost('http://localhost/api/pets', {
        nome: 'Alerta Test',
        data_nascimento: subDays(new Date(), 730).toISOString(),
        tipo_especie: 'Gato',
        microchip: 'ALERT-INT-001',
        responsavel_id: 'resp-001',
      }),
    )
    const pet = await petRes.json()
    petAlertaId = pet.id

    // Para differenceInDays(proxima, hoje) = 3 de forma determinística:
    // proxima deve ser startOfDay(amanhã) + 3 dias.
    // Prova: differenceInDays usa "last full day" check; com proxima = startOfDay(tomorrow)+k, result = k.
    // data_aplicacao = proxima - INTERVALO = startOfDay(tomorrow) + 3d - 30d = startOfDay(tomorrow) - 27d
    const dataAplicacao = subDays(
      startOfDay(addDays(new Date(), 1)),
      INTERVALO_DOSE_DIAS.Antipulga - 3, // = 27
    ).toISOString()

    await postRegistros(
      jsonPost(`http://localhost/api/pets/${petAlertaId}/registros-sanitarios`, {
        tipo: 'Antipulga',
        veterinario_id: 'vet-001',
        data_aplicacao: dataAplicacao,
      }),
      makeCtx(petAlertaId),
    )
  })

  it('GET /api/pets/:id/alertas com dose vencendo em 3 dias → dias_restantes: 3', async () => {
    const req = new NextRequest(`http://localhost/api/pets/${petAlertaId}/alertas`)
    const res = await getAlertas(req, makeCtx(petAlertaId))
    expect(res.status).toBe(200)
    const { alertas } = await res.json()
    const alerta = (alertas as Array<{ tipo: string; dias_restantes: number; janela: string }>)
      .find((a) => a.tipo === 'Antipulga')
    expect(alerta).toBeDefined()
    expect(alerta!.dias_restantes).toBe(3)
    expect(alerta!.janela).toBe('D-3')
  })

  it('GET /api/pets/:id/cronograma → retorna array de doses com dias_restantes numérico', async () => {
    const req = new NextRequest(`http://localhost/api/pets/${petAlertaId}/cronograma`)
    const res = await getCronograma(req, makeCtx(petAlertaId))
    expect(res.status).toBe(200)
    const { doses } = await res.json()
    expect(Array.isArray(doses)).toBe(true)
    const dose = (doses as Array<{ tipo: string; dias_restantes: number }>)
      .find((d) => d.tipo === 'Antipulga')
    expect(dose).toBeDefined()
    expect(typeof dose!.dias_restantes).toBe('number')
  })
})

// ─── Fluxo 3 — Check-in ───────────────────────────────────────────────────────

describe('Fluxo 3 — Check-in', () => {
  it('microchip de Rex (Apto JP) + destino JP → liberado: true', async () => {
    // pass-001: Rex / JP / Apto / expira em 90 dias — cumpre I1 + I3
    const req = jsonPost('http://localhost/api/checkin', {
      microchip: 'BR001',
      destino_codigo: 'JP',
    })
    const res = await postCheckin(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.liberado).toBe(true)
    expect(body.pet.nome).toBe('Rex')
  })

  it('microchip de Luna (sem PetPass Apto) + destino BR → liberado: false com motivo', async () => {
    // pass-002: Luna / BR / Inapto — localizarPetPassAtivo retorna null
    const req = jsonPost('http://localhost/api/checkin', {
      microchip: 'BR002',
      destino_codigo: 'BR',
    })
    const res = await postCheckin(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.liberado).toBe(false)
    expect(typeof body.motivo).toBe('string')
  })

  it('microchip inexistente → 404', async () => {
    const req = jsonPost('http://localhost/api/checkin', {
      microchip: 'INEXISTENTE-9999',
      destino_codigo: 'BR',
    })
    const res = await postCheckin(req)
    expect(res.status).toBe(404)
  })
})
