# Regras de Negócio — iPet / Smart Pet Pass

> Bússola de domínio para agentes e assistentes. Toda decisão de implementação
> deve ser rastreável às invariantes **I1–I4** e à Linguagem Ubíqua abaixo.

---

## Linguagem Ubíqua (Glossário)

- **Pet Pass** — Aggregate Root do Core Context; documento digital que consolida o status de conformidade sanitária de um pet para embarque aéreo.
- **Smart Pet Pass** — Produto de entrada da iPet; o Pet Pass automatizado pelo motor de Compliance as a Service, que reduz o check-in de 20 minutos para 30 segundos.
- **Compliance as a Service (CaaS)** — Modelo de serviço que entrega a validação sanitária automatizada como motor de regras, vendido B2B/B2B2C.
- **Responsável** — Ator dono do pet; cadastra o animal e solicita a emissão do Pet Pass.
- **Veterinário** — Ator que registra atestados e resultados sanitários (vacinas, sorologias) que alimentam o compliance.
- **Agente de Aeroporto** — Ator que executa o check-in e valida o Pet Pass no embarque via leitura de microchip.
- **Companhia Aérea** — Ator e cliente B2B que paga por check-in; define regras de destino para os voos.
- **VIGIAGRO** — Vigilância Agropecuária Internacional brasileira; autoridade sanitária de referência para regras de exportação/importação de animais.
- **StatusCompliance (Apto | Inapto)** — Resultado do motor de regras: `Apto` quando todas as invariantes do destino são satisfeitas; `Inapto` caso contrário.
- **Destino** — País/jurisdição de embarque que determina o conjunto de regras sanitárias aplicáveis (Brasil, UE, Japão).
- **RegistroSanitario** — Registro de um evento sanitário (vacina, exame) com data de aplicação, usado para calcular carências.
- **SorologiaResult** — Resultado laboratorial de sorologia antirrábica, com data de coleta, exigido por destinos como UE e Japão.
- **PeriodoCarencia** — Intervalo mínimo de dias entre um evento sanitário e a data de embarque para que o pet seja considerado apto.
- **PetPassEmitido** — Evento de domínio disparado quando um Pet Pass é emitido com status `Apto`.
- **ComplianceReprovado** — Evento de domínio disparado quando a avaliação resulta em `Inapto`.
- **PetPassExpirado** — Evento de domínio disparado quando um Pet Pass perde validade por vencimento de carência ou dose.
- **SorologiaRequerida** — Evento de domínio disparado quando o destino exige sorologia ainda não registrada.
- **Microchip** — Identificador físico implantado no pet, lido via IoT Bluetooth no check-in como prova de presença (mock local no MVP).

---

## Regras de Negócio por Bounded Context

### 1. PET Pass (Core) — Aggregate Root: `PetPass`
- **RB-PP-01 (I1):** Para destino **Brasil**, a vacina antirrábica deve ter sido aplicada há **≥ 21 dias** da data de embarque. Caso contrário → `Inapto`.
- **RB-PP-02 (I2):** Para destino **UE**, exige-se sorologia antirrábica com carência mínima de **90 dias** entre coleta e embarque. Sem sorologia válida → `Inapto` + evento `SorologiaRequerida`.
- **RB-PP-03 (I3):** Para destino **Japão**, exige-se sorologia antirrábica com carência mínima de **180 dias** entre coleta e embarque. Sem sorologia válida → `Inapto` + evento `SorologiaRequerida`.
- **RB-PP-04 (I4):** Um `PetPass` emitido como `Apto` é **imutável**. Nenhuma alteração de campo, data ou status é permitida após a emissão; no produto final, é gravado em Polygon (mock retorna `hash_polygon`).
- **RB-PP-05:** A emissão `Apto` dispara `PetPassEmitido`; a reprovação dispara `ComplianceReprovado`; o vencimento dispara `PetPassExpirado`.

### 2. Gestão de Saúde (Core)
- **RB-GS-01 (I1):** `RegistroSanitario` de vacina antirrábica armazena `data_aplicacao`; a carência de **21 dias (Brasil)** é calculada a partir dela.
- **RB-GS-02 (I2/I3):** `SorologiaResult` armazena a data de coleta; as carências de **90 dias (UE)** e **180 dias (Japão)** são calculadas a partir dela.
- **RB-GS-03:** Datas futuras de aplicação/coleta são inválidas (não se registra evento sanitário no futuro).

### 3. Cadastro de Pets (Supporting) — Aggregate Root: `Pet`
- **RB-CP-01:** Todo `Pet` deve possuir um `Microchip` único antes de qualquer emissão de Pet Pass (prova de presença no check-in).
- **RB-CP-02:** Todo `Pet` deve estar vinculado a exatamente um `Responsavel`.
- **RB-CP-03:** O `Microchip` é a chave de identificação no check-in; não há check-in sem leitura de microchip correspondente.

### 4. Veterinários (Supporting) — Aggregate Root: `Veterinario`
- **RB-VET-01:** Apenas um `Veterinario` cadastrado pode originar um `Atestado`/`RegistroSanitario` válido.
- **RB-VET-02:** O atestado é insumo das invariantes I1–I3; sua data alimenta o `PeriodoCarencia`.

### 5. Cias. Aéreas (Supporting) — Aggregate Root: `CiaAerea`
- **RB-CIA-01:** Cada `RegraDestino` mapeia um `Destino` (BR/UE/JP) ao conjunto de invariantes aplicáveis (I1, I2, I3).
- **RB-CIA-02:** O check-in só é liberado se o `StatusCompliance` for `Apto` para a `RegraDestino` do voo.

### 6. Pagamentos (Generic) — Aggregate Root: `Pagamento`
- **RB-PAG-01:** Conformist via Mercado Pago; no MVP o mock retorna `{ status: 'approved', id: 'mock-pagamento-001' }`.
- **RB-PAG-02:** O pagamento não altera nem reabre um `PetPass` já emitido (respeita I4).

---

## Restrições para a IA

1. **Não flexibilize as carências (I1/I2/I3).** Os valores são fixos: Brasil = **21 dias** (antirrábica), UE = **90 dias** (sorologia), Japão = **180 dias** (sorologia). Não invente "tolerâncias", arredondamentos ou exceções não documentadas.
2. **Não viole a imutabilidade do PetPass (I4).** Nunca gere código que faça `UPDATE`/`prisma.petPass.update` em um `PetPass` com status `Apto`. Correções devem criar um novo registro, nunca mutar o emitido.
3. **Não invente novos destinos ou regras sanitárias.** Apenas Brasil, UE e Japão existem no MVP, com as invariantes I1–I3. Não adicione países, vacinas ou exames fora do escopo definido.
4. **Não pule a exigência de sorologia (I2/I3).** Para UE e Japão, ausência de `SorologiaResult` válida obriga `StatusCompliance = Inapto` e o evento `SorologiaRequerida`. Não trate sorologia como opcional.
5. **Não permita check-in sem microchip (RB-CP-01/RB-CP-03).** A leitura de microchip é prova de presença obrigatória; não gere fluxo de check-in que dispense a identificação por `Microchip`.
6. **Não reabra compliance via pagamento (RB-PAG-02).** O fluxo de `Pagamento` é Generic/Conformist e não pode reverter `Inapto` para `Apto` nem reemitir um Pet Pass.
7. **Não crie funcionalidades fora dos 6 Bounded Contexts.** Qualquer entidade, evento ou rota deve pertencer a PET Pass, Gestão de Saúde, Cadastro de Pets, Veterinários, Cias. Aéreas ou Pagamentos. Não invente módulos de relatório, BI, social, etc.
