# 🐾 iPet — Smart Pet Pass

> **Compliance as a Service (CaaS)** para embarque aéreo de animais de estimação.  
> Motor de validação sanitária que reduz o check-in de **20 minutos para 30 segundos**.

MVP acadêmico — FIAP · Engenharia de Software 2.0 (AI-Driven Development)

---

## Problema

Regras sanitárias variáveis por país resultam em erros humanos, multas de até **€5.000 por animal** e deportações traumáticas. O Smart Pet Pass automatiza a verificação dessas regras no momento do embarque.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript 5 |
| Backend | API Routes (`/app/api/`) — sem servidor separado |
| Banco de dados | SQLite via Prisma ORM 5 |
| Estilização | Tailwind CSS 3 |
| Validação | Zod |
| Datas | date-fns |
| Integrações | Mocks locais (Polygon, FCM, Mercado Pago) |

---

## Inicialização

```bash
npm install
npx prisma migrate dev
npm run seed
npm run dev
```

Acesse em **http://localhost:3000**

### Outros comandos

```bash
npm run typecheck      # tsc --noEmit
npm run build          # build de produção
npm run seed           # re-popula o banco (idempotente)
npx prisma studio      # interface visual do banco
npx prisma migrate reset --force  # apaga e recria o banco do zero
```

---

## Arquitetura

```
Browser (Next.js Pages)
        │
        ▼
Next.js API Routes (/app/api/*)
        │
        ▼
Prisma Client
        │
        ▼
SQLite (prisma/dev.db)
        │
        ▼
Mocks Locais (Polygon, FCM, Mercado Pago)
```

Decisões arquiteturais completas em [`.ai/architecture.md`](.ai/architecture.md).

---

## Bounded Contexts (DDD)

| Bounded Context | Tipo | Aggregate Root |
|---|---|---|
| PET Pass | Core | PetPass |
| Gestão de Saúde | Core | — |
| Cadastro de Pets | Supporting | Pet |
| Veterinários | Supporting | Veterinario |
| Cias. Aéreas | Supporting | CiaAerea |
| Pagamentos | Generic | Pagamento |

### Invariantes críticas

| ID | Regra |
|---|---|
| **I1** | Vacina antirrábica com carência mínima de **21 dias** (todos os destinos) |
| **I2** | Sorologia obrigatória com carência de **90 dias** (União Europeia) |
| **I3** | Sorologia obrigatória com carência de **180 dias** (Japão) |
| **I4** | PetPass emitido como **Apto** é imutável — nunca pode ser alterado |

---

## Fluxos Principais

### 1 — Cadastro de Pet e Emissão do Smart Pet Pass
`/pets` → seleciona pet → `/pets/[id]` → escolhe destino → paga → emite → `/passaporte/[id]`

### 2 — Gestão de Cronograma de Saúde com Alertas Proativos (US001)
`/pets/[id]` → tabela "Histórico Sanitário" + seção "Próximas Doses"  
Alertas D-7/D-3/D-1 calculados on-demand em `GET /api/pets/[id]/alertas`

### 3 — Check-in Aéreo com Validação de Compliance
`/checkin` → informa microchip + destino → retorna **Embarque liberado** ou motivo de bloqueio

---

