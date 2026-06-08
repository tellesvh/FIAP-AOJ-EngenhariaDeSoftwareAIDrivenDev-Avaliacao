# Padrões de Engenharia — iPet / Smart Pet Pass (MVP Acadêmico)

> Convenções obrigatórias de nomenclatura, estrutura de diretórios, padrões de
> código e dados de seed. A IA deve seguir este documento em toda geração de código.

---

## Convenções de Nomenclatura
- **Arquivos e diretórios:** kebab-case (ex.: `pet-pass.ts`, `registro-sanitario/`)
- **Tipos e interfaces TypeScript:** PascalCase sem prefixo "I" (ex.: `StatusCompliance`, `PetPass`)
- **Funções e variáveis:** camelCase (ex.: `avaliarCompliance`, `petPassId`)
- **Constantes globais:** SCREAMING_SNAKE_CASE (ex.: `PERIODO_CARENCIA_BRASIL`)
- **Modelos Prisma:** PascalCase singular (ex.: `PetPass`, `RegistroSanitario`)
- **Colunas Prisma:** snake_case (ex.: `data_aplicacao`, `hash_polygon`)

---

## Estrutura de Diretórios (padrão obrigatório)

```
src/
├── app/
│   ├── api/                          (API Routes — um subdiretório por recurso)
│   │   ├── pets/route.ts
│   │   ├── pets/[id]/route.ts
│   │   ├── pets/[id]/registros-sanitarios/route.ts
│   │   ├── pets/[id]/cronograma/route.ts
│   │   ├── pets/[id]/alertas/route.ts
│   │   ├── pets/[id]/petpass/route.ts
│   │   ├── petpass/[id]/route.ts
│   │   ├── petpass/[id]/compliance/route.ts
│   │   ├── checkin/route.ts
│   │   ├── destinos/[codigo]/route.ts
│   │   └── pagamentos/route.ts
│   ├── pets/page.tsx                 (páginas — uma por fluxo)
│   ├── pets/[id]/page.tsx
│   ├── passaporte/[id]/page.tsx
│   ├── checkin/page.tsx
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   ├── prisma.ts                     (singleton do Prisma Client)
│   ├── compliance.ts                 (função pura avaliarCompliance)
│   └── mocks/
│       ├── polygon.ts
│       ├── fcm.ts
│       └── mercado-pago.ts
└── types/
    └── domain.ts                     (tipos TypeScript do domínio iPet)
```

---

## Padrões de Código
- **Tipagem:** tipos de retorno explícitos em todos os handlers e funções (sem `any`)
- **Validação:** use Zod em toda API Route que recebe body ou query params
- **Erros:** use try/catch nos handlers; retorne `NextResponse.json({ error: mensagem }, { status: código })`
- **Prisma Client:** instância única em `src/lib/prisma.ts`, importada onde necessário
- **Respostas de sucesso:** HTTP 200 (GET), 201 (POST)
- **Respostas de erro:** 400 (validação), 404 (não encontrado), 422 (regra de negócio)
- **Datas:** sempre ISO 8601

---

## Dados de Seed (`prisma/seed.ts`)
- Use IDs fixos (ex.: `"pet-001"`, `"resp-001"`)
- Inclua:
  - 2 Responsáveis
  - 3 Pets
  - 2 Veterinários
  - 2 Cias. Aéreas
  - 3 RegraDestino (BR/UE/JP)
  - 5 RegistroSanitario
  - 2 PetPass (1 Apto, 1 Inapto)
- Configure `prisma.seed` no `package.json` para rodar com `npm run seed`
