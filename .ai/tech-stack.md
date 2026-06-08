# Tech Stack — iPet / Smart Pet Pass (MVP Acadêmico)

> Stack vinculante. Versões fixas. A IA não deve introduzir dependências fora
> da lista "Aprovada" e nunca deve usar itens da lista "Proibida".

---

## Stack Aprovada (versões fixas para o MVP)

### Framework Full-Stack
- **Next.js 15** (App Router), **TypeScript 5.x**
- **Instrução:** "Use API Routes em `app/api/` para toda lógica de backend. Use Server Components por padrão; Client Components apenas onde há interatividade explícita (formulários, estado local)."

### Estilização
- **Tailwind CSS 3.x**
- **Instrução:** "Não instale bibliotecas de componentes (MUI, Chakra, shadcn). Use apenas classes Tailwind."

### Banco de Dados
- **SQLite** (arquivo local `prisma/dev.db`) + **Prisma ORM 5.x**
- **Instrução:** "Provider do Prisma: `sqlite`. Nunca use `postgresql` ou `mysql`. Execute `npx prisma migrate dev` para criar o banco."

### Runtime
- **Node.js LTS (22.x)**. Use `npm` como gerenciador de pacotes.

### Bibliotecas Permitidas
- **`date-fns`** — cálculo de diferença de datas para `PeriodoCarencia` e alertas
- **`zod`** — validação de input nas API Routes

### Mocks de Integração (em `src/lib/mocks/` — não instale SDKs reais)
- **Polygon** → `polygon.ts` (retorna UUID)
- **Firebase Cloud Messaging** → `fcm.ts` (log no console)
- **Mercado Pago** → `mercado-pago.ts` (retorna approved)

---

## Bibliotecas Proibidas
- **NestJS, Express, Fastify** (qualquer framework de servidor separado)
- **jsonwebtoken, passport, next-auth** (autenticação)
- **ioredis, bullmq** (filas)
- **axios** (use `fetch` nativo)
- **Qualquer ORM além do Prisma**