## API Routes

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/pets` | Lista pets; `?responsavel_id=` opcional |
| POST | `/api/pets` | Cria pet |
| GET | `/api/pets/[id]` | Pet + registros + último PetPass |
| GET | `/api/pets/[id]/registros-sanitarios` | Histórico sanitário |
| POST | `/api/pets/[id]/registros-sanitarios` | Registra procedimento |
| GET | `/api/pets/[id]/cronograma` | Próxima dose por tipo |
| GET | `/api/pets/[id]/alertas` | Alertas D-7/D-3/D-1 |
| POST | `/api/pets/[id]/petpass` | Emite Smart Pet Pass |
| GET | `/api/petpass/[id]` | Retorna PetPass com pet |
| POST | `/api/petpass/[id]/compliance` | Reavalia compliance |
| POST | `/api/checkin` | Valida embarque por microchip |
| GET | `/api/destinos/[codigo]` | Retorna RegraDestino |
| POST | `/api/pagamentos` | Cria pagamento (mock Mercado Pago) |

---

## Dados do Seed

### Destinos e Regras Sanitárias

| Código | Carência Vacina | Sorologia | Carência Sorologia |
|---|---|---|---|
| `BR` | 21 dias | Não | — |
| `UE` | 21 dias | **Sim** | 90 dias |
| `JP` | 21 dias | **Sim** | 180 dias |

### Responsáveis

| ID | Nome | Email |
|---|---|---|
| `resp-001` | Maria Silva | maria.silva@example.com |
| `resp-002` | João Santos | joao.santos@example.com |

### Veterinários

| ID | Nome | CRMV |
|---|---|---|
| `vet-001` | Dra. Ana Lima | CRMV-SP-12345 |
| `vet-002` | Dr. Pedro Costa | CRMV-SP-67890 |

### Pets

| ID | Nome | Espécie | Microchip | Responsável |
|---|---|---|---|---|
| `pet-001` | Rex | Cão | `BR001` | Maria |
| `pet-002` | Luna | Gato | `BR002` | Maria |
| `pet-003` | Thor | Cão | `BR003` | João |

### Registros Sanitários

| ID | Pet | Tipo | Aplicado há | Situação |
|---|---|---|---|---|
| `reg-001` | Rex | Vacina | 30 dias | ✅ Cumpre I1 (≥ 21d) |
| `reg-002` | Rex | Sorologia | 200 dias | ✅ Cumpre I2 (≥ 90d) e I3 (≥ 180d) |
| `reg-003` | Luna | Vacina | 10 dias | ❌ Não cumpre I1 (< 21d) |
| `reg-004` | Thor | Vacina | 25 dias | ✅ Cumpre I1 (≥ 21d) |
| `reg-005` | Thor | Sorologia | 95 dias | ✅ Cumpre I2 (≥ 90d) / ❌ Não cumpre I3 (< 180d) |

### PetPasses pré-emitidos

| ID | Pet | Destino | Status |
|---|---|---|---|
| `pass-001` | Rex | JP | **Apto** · hash `hash-polygon-rex-001` |
| `pass-002` | Luna | BR | **Inapto** · "Carência de vacina não cumprida" |

---

## Guia de Testes

### Rex — `pet-001` · Cão · Microchip `BR001`

| # | Teste | Ação | Resultado Esperado |
|---|---|---|---|
| 1 | Ver ficha | Abrir `/pets/pet-001` | Dados + 2 registros (Vacina 30d, Sorologia 200d) |
| 2 | Cronograma | `GET /api/pets/pet-001/cronograma` | Vacina: ~335 dias; Sorologia: ~165 dias |
| 3 | Alertas | `GET /api/pets/pet-001/alertas` | Lista vazia (nenhuma dose vence em 7 dias) |
| 4 | Emitir → BR | Destino BR na UI | **Apto** (vacina 30d ≥ 21d, sorologia não exigida) |
| 5 | Emitir → UE | Destino UE | **Apto** (sorologia 200d ≥ 90d — I2 ✅) |
| 6 | Emitir → JP | Destino JP | **Apto** (sorologia 200d ≥ 180d — I3 ✅) |
| 7 | Check-in JP | Microchip `BR001`, destino JP em `/checkin` | **Embarque liberado** (`pass-001` Apto do seed) |
| 8 | **I4 Imutabilidade** | `POST /api/petpass/pass-001/compliance` | Retorna `imutavel: true`, hash `hash-polygon-rex-001` intacto |

---

### Luna — `pet-002` · Gato · Microchip `BR002`

| # | Teste | Ação | Resultado Esperado |
|---|---|---|---|
| 1 | Ver ficha | Abrir `/pets/pet-002` | 1 registro (Vacina 10d atrás) |
| 2 | Emitir → BR | Destino BR | **Inapto** — `Carência de vacina não cumprida (10/21 dias)` |
| 3 | Emitir → UE | Destino UE | **Inapto** — falha em I1 antes de verificar I2 |
| 4 | Emitir → JP | Destino JP | **Inapto** — falha em I1 |
| 5 | Check-in BR | Microchip `BR002`, destino BR | **Não liberado** — nenhum PetPass Apto válido |
| 6 | Data de liberação | Abrir `/passaporte/pass-002` | `data_liberacao` = data da vacina + 21 dias |
| 7 | Reavaliar | Botão "Reavaliar" em `/passaporte/pass-002` | Continua **Inapto** (vacina ainda < 21d) |

---

### Thor — `pet-003` · Cão · Microchip `BR003`

| # | Teste | Ação | Resultado Esperado |
|---|---|---|---|
| 1 | Ver ficha | Abrir `/pets/pet-003` | 2 registros (Vacina 25d, Sorologia 95d) |
| 2 | Emitir → BR | Destino BR | **Apto** (vacina 25d ≥ 21d, sem sorologia exigida) |
| 3 | Emitir → UE | Destino UE | **Apto** (sorologia 95d ≥ 90d — I2 ✅) |
| 4 | Emitir → JP | Destino JP | **Inapto** — `Carência de sorologia não cumprida (95/180 dias)` |
| 5 | Check-in UE | Microchip `BR003`, destino UE | **Liberado** (após emitir UE acima) |
| 6 | Check-in JP | Microchip `BR003`, destino JP | **Não liberado** |

---

### Pets Sugeridos para Cadastro Manual

Cada um exercita uma borda de invariante diferente.

| Nome | Espécie | Microchip | Responsável | Registros a criar | Propósito |
|---|---|---|---|---|---|
| **Coco** | Gato | `BR004` | Maria (resp-001) | Nenhum | Emissão → "Nenhuma vacina registrada" |
| **Bella** | Cão | `BR005` | João (resp-002) | Vacina **22 dias** atrás | BR → **Apto** (borda mínima I1: 22 ≥ 21) |
| **Max** | Cão | `BR006` | Maria (resp-001) | Vacina **20 dias** atrás | BR → **Inapto** (borda: 20 < 21) |
| **Nina** | Gato | `BR007` | João (resp-002) | Vacina 30d + Sorologia **91 dias** atrás | UE → **Apto** (borda I2: 91 ≥ 90) |
| **Toby** | Cão | `BR008` | Maria (resp-001) | Vacina 30d + Sorologia **89 dias** atrás | UE → **Inapto** (borda I2: 89 < 90) |
| **Mia** | Gato | `BR009` | João (resp-002) | Vacina 30d + Sorologia **181 dias** atrás | JP → **Apto** (borda I3: 181 ≥ 180) |
| **Bob** | Cão | `BR010` | Maria (resp-001) | Vacina 30d + Sorologia **179 dias** atrás | JP → **Inapto** (borda I3: 179 < 180) |

---

### Testes de Alerta Proativo (US001)

Para ativar os alertas D-7/D-3/D-1, registre um procedimento com data calculada para vencer em breve.

**Exemplo — Antipulga vencendo em 5 dias:**

```bash
# Data = hoje - 25 dias (intervalo da Antipulga = 30d → próxima dose em 5 dias)
curl -X POST http://localhost:3000/api/pets/pet-002/registros-sanitarios \
  -H 'Content-Type: application/json' \
  -d '{
    "tipo": "Antipulga",
    "veterinario_id": "vet-001",
    "data_aplicacao": "YYYY-MM-DD"   # substitua pela data de 25 dias atrás
  }'

