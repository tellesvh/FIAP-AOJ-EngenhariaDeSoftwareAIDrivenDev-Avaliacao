// Aponta o Prisma para o banco de teste isolado antes que qualquer módulo importe o singleton.
// Deve rodar antes de todos os arquivos de teste via vitest.config.ts setupFiles.
process.env.DATABASE_URL = 'file:./prisma/test.db'
