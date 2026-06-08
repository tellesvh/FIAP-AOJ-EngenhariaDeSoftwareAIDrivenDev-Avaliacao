# Arquitetura — iPet / Smart Pet Pass (MVP Acadêmico)

> Registros de decisão arquitetural (ADRs). Cada ADR traz uma **instrução direta
> para a IA**. Decisões marcadas "Aceito para o MVP acadêmico" são vinculantes.

---

## ADR 001 — Next.js como Full-Stack (API Routes + Frontend)

- **Status:** Aceito para o MVP acadêmico
- **Decisão:** Todo o backend é implementado como API Routes do Next.js (`/app/api/`). Não há servidor NestJS separado.
- **Contexto:** Reduz a superfície de configuração do MVP a um único projeto Node.js, eliminando a necessidade de Docker multi-serviço e de um monorepo.
- **Consequência para a IA:** Não crie arquivos NestJS, Express ou qualquer servidor separado. Toda lógica de negócio fica em route handlers dentro de `app/api/`.

---

## ADR 002 — Banco de Dados SQLite via Prisma

- **Status:** Aceito para o MVP acadêmico
- **Decisão:** Usar SQLite como banco de dados, gerenciado pelo Prisma ORM.
- **Contexto:** SQLite não requer processo de banco externo; o arquivo `dev.db` é criado localmente com um único `npx prisma migrate dev`.
- **Consequência para a IA:** Nunca use `postgres` ou `mysql` como provider no schema Prisma. Não gere docker-compose.yml com serviço de banco. Sempre gere migrations com `npx prisma migrate dev`.

---

## ADR 003 — Sem Camada de Autenticação

- **Status:** Aceito para o MVP acadêmico
- **Decisão:** O MVP não implementa autenticação (sem JWT, sem OAuth2, sem sessões).
- **Contexto:** O foco avaliativo é o motor de compliance (invariantes I1–I4) e os três fluxos de domínio, não a segurança.
- **Consequência para a IA:** Não crie middleware de autenticação, guards, tokens ou rotas de login. Todas as API Routes são públicas. Não redirecione páginas para /login.

---

## ADR 004 — Mocks Locais para Integrações Externas

- **Status:** Aceito para o MVP acadêmico
- **Decisão:** Polygon, Firebase Cloud Messaging e Mercado Pago são simulados por funções mock em `src/lib/mocks/`.
- **Contexto:** As integrações reais exigem chaves pagas; os mocks permitem demonstrar os fluxos sem custo.
- **Consequência para a IA:** Não instale SDKs das integrações reais. Implemente as funções mock retornando valores fixos e determinísticos:
  - Polygon: retorna `hash_polygon = crypto.randomUUID()`
  - FCM: loga no console `[FCM] Alerta: {mensagem}`
  - Mercado Pago: retorna `{ status: 'approved', id: 'mock-pagamento-001' }`

---

## ADR 005 — Alertas Proativos Calculados On-Demand

- **Status:** Aceito para o MVP acadêmico
- **Decisão:** Os alertas D-7/D-3/D-1 (US001) são calculados no momento da requisição na rota `GET /api/pets/[id]/alertas`, sem fila real (sem Redis, sem BullMQ).
- **Contexto:** Redis requer um processo externo; no MVP, calcular alertas a partir das datas do banco SQLite é suficiente para demonstrar o fluxo.
- **Consequência para a IA:** Não instale ioredis nem BullMQ. A rota de alertas deve calcular, no momento da requisição, quais doses vencem em 7, 3 ou 1 dia a partir de hoje.

---

## Diagrama de Camadas (MVP)

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
SQLite (dev.db)
        │
        ▼
Mocks Locais (Polygon, FCM, Mercado Pago)
```