# Verificar alerta
curl http://localhost:3000/api/pets/pet-002/alertas
# Esperado: { "alertas": [{ "tipo": "Antipulga", "janela": "D-7", "dias_restantes": 5 }] }
```

O log do servidor exibirá `[FCM] Alerta: Novo registro de Antipulga para o pet Luna (pet-002).`

---

### Testes de Erro e Validação

| # | Teste | Como fazer | Esperado |
|---|---|---|---|
| 1 | Microchip duplicado | Cadastrar 2 pets com `BR001` | HTTP 422 "Microchip já cadastrado" |
| 2 | Data futura no registro | `data_aplicacao` = amanhã | HTTP 422 "Data de aplicação não pode ser futura" |
| 3 | Destino inválido | Check-in com `destino_codigo: "XX"` | HTTP 400 (Zod) |
| 4 | Pet inexistente | `GET /api/pets/id-que-nao-existe` | HTTP 404 "Pet não encontrado" |
| 5 | PetPass sem pagamento | POST petpass com `pagamento_id` inválido | HTTP 404 "Pagamento não encontrado" |
| 6 | Microchip ausente no check-in | `microchip: ""` | HTTP 400 (Zod) |
| 7 | Check-in microchip inexistente | `microchip: "ZZZ999"` | HTTP 404 "Microchip não encontrado" |

---

## Estrutura do Projeto

```
.
├── .ai/                          # Bússola de Engenharia
│   ├── business-rules.md         # Glossário, invariantes I1–I4, restrições
│   ├── architecture.md           # ADRs 001–005
│   ├── tech-stack.md             # Stack aprovada e proibida
│   └── standards.md              # Convenções e estrutura de diretórios
├── prisma/
│   ├── schema.prisma             # Schema SQLite
│   └── seed.ts                   # Dados determinísticos
└── src/
    ├── app/
    │   ├── api/                  # 11 API Routes
    │   ├── pets/                 # Listagem e detalhe de pets
    │   ├── passaporte/[id]/      # Visualização do PetPass
    │   └── checkin/              # Check-in aéreo
    ├── lib/
    │   ├── prisma.ts             # Singleton Prisma Client
    │   ├── compliance.ts         # Motor de regras (função pura)
    │   └── mocks/                # Polygon · FCM · Mercado Pago
    └── types/
        └── domain.ts             # Tipos do domínio iPet
```

---

## Eventos de Domínio (log do servidor)

Durante a execução, os seguintes eventos são logados no terminal:

```
[EVENTO] PetPassEmitido      { petpass_id, pet_id, destino }
[EVENTO] ComplianceReprovado { pet_id, destino, motivo }
[FCM]    Alerta: {mensagem}
```
