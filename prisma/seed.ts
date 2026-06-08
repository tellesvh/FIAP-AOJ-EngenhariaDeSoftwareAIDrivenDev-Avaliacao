// iPet / Smart Pet Pass — Seed determinístico (IDs fixos)
// Datas dos RegistroSanitario são relativas a "hoje" para exercitar I1/I2/I3.

import { PrismaClient } from "@prisma/client";
import { addDays, subDays } from "date-fns";

const prisma = new PrismaClient();
const hoje = new Date();

async function main(): Promise<void> {
  // Limpeza (ordem respeita as FKs)
  await prisma.pagamento.deleteMany();
  await prisma.petPass.deleteMany();
  await prisma.registroSanitario.deleteMany();
  await prisma.pet.deleteMany();
  await prisma.veterinario.deleteMany();
  await prisma.ciaAerea.deleteMany();
  await prisma.responsavel.deleteMany();
  await prisma.regraDestino.deleteMany();

  // RegraDestino — BR (21d, sem sorologia), UE (21d + sorologia 90d), JP (21d + sorologia 180d)
  await prisma.regraDestino.create({
    data: { destino_codigo: "BR", periodo_carencia_dias: 21, sorologia_obrigatoria: false, carencia_sorologia_dias: null },
  });
  await prisma.regraDestino.create({
    data: { destino_codigo: "UE", periodo_carencia_dias: 21, sorologia_obrigatoria: true, carencia_sorologia_dias: 90 },
  });
  await prisma.regraDestino.create({
    data: { destino_codigo: "JP", periodo_carencia_dias: 21, sorologia_obrigatoria: true, carencia_sorologia_dias: 180 },
  });

  // Responsaveis
  await prisma.responsavel.create({
    data: { id: "resp-001", nome: "Maria Silva", email: "maria.silva@example.com", telefone: "+55 11 90000-0001" },
  });
  await prisma.responsavel.create({
    data: { id: "resp-002", nome: "João Santos", email: "joao.santos@example.com", telefone: "+55 11 90000-0002" },
  });

  // Veterinarios (ambos habilitados)
  await prisma.veterinario.create({
    data: { id: "vet-001", crmv: "CRMV-SP-12345", nome: "Dra. Ana Lima", habilitado: true },
  });
  await prisma.veterinario.create({
    data: { id: "vet-002", crmv: "CRMV-SP-67890", nome: "Dr. Pedro Costa", habilitado: true },
  });

  // Cias. Aéreas
  await prisma.ciaAerea.create({ data: { id: "cia-001", codigo_iata: "LA", nome: "LATAM" } });
  await prisma.ciaAerea.create({ data: { id: "cia-002", codigo_iata: "G3", nome: "GOL" } });

  // Pets
  await prisma.pet.create({
    data: { id: "pet-001", nome: "Rex", data_nascimento: subDays(hoje, 730), tipo_especie: "Cao", microchip: "BR001", responsavel_id: "resp-001" },
  });
  await prisma.pet.create({
    data: { id: "pet-002", nome: "Luna", data_nascimento: subDays(hoje, 365), tipo_especie: "Gato", microchip: "BR002", responsavel_id: "resp-001" },
  });
  await prisma.pet.create({
    data: { id: "pet-003", nome: "Thor", data_nascimento: subDays(hoje, 540), tipo_especie: "Cao", microchip: "BR003", responsavel_id: "resp-002" },
  });

  // RegistroSanitario (datas relativas a hoje)
  // reg-001 Rex · Vacina · há 30 dias → cumpre I1
  await prisma.registroSanitario.create({
    data: { id: "reg-001", pet_id: "pet-001", veterinario_id: "vet-001", tipo: "Vacina", data_aplicacao: subDays(hoje, 30) },
  });
  // reg-002 Rex · Sorologia · há 200 dias → cumpre I3 (180 dias)
  await prisma.registroSanitario.create({
    data: { id: "reg-002", pet_id: "pet-001", veterinario_id: "vet-001", tipo: "Sorologia", data_aplicacao: subDays(hoje, 200), sorologia_result: "Reagente >= 0.5 UI/mL" },
  });
  // reg-003 Luna · Vacina · há 10 dias → não cumpre I1, deve reprovar
  await prisma.registroSanitario.create({
    data: { id: "reg-003", pet_id: "pet-002", veterinario_id: "vet-001", tipo: "Vacina", data_aplicacao: subDays(hoje, 10) },
  });
  // reg-004 Thor · Vacina · há 25 dias → cumpre I1
  await prisma.registroSanitario.create({
    data: { id: "reg-004", pet_id: "pet-003", veterinario_id: "vet-002", tipo: "Vacina", data_aplicacao: subDays(hoje, 25) },
  });
  // reg-005 Thor · Sorologia · há 95 dias → cumpre I2 (90), não cumpre I3 (180)
  await prisma.registroSanitario.create({
    data: { id: "reg-005", pet_id: "pet-003", veterinario_id: "vet-002", tipo: "Sorologia", data_aplicacao: subDays(hoje, 95), sorologia_result: "Reagente >= 0.5 UI/mL" },
  });

  // PetPass pré-emitidos
  // pass-001 Rex → JP · Apto · hash fixo · expira em 90 dias
  await prisma.petPass.create({
    data: {
      id: "pass-001",
      pet_id: "pet-001",
      status_compliance: "Apto",
      motivo: null,
      data_liberacao: null,
      destino_codigo: "JP",
      data_emissao: hoje,
      data_expiracao: addDays(hoje, 90),
      hash_polygon: "hash-polygon-rex-001",
    },
  });
  // pass-002 Luna → BR · Inapto · motivo de carência de vacina
  await prisma.petPass.create({
    data: {
      id: "pass-002",
      pet_id: "pet-002",
      status_compliance: "Inapto",
      motivo: "Carência de vacina não cumprida",
      data_liberacao: addDays(subDays(hoje, 10), 21),
      destino_codigo: "BR",
      data_emissao: hoje,
      data_expiracao: hoje,
      hash_polygon: null,
    },
  });

  console.log("[SEED] Banco populado com dados determinísticos.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
