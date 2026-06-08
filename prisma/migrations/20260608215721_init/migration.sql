-- CreateTable
CREATE TABLE "Responsavel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Pet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "data_nascimento" DATETIME NOT NULL,
    "tipo_especie" TEXT NOT NULL,
    "microchip" TEXT NOT NULL,
    "responsavel_id" TEXT NOT NULL,
    CONSTRAINT "Pet_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "Responsavel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PetPass" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pet_id" TEXT NOT NULL,
    "status_compliance" TEXT NOT NULL,
    "motivo" TEXT,
    "data_liberacao" DATETIME,
    "destino_codigo" TEXT NOT NULL,
    "data_emissao" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_expiracao" DATETIME NOT NULL,
    "hash_polygon" TEXT,
    CONSTRAINT "PetPass_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "Pet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RegistroSanitario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pet_id" TEXT NOT NULL,
    "veterinario_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "data_aplicacao" DATETIME NOT NULL,
    "sorologia_result" TEXT,
    "hash_polygon" TEXT,
    CONSTRAINT "RegistroSanitario_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "Pet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RegistroSanitario_veterinario_id_fkey" FOREIGN KEY ("veterinario_id") REFERENCES "Veterinario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Veterinario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "crmv" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "habilitado" BOOLEAN NOT NULL
);

-- CreateTable
CREATE TABLE "CiaAerea" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codigo_iata" TEXT NOT NULL,
    "nome" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "RegraDestino" (
    "destino_codigo" TEXT NOT NULL PRIMARY KEY,
    "periodo_carencia_dias" INTEGER NOT NULL,
    "sorologia_obrigatoria" BOOLEAN NOT NULL,
    "carencia_sorologia_dias" INTEGER
);

-- CreateTable
CREATE TABLE "Pagamento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "responsavel_id" TEXT NOT NULL,
    "valor" REAL NOT NULL,
    "metodo" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "petpass_id" TEXT,
    CONSTRAINT "Pagamento_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "Responsavel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pagamento_petpass_id_fkey" FOREIGN KEY ("petpass_id") REFERENCES "PetPass" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Responsavel_email_key" ON "Responsavel"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Pet_microchip_key" ON "Pet"("microchip");

-- CreateIndex
CREATE UNIQUE INDEX "Veterinario_crmv_key" ON "Veterinario"("crmv");

-- CreateIndex
CREATE UNIQUE INDEX "CiaAerea_codigo_iata_key" ON "CiaAerea"("codigo_iata");
