# Engenharia de Software 2.0: AI-Driven Development<br>03 - Auditoria e refatoração com IA

**FIAP - MBA em Engenharia de Software - 10AOJR**

**Integrantes**

- `367438` - Brunna Cataryne Rosa Webster
- `366865` - Danielle Moreira
- `368605` - Leonardo Braga de Almeida
- `367369` - Victor Hugo dos Santos Telles

<br>

---

<br>

## 1. Sobre Este Relatório

O sistema avaliado é o **iPet / Smart Pet Pass**, um MVP que automatiza a validação de conformidade sanitária de animais de estimação para embarque aéreo, implementando as invariantes I1–I4 como um motor de _Compliance as a Service_ (CaaS).

O código-base foi gerado integralmente na Aula 2 utilizando o modelo **Claude Sonnet 4.6** via Claude Code, a partir de prompts estruturados com contexto de regras de negócio, arquitetura e stack tecnológica.

O objetivo deste ciclo de modernização é tornar o sistema sustentável, seguro e manutenível — eliminando dívidas técnicas introduzidas durante a geração inicial, sem alterar o comportamento observável.

Todo este ciclo de auditoria, refatoração, testes e geração deste relatório foi igualmente conduzido com o modelo **Claude Sonnet 4.6** via Claude Code.

O código refatorado está disponível em: [https://github.com/tellesvh/FIAP-AOJ-EngenhariaDeSoftwareAIDrivenDev-Avaliacao/tree/refactoring](https://github.com/tellesvh/FIAP-AOJ-EngenhariaDeSoftwareAIDrivenDev-Avaliacao/tree/refactoring).

## 2. Metodologia

O ciclo seguiu a cadência **Auditoria → Diagnóstico → Prompts Derivados → Refatoração → Relatório**, conforme os princípios de Arquitetura Evolucionária.

O **Prompt 1** instruiu o agente a ler integralmente os quatro documentos `.ai/` (regras de negócio, arquitetura, stack e padrões) e a escanear recursivamente todos os arquivos de `src/` e `prisma/` **antes de qualquer julgamento** — garantindo que o diagnóstico fosse derivado do código real, não de suposições.

Somente após a leitura completa do relatório de diagnóstico foram elaborados os demais prompts de intervenção.

O **Prompt 2** atacou os _code smells_ estruturais: decompôs os três handlers monolíticos em funções nomeadas de responsabilidade única (CS-001 a CS-003) e corrigiu os 13 blocos `catch` silenciados em todos os route handlers do projeto (CS-004).

O **Prompt 3** realizou correções pontuais de padrão e qualidade: adicionou validação Zod para query params (VP-001), adotou o singleton do Prisma no seed (VP-002), substituiu o `responsavel_id` hardcoded pelo valor real do pet (VP-004), exportou as constantes de domínio em SCREAMING_SNAKE_CASE (VP-005), centralizou `formatarData` em um único módulo compartilhado (CS-005) e corrigiu o bug de expiração de PetPass em reavaliações (FQ-007).

O **Prompt 4** completou a cobertura de qualidade: configurou o Vitest, escreveu 9 testes unitários das invariantes I1–I4 (FQ-001), 9 testes de integração dos três fluxos de domínio com banco SQLite isolado (FQ-002) e adicionou a seção de alertas proativos na interface (FQ-004).

O **Prompt 5** (este documento) solicitou a geração do relatório formal de modernização com métricas reais extraídas do ciclo.

Essa sequência reflete o princípio de Arquitetura Evolucionária: cada intervenção foi cirúrgica, rastreável a um ID de diagnóstico, verificada por `tsc --noEmit` e `npm test`, preservando o comportamento observável dos três fluxos de domínio.

O papel do agente Claude Sonnet 4.6 via Claude Code foi o de par programador sênior — capaz de identificar, refatorar e testar em escala — enquanto o time humano manteve a responsabilidade pela estratégia de modernização e pelo entendimento do desenho macro.

Este documento foi gerado pelo agente ao final do ciclo e passou por algumas iterações e ajustes manuais de formatação e escrita para chegar ao estado final de entrega.

## 3. Diagnóstico de Dívida Técnica

### 3.1 Resumo Executivo

A auditoria identificou **19 problemas** distribuídos em três categorias: 6 _Code Smells_ (CS), 6 Violações de Padrão (VP) e 7 Fragilidades de Qualidade (FQ).

O risco mais crítico era a combinação de handlers monolíticos com 13 blocos `catch` silenciados (CS-001 a CS-004): em produção, qualquer exceção nos três fluxos principais seria engolida sem registro, impossibilitando o diagnóstico de falhas.

O segundo risco de maior impacto funcional era o `responsavel_id` hardcoded como `"resp-001"` (VP-004 / FQ-003), que restringia o sistema a funcionar apenas com o usuário do seed — violação direta da regra de negócio RB-CP-02.

A ausência total de testes (FQ-001/FQ-002) tornava impossível garantir que futuras refatorações não introduzissem regressões nas invariantes I1–I4.

A dívida acumulada, embora esperada em código gerado por IA para um MVP, comprometia a manutenibilidade e a confiança no sistema a longo prazo.

### 3.2 Code Smells Identificados

| ID     | Arquivo                                                           | Descrição                                                                                                                                  | Impacto                                  | Técnica Aplicada                                                                    |
| ------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- | ----------------------------------------------------------------------------------- |
| CS-001 | `src/app/api/pets/[id]/petpass/route.ts`                          | Handler POST com 70+ linhas; validação de pagamento, carga de contexto, avaliação de compliance e persistência acopladas em um único bloco | Alto — impossível testar partes isoladas | Extração de 3 funções nomeadas + classe `RouteError`                                |
| CS-002 | `src/app/api/petpass/[id]/compliance/route.ts`                    | Handler POST com 60+ linhas; reavaliação de compliance, atualização de hash Polygon e persistência misturadas                              | Alto                                     | Extração de `carregarDadosParaReavaliacao` e `reavaliarEPersistir`                  |
| CS-003 | `src/app/api/checkin/route.ts`                                    | Handler POST com 50+ linhas; localização de PetPass ativo, carga de registros e reavaliação inline                                         | Médio                                    | Extração de `localizarPetPassAtivo`                                                 |
| CS-004 | 11 route handlers (13 blocos catch)                               | Exceções engolidas silenciosamente; erros de produção irrastreáveis                                                                        | Alto                                     | Adição de `console.error("[ROUTE_ERROR] METHOD /path:", erro)` em todos os 13 catch |
| CS-005 | `src/app/pets/[id]/page.tsx` e `src/app/passaporte/[id]/page.tsx` | Função `formatarData` duplicada com assinaturas inconsistentes: uma aceita `string`, outra `string \| null`                                | Baixo                                    | Centralização em `src/lib/formatadores.ts` com assinatura unificada                 |
| CS-006 | `src/app/pets/[id]/page.tsx`                                      | Magic number `7` em `d.dias_restantes <= 7` sem referência à constante de domínio `JANELA_ALERTA_DIAS`                                     | Baixo                                    | Substituição por `JANELA_ALERTA_DIAS` importado de `@/types/domain`                 |

### 3.3 Violações de Padrões Identificadas

| ID     | Arquivo                                  | ADR/Padrão Violado                                    | Descrição                                                                                                                                                                | Técnica Aplicada                                                                                         |
| ------ | ---------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| VP-001 | `src/app/api/pets/route.ts`              | standards.md — Validação Zod em query params          | GET `/api/pets` não validava `?responsavel_id=` via Zod; parâmetros inválidos chegavam ao Prisma sem sanitização                                                         | Adição de `querySchema` + `safeParse(Object.fromEntries(searchParams))`                                  |
| VP-002 | `prisma/seed.ts`                         | standards.md — Prisma Singleton (`src/lib/prisma.ts`) | `new PrismaClient()` instanciado diretamente no seed, violando o padrão singleton e arriscando conexões duplicadas                                                       | Substituição por `import { prisma } from "../src/lib/prisma"`                                            |
| VP-003 | `src/lib/compliance.ts`                  | standards.md — tipos de retorno explícitos            | Auditoria apontou ausência de tipo em `maisRecentePorTipo` — **falso positivo confirmado**; função já declarava `: RegistroCompliance \| null` na assinatura multi-linha | Sem alteração (falso positivo — nenhuma ação necessária)                                                 |
| VP-004 | `src/app/pets/[id]/page.tsx`             | RB-CP-02 — Pet vinculado a exatamente um Responsavel  | `responsavel_id: "resp-001"` fixo na chamada de pagamento; sistema funcional apenas para o responsável de seed                                                           | Tipagem de `responsavel_id: string` na interface `PetDetalhe` + uso de `pet.responsavel_id`              |
| VP-005 | `src/types/domain.ts` / `prisma/seed.ts` | standards.md — SCREAMING_SNAKE_CASE para constantes   | Valores 21, 90, 180 dias (invariantes I1/I2/I3) espalhados como literais; sem rastreabilidade às regras de negócio                                                       | Exportação de `PERIODO_CARENCIA_BRASIL_DIAS`, `CARENCIA_SOROLOGIA_UE_DIAS`, `CARENCIA_SOROLOGIA_JP_DIAS` |
| VP-006 | `prisma/schema.prisma`                   | ADR 002 / type safety                                 | Campos enum (`tipo_especie`, `status_compliance`, `tipo`) armazenados como `String` sem constraint em nível de banco; SQLite não suporta enums nativos                   | **Débito técnico aceito** — ADR 002 (SQLite para MVP)                                                    |

### 3.4 Fragilidades de Qualidade Identificadas

| ID     | Arquivo                                                          | Descrição                                                                                                                                                 | Técnica Aplicada                                                                                                  |
| ------ | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| FQ-001 | `src/lib/compliance.ts`                                          | Função pura `avaliarCompliance` (motor central do CaaS) sem nenhum teste unitário; regressões em I1–I4 seriam silenciosas                                 | Setup vitest + 9 testes unitários com `hoje` fixo (determinísticos)                                               |
| FQ-002 | (fluxos de domínio)                                              | Ausência de testes de integração dos três fluxos principais: emissão de PetPass, alertas proativos e check-in                                             | 9 testes de integração com banco SQLite isolado (`test.db`), migrado e populado em `beforeAll`                    |
| FQ-003 | `src/app/pets/[id]/page.tsx`                                     | Interface `PetDetalhe` sem campo `responsavel_id: string`; propriedade existia no JSON de resposta da API mas não era tipada no frontend                  | Adição de `responsavel_id: string` à interface (junto com VP-004)                                                 |
| FQ-004 | `src/app/pets/[id]/page.tsx`                                     | Rota `GET /api/pets/[id]/alertas` implementada e funcional (ADR 005) mas nenhuma página a consumia; alertas D-7/D-3/D-1 permaneciam invisíveis ao usuário | Fetch de `/alertas` em `Promise.all` + seção "Alertas Proativos" com destaque visual por janela                   |
| FQ-005 | `src/app/api/pets/route.ts`                                      | `criarPetSchema` sem rejeitar datas de nascimento futuras, violando RB-GS-03 ("Datas futuras de aplicação/coleta são inválidas")                          | `.refine((d) => d <= new Date(), { message: "Data de nascimento não pode ser futura" })`                          |
| FQ-006 | `src/app/pets/[id]/page.tsx`, `src/app/passaporte/[id]/page.tsx` | `formatarData` local declarada como `(iso: string)`, mas campos como `data_liberacao` são `string \| null` no schema                                      | Assinatura centralizada expandida para `(iso: string \| null \| undefined): string`                               |
| FQ-007 | `src/app/api/petpass/[id]/compliance/route.ts`                   | Reavaliação `Inapto → Apto` não atualizava `data_expiracao`; PetPass ficava com status `Apto` mas com data de expiração já passada                        | `data_expiracao` atualizado condicionalmente em `reavaliarEPersistir` (resolvido como efeito colateral de CS-002) |

## 4. Intervenções Realizadas

### 4.1 Decomposição de Handlers Monolíticos e Log de Erros

**Problemas resolvidos:** CS-001, CS-002, CS-003, CS-004  
**Técnica aplicada:** Extração de funções nomeadas (_Single Responsibility Principle_) + classe `RouteError` para propagação de status HTTP sem retornar `NextResponse` de dentro das funções auxiliares

#### **CS-001 a CS-003: decomposição do handler**

- **Antes:**

  ```typescript
  // 📄 src/app/api/pets/[id]/petpass/route.ts  (101 linhas)
  export async function POST(
    req: NextRequest,
    ctx: Contexto,
  ): Promise<NextResponse> {
    try {
      const { id } = await ctx.params;
      const { destino_codigo, pagamento_id } = parsed.data;
      const pagamento = await prisma.pagamento.findUnique({
        where: { id: pagamento_id },
      });
      if (!pagamento) {
        return NextResponse.json(
          { error: "Pagamento não encontrado" },
          { status: 404 },
        );
      }
      if (pagamento.status !== "approved") {
        return NextResponse.json(
          { error: "Pagamento não aprovado" },
          { status: 422 },
        );
      }
      // + carga do pet, regra de destino, registros, avaliarCompliance, mock Polygon e persistência
    } catch (erro) {
      return NextResponse.json(
        { error: "Erro ao emitir Pet Pass" },
        { status: 500 },
      ); // silenciado
    }
  }
  ```

- **Depois:**

  ```typescript
  // 📄 src/lib/route-error.ts  (criado)
  export class RouteError extends Error {
    constructor(
      readonly status: number,
      message: string,
    ) {
      super(message);
      this.name = "RouteError";
    }
  }
  ```

  ```typescript
  // 📄 src/app/api/pets/[id]/petpass/route.ts  (~20 linhas após extração)
  async function validarPagamentoAprovado(pagamentoId: string): Promise<void> {
    const pagamento = await prisma.pagamento.findUnique({
      where: { id: pagamentoId },
    });
    if (!pagamento) throw new RouteError(404, "Pagamento não encontrado");
    if (pagamento.status !== "approved")
      throw new RouteError(422, "Pagamento não aprovado");
  }
  // Handler reduzido a orquestração: validarPagamento → carregarContexto → gravarPetPass → retorno HTTP
  ```

#### **CS-004: log de erros nos blocos `catch`**

- **Antes:**

  ```typescript
  // 📄 src/app/api/pets/route.ts — representativo (13 blocos catch idênticos no projeto)
    } catch (erro) {
      return NextResponse.json({ error: "Erro ao listar pets" }, { status: 500 });
    }
  ```

- **Depois:**

  ```typescript
  // 📄 src/app/api/pets/route.ts — console.error adicionado em cada bloco
    } catch (erro) {
      console.error("[ROUTE_ERROR] GET /api/pets:", erro);
      return NextResponse.json({ error: "Erro ao listar pets" }, { status: 500 });
    }
  ```

**Arquivos modificados:**

- `src/lib/route-error.ts` _(criado)_
- `src/app/api/pets/[id]/petpass/route.ts` (CS-001)
- `src/app/api/petpass/[id]/compliance/route.ts` (CS-002)
- `src/app/api/checkin/route.ts` (CS-003)
- `src/app/api/pets/route.ts`, `src/app/api/pets/[id]/route.ts`, `src/app/api/pets/[id]/registros-sanitarios/route.ts`, `src/app/api/pets/[id]/alertas/route.ts`, `src/app/api/pets/[id]/cronograma/route.ts`, `src/app/api/petpass/[id]/route.ts`, `src/app/api/destinos/[codigo]/route.ts`, `src/app/api/pagamentos/route.ts` (CS-004)

---

### 4.2 Correções de Padrão, Constantes de Domínio e Bug de Integridade

**Problemas resolvidos:** VP-001, VP-002, VP-003 _(falso positivo — sem alteração)_, VP-004, VP-005, CS-005, CS-006, FQ-003, FQ-005, FQ-006, FQ-007

**Técnica aplicada por subgrupo:**

- **VP-001 / FQ-005:** `querySchema` Zod + `.refine()` para data futura em `criarPetSchema`
- **VP-002:** Substituição de `new PrismaClient()` por `import { prisma }` do singleton
- **VP-004 / FQ-003:** Tipagem correta da interface + substituição do literal hardcoded
- **VP-005:** Exportação de constantes SCREAMING_SNAKE_CASE; seed reescrito com expressões aritméticas comentadas
- **CS-005 / FQ-006:** Criação de `formatadores.ts` centralizado; remoção das duplicatas locais
- **FQ-007:** `data_expiracao` atualizado condicionalmente em `reavaliarEPersistir`

#### **VP-004 / FQ-003: `responsavel_id` hardcoded**

- **Antes:**

  ```typescript
  // 📄 src/app/pets/[id]/page.tsx
  const respPag = await fetch("/api/pagamentos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ responsavel_id: "resp-001" }), // único usuário possível
  });
  ```

- **Depois:**

  ```typescript
  // 📄 src/app/pets/[id]/page.tsx
  // interface PetDetalhe agora inclui o campo real:
  interface PetDetalhe {
    /* ... */ responsavel_id: string; /* ... */
  }
  // Chamada corrigida:
  const respPag = await fetch("/api/pagamentos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ responsavel_id: pet.responsavel_id }),
  });
  ```

#### **VP-005: constantes de domínio ausentes**

- **Antes:**

  ```typescript
  // 📄 prisma/seed.ts
  subDays(hoje, 30),   // vacina Rex — sem rastreabilidade à invariante I1
  subDays(hoje, 200),  // sorologia Rex — sem rastreabilidade à invariante I3
  // RegraDestino: { periodo_carencia_dias: 21, carencia_sorologia_dias: 90 }
  ```

- **Depois:**

  ```typescript
  // 📄 src/types/domain.ts
  export const PERIODO_CARENCIA_BRASIL_DIAS = 21; // I1
  export const CARENCIA_SOROLOGIA_UE_DIAS   = 90; // I2
  export const CARENCIA_SOROLOGIA_JP_DIAS   = 180; // I3

  // 📄 prisma/seed.ts
  subDays(hoje, PERIODO_CARENCIA_BRASIL_DIAS + 9),  // 30d — cumpre I1
  ```

**Arquivos criados/modificados:**

- `src/types/domain.ts` (VP-005: constantes de carência)
- `src/lib/formatadores.ts` _(criado — CS-005/FQ-006)_
- `prisma/seed.ts` (VP-002: singleton; VP-005: magic numbers substituídos)
- `src/app/api/pets/route.ts` (VP-001: querySchema; FQ-005: refine data futura)
- `src/app/pets/[id]/page.tsx` (VP-004/FQ-003: responsavel_id; CS-005/006/FQ-006: formatarData/JANELA_ALERTA_DIAS)
- `src/app/passaporte/[id]/page.tsx` (CS-005/FQ-006: formatarData centralizada)
- `src/app/api/petpass/[id]/compliance/route.ts` (FQ-007: data_expiracao condicional)

---

### 4.3 Testes de Compliance e Integração; Alertas na UI

**Problemas resolvidos:** FQ-001, FQ-002, FQ-004  
**Técnica aplicada:** _Test-Snapshotting_ + Paridade Funcional — testes que documentam o comportamento esperado das invariantes e dos fluxos de domínio, tornando regressões detectáveis automaticamente

#### **Snippet representativo — teste unitário I2 (sorologia UE, Apto)**

```typescript
// 📄 src/lib/compliance.test.ts
it(`vacina ok + sorologia há ${CARENCIA_SOROLOGIA_UE_DIAS + 5}d + destino UE → Apto`, () => {
  // 95 dias — cumpre I2 (≥ 90d)
  const r = avaliarCompliance(
    [vacinaOk, reg("Sorologia", CARENCIA_SOROLOGIA_UE_DIAS + 5)],
    REGRA_UE,
    HOJE,
  );
  expect(r.status).toBe("Apto");
});
```

**Cobertura alcançada em `compliance.ts`:**

| Métrica    | Resultado                                                                                 |
| ---------- | ----------------------------------------------------------------------------------------- |
| Statements | **94,73 %**                                                                               |
| Branches   | **93,33 %**                                                                               |
| Functions  | 75 % _(sort comparator não exercitado — sem dois registros do mesmo tipo no mesmo teste)_ |
| Lines      | **94,73 %**                                                                               |

**Total de testes:** 9 unitários (invariantes I1–I4) + 9 de integração (3 fluxos) = **18 testes — 18 passando**

**Seção de alertas na UI (FQ-004):**
Adicionado fetch de `/api/pets/[id]/alertas` ao `Promise.all` de `carregar()`, estado `Alerta[]` e seção "Alertas Proativos" com borda lateral colorida em Tailwind — vermelho (`border-red-500`) para D-1, amarelo (`border-yellow-500`) para D-3 e azul (`border-blue-500`) para D-7.

**Arquivos criados/modificados:**

- `vitest.config.ts` _(criado — config com alias `@`, setupFiles, coverage v8)_
- `src/test/setup.ts` _(criado — `DATABASE_URL=file:./prisma/test.db` antes de qualquer import)_
- `package.json` _(scripts: `test`, `test:watch`, `test:coverage`)_
- `src/lib/compliance.test.ts` _(criado — 9 testes unitários puros, sem Prisma)_
- `src/app/api/integration.test.ts` _(criado — 9 testes de integração com SQLite isolado)_
- `src/app/pets/[id]/page.tsx` (FQ-004: fetch alertas + seção UI)

## 5. Resultados

### 5.1 Métricas de Qualidade

| Métrica                                                | Antes | Depois                 |
| ------------------------------------------------------ | ----- | ---------------------- |
| Handlers com mais de 40 linhas                         | 3     | **0**                  |
| Handlers com `catch` silenciado                        | 13    | **0**                  |
| Rotas sem validação Zod em params                      | 1     | **0**                  |
| Bug de `responsavel_id` hardcoded                      | 1     | **0**                  |
| Constantes de domínio ausentes (standards.md)          | 4     | **0**                  |
| Instâncias diretas do `PrismaClient` fora do singleton | 1     | **0**                  |
| Magic numbers em `seed.ts`                             | 8     | **0**                  |
| Funções `formatarData` duplicadas entre componentes    | 2     | **0** (1 centralizada) |
| Testes unitários (`avaliarCompliance` I1–I4)           | 0     | **9**                  |
| Testes de integração (3 fluxos de domínio)             | 0     | **9**                  |
| Cobertura de `compliance.ts` (statements)              | 0 %   | **94,73 %**            |
| Cobertura de `compliance.ts` (branches)                | 0 %   | **93,33 %**            |
| Funcionalidade de alertas proativos visível na UI      | Não   | **Sim**                |

### 5.2 Análise Qualitativa

Este ciclo ilustra o _Paradoxo da Modernização_: o agente Claude Sonnet 4.6 via Claude Code foi capaz de identificar, categorizar e corrigir 18 dos 19 problemas diagnosticados — incluindo bugs latentes (VP-004, FQ-007) e lacunas de testabilidade (FQ-001/FQ-002) — de forma rápida e rastreável.

Contudo, a decisão sobre **o que corrigir, o que aceitar como débito e a sequência de intervenções** permaneceu inteiramente humana. O item VP-006 (ausência de _constraints_ de enum no SQLite) foi deliberadamente registrado como débito técnico aceito e não corrigido, pois a limitação é intrínseca ao ADR 002 (SQLite para MVP) e a correção exigiria migração para PostgreSQL — mudança arquitetural fora do escopo desta etapa.

Esse exemplo evidencia que o agente refatora arquivos com eficiência, mas cabe ao time humano manter o entendimento do desenho macro, os _trade-offs_ de ADRs e a visão sobre quais são as verdadeiras _fitness functions_ do sistema.

## 6. Prompts Utilizados

### Prompt 1 — Auditoria Técnica Formal

```text
# Papel

Aja como um Principal Software Architect com especialização em modernização de
sistemas TypeScript/Node.js. Você está realizando uma auditoria técnica formal
no projeto iPet / Smart Pet Pass, uma plataforma Next.js 15 com API Routes,
Prisma ORM e SQLite.

# Contexto Obrigatório

Antes de qualquer análise, leia na íntegra:
- `.ai/business-rules.md`   → regras de negócio e invariantes I1–I4
- `.ai/architecture.md`     → ADRs 001–005 que governam o MVP
- `.ai/tech-stack.md`       → stack aprovada e bibliotecas permitidas
- `.ai/standards.md`        → convenções de nomenclatura, estrutura e padrões

Esses arquivos são a "bússola de engenharia" do projeto. Toda dívida técnica
identificada deve ser avaliada contra eles, não contra padrões genéricos externos.

# Tarefa

Escaneie recursivamente todos os arquivos em `src/` e `prisma/`.
Para cada problema encontrado, classifique-o em uma das três categorias abaixo
e documente conforme o formato especificado.

## Categoria 1 — Code Smells
Problemas de legibilidade, coesão e tamanho que comprometem a manutenibilidade.
Exemplos a procurar no contexto Next.js/TypeScript:
- Route handler com mais de 40 linhas executando lógica de negócio inline
- Bloco try/catch duplicado em múltiplas rotas com tratamento de erro inconsistente
- Tipo `any` explícito ou implícito em funções de domínio
- Lógica de formatação de resposta misturada com lógica de consulta ao banco
- Variáveis com nomes genéricos (`data`, `result`, `item`) em contexto de domínio

## Categoria 2 — Violações de Padrões
Desvios diretos dos ADRs e convenções definidas em `.ai/`.
Exemplos a procurar:
- Consulta Prisma realizada diretamente dentro de um componente de página (viola ADR 001)
- Instância do PrismaClient criada fora de `src/lib/prisma.ts` (viola ADR 002)
- Lógica de compliance (invariantes I1–I4) duplicada fora de `src/lib/compliance.ts`
- Validação Zod ausente em API Route que recebe body (viola standards.md)
- Importação de `prisma` diretamente em `src/lib/compliance.ts` (viola pureza da função)
- Imports não utilizados, funções nunca chamadas, código morto

## Categoria 3 — Fragilidades de Qualidade
Ausência de salvaguardas que tornam o sistema frágil para evolução.
Exemplos a procurar:
- Ausência de testes para `avaliarCompliance` (função que implementa I1–I4)
- Ausência de testes dos três fluxos principais
- Valores mágicos hardcoded (ex: número de dias sem constante nomeada)
- Mensagens de erro não padronizadas entre rotas
- Falta de tipagem explícita de retorno nos handlers

# Formato de Saída

Apresente o diagnóstico diretamente na sessão (não crie arquivos).
Use a seguinte estrutura:

### Resumo Executivo
3–5 linhas sobre o estado geral e volume de problemas por categoria.

### Categoria 1 — Code Smells
Tabela com colunas: ID (CS-001…) | Arquivo | Linha(s) | Descrição | Impacto | Técnica Sugerida

### Categoria 2 — Violações de Padrões
Tabela com colunas: ID (VP-001…) | Arquivo | ADR/Padrão Violado | Descrição | Técnica Sugerida

### Categoria 3 — Fragilidades de Qualidade
Tabela com colunas: ID (FQ-001…) | Arquivo | Descrição | Técnica Sugerida

### Mapa de Prioridades
Tabela ordenada por impacto (Alto / Médio / Baixo) listando todos os IDs encontrados.

# Restrições

- Não altere nenhum arquivo. Apenas leia e analise.
- Não invente problemas. Toda menção de linha deve ser rastreável ao arquivo real.
- Não sugira tecnologias fora da stack definida em `.ai/tech-stack.md`.
- Preserve as invariantes I1–I4 em qualquer sugestão.
- Finalize com: "Auditoria concluída. Nenhum arquivo foi modificado."
```

### Prompt 2 — Decomposição de Handlers e Log de Erros (CS-001 a CS-004)

````text
# Papel

Aja como um desenvolvedor sênior do projeto iPet executando uma sessão de
refatoração estrutural. Você tem o relatório de auditoria em mãos e vai
resolver os itens CS-001, CS-002, CS-003 e CS-004.

# Contexto Obrigatório

Leia antes de qualquer modificação:
- `.ai/architecture.md` → ADR 001 (API Routes como único backend)
- `.ai/standards.md`    → limite de tamanho de handlers, padrões de erro
- `.ai/business-rules.md` → invariantes I1–I4 (comportamento não pode mudar)
- `src/lib/compliance.ts` → implementação atual de `avaliarCompliance`

# Tarefa

## Intervenção 1 — CS-001: Decompor `POST /api/pets/[id]/petpass/route.ts`

O handler atual tem 81 linhas combinando: validação de pagamento, carga de
registros, chamada a `avaliarCompliance`, mock Polygon, `prisma.petPass.create`
e `prisma.pagamento.update`.

Extraia as seguintes funções nomeadas no mesmo arquivo, acima do handler:

1. `async function validarPagamentoAprovado(pagamentoId: string): Promise<void>`
   — busca o pagamento no banco e lança erro descritivo se não encontrado ou
   se `status !== 'approved'`.

2. `async function carregarContextoCompliance(petId: string, destinoCodigo: string)`
   — busca o pet, a RegraDestino e os RegistroSanitario; retorna um objeto
   tipado `{ pet, regra, registros }`. Lança erro 404 se pet ou regra não existir.

3. `async function gravarPetPassEVincularPagamento(dados: { petId: string, destinoCodigo: string, resultado: ComplianceResult, pagamentoId: string }): Promise<PetPass>`
   — executa `prisma.petPass.create` e, se Apto, `registrarNoPolygon` e
   `prisma.pagamento.update`. Retorna o PetPass criado.

O handler resultante deve ter no máximo 20 linhas: parse do body com Zod,
chamada às três funções acima, log do evento de domínio e retorno HTTP.

## Intervenção 2 — CS-002: Decompor `POST /api/petpass/[id]/compliance/route.ts`

O handler tem 64 linhas. Extraia no mesmo arquivo:

1. `async function carregarDadosParaReavaliacao(petPassId: string)`
   — busca o PetPass com Pet incluído, a RegraDestino e os RegistroSanitario.
   Lança erro 404 se qualquer um não existir.

2. `async function reavaliarEPersistir(petPassId: string, resultado: ComplianceResult): Promise<PetPass>`
   — executa `prisma.petPass.update`. Se o novo status for `"Apto"`, inclui
   `data_expiracao: addDays(new Date(), 90)` e, se não houver `hash_polygon`,
   chama `registrarNoPolygon` e persiste o hash.
   Isso também resolve FQ-007: reavaliação Inapto→Apto agora estende a validade.

O handler resultante deve ter no máximo 20 linhas.

## Intervenção 3 — CS-003: Decompor `POST /api/checkin/route.ts`

O handler tem 67 linhas. Extraia no mesmo arquivo:

1. `async function localizarPetPassAtivo(petId: string, hoje: Date)`
   — busca o PetPass mais recente do pet com `status_compliance: "Apto"` e
   `data_expiracao: { gt: hoje }`. Retorna `PetPass | null`.

O handler resultante deve ter no máximo 20 linhas: parse do body com Zod,
lookup do pet pelo microchip, chamada a `localizarPetPassAtivo`,
carga da regra + registros, chamada a `avaliarCompliance` e retorno HTTP.

## Intervenção 4 — CS-004: Corrigir erros silenciados em todos os handlers

Em todos os arquivos `src/app/api/**/route.ts`, localize os blocos `catch`.
Em cada um, adicione imediatamente antes do `return` de erro 500:

```typescript
console.error(`[ROUTE_ERROR] ${context}:`, erro)
```

onde `context` é uma string literal que identifica o handler
(ex: `"POST /api/checkin"`, `"GET /api/pets/[id]"`).

Não altere o status HTTP de retorno — apenas adicione o log.

# Restrições

- Não altere o schema Prisma nem crie migrations.
- Não instale bibliotecas fora de `.ai/tech-stack.md`.
- As funções extraídas devem ter tipos de retorno explícitos (sem `any`).
- O comportamento observável de cada rota não pode mudar — apenas a organização.
- O projeto deve continuar executável com `npm run dev` após todas as intervenções.
- Execute `tsc --noEmit` ao final e confirme ausência de erros de tipo.
- Ao final, liste: (a) arquivos modificados, (b) nome de cada função extraída,
  (c) contagem de linhas antes/depois em cada handler.
- Sugira a mensagem de commit no formato convencional.
````

### Prompt 3 — Correções Pontuais de Padrão e Constantes (VP-001 a FQ-006)

````text
# Papel

Aja como um desenvolvedor sênior do projeto iPet executando uma sessão de
correções pontuais. Você vai resolver os itens VP-001, VP-002, VP-003, VP-004,
VP-005, CS-005, CS-006, FQ-005 e FQ-006.

# Contexto Obrigatório

Leia `src/types/domain.ts` antes da Intervenção 1 — algumas constantes podem já existir. Adicione apenas as que estiverem ausentes.

Leia antes de qualquer modificação:
- `.ai/standards.md`      → convenções de nomenclatura e padrões de código
- `.ai/business-rules.md` → invariantes I1–I4 e RB-CP-02 (vínculo Responsavel–Pet)
- `.ai/tech-stack.md`     → `zod` na lista de bibliotecas permitidas
- `src/types/domain.ts`   → tipos de domínio existentes

# Tarefa

Execute cada intervenção na ordem indicada. Confirme `tsc --noEmit` ao final
de todas.

## Intervenção 1 — VP-005 e FQ-006: Criar constantes de domínio

Em `src/types/domain.ts`, adicione as constantes ausentes que o standards.md
nomeia explicitamente:

```typescript
// Invariantes de carência (I1–I3)
export const PERIODO_CARENCIA_BRASIL_DIAS = 21
export const CARENCIA_SOROLOGIA_UE_DIAS = 90
export const CARENCIA_SOROLOGIA_JP_DIAS = 180

// Validade do PetPass após emissão
export const VALIDADE_PETPASS_DIAS = 90
```

Em `prisma/seed.ts`, substitua os magic numbers nas datas por chamadas usando
essas constantes (ex: `subDays(hoje, PERIODO_CARENCIA_BRASIL_DIAS + 9)` para
representar "vacina aplicada 9 dias após o fim da carência"). Adicione
comentários alinhando cada registro à invariante que ele testa
(ex: `// cumpre I1: ${PERIODO_CARENCIA_BRASIL_DIAS} dias de carência`).

## Intervenção 2 — CS-006: Usar JANELA_ALERTA_DIAS na página de pet

Em `src/app/pets/[id]/page.tsx`, linha 245: substitua o magic number `7` por
`JANELA_ALERTA_DIAS`, importando-o de `@/types/domain`. A constante já existe
no arquivo — apenas o import e o uso estão faltando.

## Intervenção 3 — VP-001: Validar query param em `GET /api/pets`

Em `src/app/api/pets/route.ts`, adicione validação Zod para o query param
`responsavel_id`:

```typescript
const querySchema = z.object({
  responsavel_id: z.string().optional(),
});
```

Use `querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams))`.
Retorne 400 com `{ error: 'Parâmetros inválidos', details: result.error.errors }`
se a validação falhar.

## Intervenção 4 — VP-004 e FQ-003: Corrigir responsavel_id hardcoded

Em `src/app/pets/[id]/page.tsx`:

1. Adicione o campo `responsavel_id: string` à interface `PetDetalhe`
   (ou ao tipo que representa o pet retornado pela API).
2. Certifique-se de que a API `GET /api/pets/[id]` retorna `responsavel_id`
   no payload (se não retornar, ajuste o `select` do Prisma).
3. Na chamada de `POST /api/pagamentos` (ao emitir Pet Pass), substitua
   `responsavel_id: "resp-001"` por `responsavel_id: pet.responsavel_id`.

## Intervenção 5 — FQ-005: Validar data de nascimento no futuro

Em `src/app/api/pets/route.ts`, no schema Zod do body do POST, adicione ao
campo `data_nascimento`:

```typescript
data_nascimento: z.coerce.date().refine(
  (d) => d <= new Date(),
  { message: "Data de nascimento não pode ser futura" }
),
```

## Intervenção 6 — VP-002: Singleton no seed

Em `prisma/seed.ts`, substitua `const prisma = new PrismaClient()` por:

```typescript
import { prisma } from "../src/lib/prisma";
```

Remova a chamada `await prisma.$disconnect()` do bloco `finally` se ela
existir — o singleton gerencia a conexão.

## Intervenção 7 — VP-003: Tipo de retorno em `maisRecentePorTipo`

Em `src/lib/compliance.ts`, adicione `: RegistroCompliance | null` como tipo
de retorno explícito na assinatura da função `maisRecentePorTipo`.

## Intervenção 8 — CS-005: Consolidar `formatarData`

Crie `src/lib/formatadores.ts` com:

```typescript
export function formatarData(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}
```

Em `src/app/pets/[id]/page.tsx` e `src/app/passaporte/[id]/page.tsx`, remova
as definições locais de `formatarData` e importe de `@/lib/formatadores`.

# Restrições

- Não altere o schema Prisma (exceto o seed) nem crie migrations.
- Não instale bibliotecas fora de `.ai/tech-stack.md`.
- Execute `tsc --noEmit` ao final e confirme ausência de erros.
- Ao final, liste os arquivos modificados e confirme quais IDs do relatório
  foram resolvidos.
- Sugira a mensagem de commit no formato convencional.
````

### Prompt 4 — Testes de Compliance e Integração; Alertas na UI (FQ-001, FQ-002, FQ-004)

````text
# Papel

Aja como um desenvolvedor sênior do projeto iPet executando uma sessão de
testes e completude de funcionalidade. Você vai resolver FQ-001, FQ-002
e FQ-004.

# Contexto Obrigatório

Leia antes de qualquer modificação:
- `.ai/business-rules.md` → invariantes I1–I4 com valores exatos
- `src/lib/compliance.ts` → implementação atual (já refatorada) de `avaliarCompliance`
- `src/types/domain.ts`   → constantes PERIODO_CARENCIA_BRASIL_DIAS etc. (já criadas)
- `prisma/seed.ts`        → dados determinísticos: Rex, Luna, Thor
- `src/app/api/pets/[id]/alertas/route.ts` → implementação existente da rota

# Tarefa

## Intervenção 1 — FQ-001: Setup de testes e testes unitários de `avaliarCompliance`

Instale apenas:
```bash
npm install --save-dev vitest @vitest/coverage-v8
```

Adicione ao `package.json`:
```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

Crie `vitest.config.ts` na raiz:
```typescript
import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
```

Crie `src/lib/compliance.test.ts` com os seguintes cenários, usando um `hoje`
fixo passado como argumento para garantir determinismo:

Grupo I1 — Vacina (todos os destinos):
- Sem nenhuma vacina → Inapto, mensagem "Nenhuma vacina antirrábica registrada"
- Vacina há (PERIODO_CARENCIA_BRASIL_DIAS - 11) dias → Inapto, dataLiberacao correta
- Vacina há (PERIODO_CARENCIA_BRASIL_DIAS + 9) dias, destino BR → Apto

Grupo I2 — Sorologia UE:
- Vacina ok + sem sorologia + destino UE → Inapto "Sorologia obrigatória não realizada"
- Vacina ok + sorologia há (CARENCIA_SOROLOGIA_UE_DIAS - 10) dias + destino UE → Inapto
- Vacina ok + sorologia há (CARENCIA_SOROLOGIA_UE_DIAS + 5) dias + destino UE → Apto

Grupo I3 — Sorologia JP:
- Vacina ok + sorologia há (CARENCIA_SOROLOGIA_UE_DIAS + 5) dias + destino JP → Inapto
  (cumpre UE mas não JP — caso Thor do seed)
- Vacina ok + sorologia há (CARENCIA_SOROLOGIA_JP_DIAS + 20) dias + destino JP → Apto
  (caso Rex do seed)

Grupo I4 — BR sem sorologia obrigatória:
- Vacina ok + sorologia presente + destino BR → Apto (sorologia deve ser ignorada)

Use as constantes de `src/types/domain.ts` em vez de números literais nos testes.
Os testes não devem importar Prisma nem fazer chamadas de rede.

## Intervenção 2 — FQ-002: Testes de integração dos três fluxos

Crie `src/app/api/integration.test.ts`.
Para isolar o banco de testes, use um arquivo SQLite separado. No início de
`integration.test.ts`, defina:

```
process.env.DATABASE_URL = "file:./prisma/test.db"
```

Antes dos testes rodarem (bloco `beforeAll`), execute as migrations e o seed
no banco de teste:

```
import { execSync } from 'child_process'
beforeAll(() => {
  execSync('npx prisma migrate deploy', { env: { ...process.env, DATABASE_URL: 'file:./prisma/test.db' } })
  execSync('npx prisma db seed', { env: { ...process.env, DATABASE_URL: 'file:./prisma/test.db' } })
})
afterAll(() => {
  // remove o arquivo de banco de teste ao final
  import('fs').then(fs => fs.unlinkSync('./prisma/test.db'))
})
```

Fluxo 1 — Emissão de PetPass:
- POST `/api/pets` com dados válidos → 201 com `pet_id`
- POST `/api/pagamentos` → 200 `{ status: 'approved' }`
- POST `/api/pets/:id/petpass` com destino BR e vacina válida → 201, `status_compliance: "Apto"`
- POST `/api/pets/:id/petpass` com destino BR e vacina < PERIODO_CARENCIA_BRASIL_DIAS → 201, `status_compliance: "Inapto"`

Fluxo 2 — Alertas proativos:
- GET `/api/pets/:id/alertas` com dose vencendo em 3 dias → retorna alerta com `dias_restantes: 3`
- GET `/api/pets/:id/cronograma` → retorna array com `dias_restantes` numérico

Fluxo 3 — Check-in:
- POST `/api/checkin` com microchip de pet Apto + destino válido → `{ liberado: true }`
- POST `/api/checkin` com microchip de pet Inapto → `{ liberado: false, motivo: string }`
- POST `/api/checkin` com microchip inexistente → 404

Execute `npm test` ao final e confirme que todos os cenários passam.
Mostre o output de `npm run test:coverage` listando a cobertura de `compliance.ts`.

## Intervenção 3 — FQ-004: Exibir alertas proativos em `pets/[id]/page.tsx`

A rota `GET /api/pets/[id]/alertas` (ADR 005) está implementada mas nenhuma
página a consome.

Em `src/app/pets/[id]/page.tsx`:
1. Adicione um `fetch` para `/api/pets/${petId}/alertas` junto aos outros fetches
   da página (use `Promise.all` se já houver múltiplos).
2. Adicione uma seção "Alertas Proativos" na página, abaixo do cronograma,
   que exibe os alertas retornados. Para cada alerta, mostre:
   - Tipo do procedimento
   - Dias restantes
   - Destaque visual por urgência: borda vermelha para D-1, amarela para D-3,
     azul para D-7 (use classes Tailwind).
3. Se não houver alertas, exiba "Nenhum alerta para os próximos 7 dias."

Não instale bibliotecas de componentes. Use apenas Tailwind CSS.

# Restrições

- Use apenas `vitest` para testes. Não instale Jest, Mocha ou Chai.
- Os testes unitários de `compliance.ts` devem ser puramente unitários:
  sem Prisma, sem fetch, sem efeitos colaterais.
- Todos os testes devem passar com `npm test` antes de encerrar.
- Ao final, liste os arquivos criados/modificados e os IDs do relatório resolvidos.
- Sugira a mensagem de commit no formato convencional.
````

### Prompt 5 — Geração do Relatório de Modernização (este documento)

`````text
# Papel

Aja como um Principal Software Architect do projeto iPet redigindo o
Relatório de Modernização formal para entrega acadêmica no MBA FIAP.

# Contexto Obrigatório

Antes de redigir, leia:
- `.ai/business-rules.md`, `.ai/architecture.md`, `.ai/tech-stack.md`, `.ai/standards.md`
- Todo o histórico desta sessão do Claude Code: o diagnóstico do Prompt 1
  e os relatórios parciais de cada prompt de refatoração executado
- Os arquivos efetivamente modificados ou criados durante a refatoração
- Output do último `npm test` com cobertura

Antes de redigir, execute `npm run test:coverage` e use os números exatos do output para preencher a tabela de métricas — não use placeholders como `[X]` ou `[Z%]`.

# Tarefa

Gere o arquivo `docs/relatorio-modernizacao.md` seguindo o template abaixo.
Não omita nenhuma seção. Para cada item refatorado, inclua snippets de código
"antes vs. depois" com no máximo 10 linhas cada.

# Template do Relatório

O arquivo deve começar exatamente com este cabeçalho:

```markdown
# Engenharia de Software 2.0: AI-Driven Development<br>03 - Auditoria e refatoração com IA

**FIAP - MBA em Engenharia de Software - 10AOJR**

**Integrantes**

- `367438` - Brunna Cataryne Rosa Webster
- `366865` - Danielle Moreira
- `368605` - Leonardo Braga de Almeida
- `367369` - Victor Hugo dos Santos Telles

<br>

---
```

Em seguida, gere as seções abaixo na ordem indicada, sem separadores (`---`)
entre elas:

````markdown
## 1. Sobre Este Relatório

[Parágrafo de 3–5 linhas contextualizando: o sistema avaliado (iPet /
Smart Pet Pass), a origem do código (gerado por IA na Aula 2 com o modelo
Claude Sonnet 4.6), e o objetivo da modernização — tornar o sistema
sustentável, seguro e manutenível. Mencione que este ciclo de auditoria
e refatoração também foi conduzido com o modelo Claude Sonnet 4.6,
via Claude Code. O código refatorado está disponível em:
https://github.com/tellesvh/FIAP-AOJ-EngenhariaDeSoftwareAIDrivenDev-Avaliacao/tree/refactoring]

## 2. Metodologia

[Descreva em prosa o ciclo utilizado: Auditoria → Prompts de refatoração
derivados do diagnóstico real → Geração do Relatório. Explique que os
prompts intermediários foram definidos após a leitura do diagnóstico
produzido pelo Prompt 1 — e não de forma antecipada — para garantir que
cada intervenção atacasse apenas o que existia de fato no código. Mencione
o conceito de Evolutionary Architecture e o papel do agente
Claude Sonnet 4.6 via Claude Code nesse ciclo.]

## 3. Diagnóstico de Dívida Técnica

### 3.1 Resumo Executivo
[Reproduza o Resumo Executivo gerado no Prompt 1, adaptado para o documento.]

### 3.2 Code Smells Identificados
| ID | Arquivo | Descrição | Impacto | Técnica Aplicada |
|----|---------|-----------|---------|-----------------|
[Preencha com todos os itens CS-xxx da auditoria.]

### 3.3 Violações de Padrões Identificadas
| ID | Arquivo | ADR/Padrão Violado | Descrição | Técnica Aplicada |
|----|---------|--------------------|-----------|-----------------|
[Preencha com todos os itens VP-xxx.]

### 3.4 Fragilidades de Qualidade Identificadas
| ID | Arquivo | Descrição | Técnica Aplicada |
|----|---------|-----------|-----------------|
[Preencha com todos os itens FQ-xxx.]

## 4. Intervenções Realizadas

### 4.1 Decomposição de Handlers Monolíticos e Log de Erros
**Problemas resolvidos:** CS-001, CS-002, CS-003, CS-004
**Técnica aplicada:** Extração de funções nomeadas (Single Responsibility Principle)

**Antes:**
```typescript
// snippet representativo do handler antes — máx 10 linhas
```

**Depois:**
```typescript
// snippet do handler após extração — máx 10 linhas
```

**Arquivos modificados:** [lista com caminhos]

### 4.2 Correções de Padrão, Constantes de Domínio e Bug de Integridade
**Problemas resolvidos:** VP-001, VP-002, VP-003, VP-004, VP-005,
                          CS-005, CS-006, FQ-005, FQ-006, FQ-007
**Técnica aplicada:** [descreva a técnica principal de cada subgrupo em uma linha cada]

**Antes (VP-004 — responsavel_id hardcoded):**
```typescript
// snippet antes — máx 10 linhas
```

**Depois:**
```typescript
// snippet depois — máx 10 linhas
```

**Antes (VP-005 — constantes ausentes):**
```typescript
// snippet antes — máx 10 linhas
```

**Depois:**
```typescript
// snippet depois — máx 10 linhas
```

**Arquivos criados/modificados:** [lista com caminhos]

### 4.3 Testes de Compliance e Integração; Alertas na UI
**Problemas resolvidos:** FQ-001, FQ-002, FQ-004
**Técnica aplicada:** Test-Snapshotting + Paridade Funcional

**Snippet representativo — teste I2 (sorologia UE):**
```typescript
// caso de teste — máx 10 linhas
```

**Cobertura alcançada em `compliance.ts`:** [% do output de coverage]
**Total de testes:** [unitários: X, integração: Y]

**Arquivos criados/modificados:** [lista com caminhos]

## 5. Resultados

### 5.1 Métricas de Qualidade

| Métrica | Antes | Depois |
|---------|-------|--------|
| Handlers com mais de 40 linhas       | 3  | 0 |
| Handlers com catch silenciado        | 13 | 0 |
| Rotas sem validação Zod em params    | 1  | 0 |
| Bug de responsavel_id hardcoded      | 1  | 0 |
| Constantes de domínio ausentes (standards.md) | 4 | 0 |
| Instâncias diretas do PrismaClient   | 1  | 0 |
| Magic numbers em seed.ts             | 5  | 0 |
| Funções duplicadas entre componentes | 1  | 0 |
| Testes unitários (compliance I1–I4)  | 0  | [X] |
| Testes de integração (3 fluxos)      | 0  | [Y] |
| Cobertura de compliance.ts           | 0% | [Z%] |
| Funcionalidade de alertas visível na UI | Não | Sim |

### 5.2 Análise Qualitativa

[Parágrafo de 3–5 linhas conectando o resultado com os conceitos de
Evolutionary Architecture e o Paradoxo da Modernização:
o agente refatora arquivos, mas cabe ao time humano manter o entendimento
do desenho macro. Destaque que o item VP-006 (ausência de constraints de
enum no SQLite) foi deliberadamente registrado como débito técnico aceito,
não corrigido — decisão consciente alinhada ao ADR 002 (SQLite para MVP).]

## 6. Prompts Utilizados

[Replique nesta seção, em blocos de código cercados com ```text … ```,
todos os prompts executados nesta sessão na ordem de execução:
Prompt 1 (Auditoria), Prompt 2 (Handlers e Erros), Prompt 3 (Padrões e
Constantes), Prompt 4 (Testes e UI), e este Prompt Final.]
````

# Restrições

- Nenhum snippet deve ter mais de 10 linhas.
- Todos os dados (IDs, nomes de arquivo, linhas, cobertura) devem vir do
  histórico real desta sessão — não invente dados.
- VP-006 deve aparecer nas tabelas do diagnóstico mas não nas intervenções —
  explique na seção 5.2 que foi aceito como débito técnico consciente.
- Salve em `docs/relatorio-modernizacao.md` e confirme o caminho ao final.
`````
