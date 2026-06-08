"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface Registro {
  id: string;
  tipo: string;
  data_aplicacao: string;
  sorologia_result: string | null;
}

interface PetDetalhe {
  id: string;
  nome: string;
  tipo_especie: string;
  microchip: string;
  data_nascimento: string;
  responsavel: { nome: string; email: string; telefone: string };
  registros: Registro[];
  petpass: { id: string; status_compliance: string; destino_codigo: string } | null;
}

interface Dose {
  tipo: string;
  proxima_dose: string;
  dias_restantes: number;
}

// Veterinários do seed (MVP sem auth — ADR 003).
const VETERINARIOS = [
  { id: "vet-001", nome: "Dra. Ana Lima" },
  { id: "vet-002", nome: "Dr. Pedro Costa" },
];

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default function PetDetalhePage(): React.ReactElement {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const petId = params.id;

  const [pet, setPet] = useState<PetDetalhe | null>(null);
  const [doses, setDoses] = useState<Dose[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [erro, setErro] = useState<string | null>(null);

  // Form registrar procedimento
  const [tipo, setTipo] = useState<string>("Vacina");
  const [veterinarioId, setVeterinarioId] = useState<string>("vet-001");
  const [dataAplicacao, setDataAplicacao] = useState<string>("");
  const [sorologiaResult, setSorologiaResult] = useState<string>("");
  const [erroForm, setErroForm] = useState<string | null>(null);

  // Emissão
  const [destino, setDestino] = useState<string>("BR");
  const [emitindo, setEmitindo] = useState<boolean>(false);
  const [erroEmissao, setErroEmissao] = useState<string | null>(null);

  async function carregar(): Promise<void> {
    setCarregando(true);
    setErro(null);
    try {
      const [respPet, respCronograma] = await Promise.all([
        fetch(`/api/pets/${petId}`),
        fetch(`/api/pets/${petId}/cronograma`),
      ]);
      const dataPet = await respPet.json();
      if (!respPet.ok) {
        setErro(dataPet.error ?? "Erro ao carregar pet");
        return;
      }
      setPet(dataPet);
      const dataCron = await respCronograma.json();
      if (respCronograma.ok) setDoses(dataCron.doses ?? []);
    } catch {
      setErro("Falha de rede ao carregar pet");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petId]);

  async function registrarProcedimento(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setErroForm(null);
    try {
      const resp = await fetch(`/api/pets/${petId}/registros-sanitarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo,
          veterinario_id: veterinarioId,
          data_aplicacao: dataAplicacao,
          sorologia_result: tipo === "Sorologia" ? sorologiaResult || undefined : undefined,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setErroForm(data.error ?? "Erro ao registrar procedimento");
        return;
      }
      setDataAplicacao("");
      setSorologiaResult("");
      await carregar();
    } catch {
      setErroForm("Falha de rede ao registrar procedimento");
    }
  }

  async function emitirPetPass(): Promise<void> {
    if (!pet) return;
    setEmitindo(true);
    setErroEmissao(null);
    try {
      // 1) Pagamento (mock Mercado Pago)
      const respPag = await fetch("/api/pagamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responsavel_id: "resp-001" }),
      });
      const pagamento = await respPag.json();
      if (!respPag.ok) {
        setErroEmissao(pagamento.error ?? "Erro no pagamento");
        return;
      }

      // 2) Emissão do Pet Pass
      const respPass = await fetch(`/api/pets/${petId}/petpass`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destino_codigo: destino, pagamento_id: pagamento.id }),
      });
      const petpass = await respPass.json();
      if (!respPass.ok) {
        setErroEmissao(petpass.error ?? "Erro ao emitir Pet Pass");
        return;
      }
      router.push(`/passaporte/${petpass.id}`);
    } catch {
      setErroEmissao("Falha de rede ao emitir Pet Pass");
    } finally {
      setEmitindo(false);
    }
  }

  if (carregando) return <p className="text-slate-500">Carregando...</p>;
  if (erro) return <p className="rounded bg-red-50 p-3 text-sm text-red-700">{erro}</p>;
  if (!pet) return <p className="text-slate-500">Pet não encontrado.</p>;

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold">{pet.nome}</h1>
        <p className="text-sm text-slate-600">
          {pet.tipo_especie === "Cao" ? "Cão" : "Gato"} · Microchip {pet.microchip} · Nasc. {formatarData(pet.data_nascimento)}
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Responsável: <span className="font-medium">{pet.responsavel.nome}</span> · {pet.responsavel.email} · {pet.responsavel.telefone}
        </p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-slate-800">Histórico Sanitário</h2>
        {pet.registros.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum registro.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2">Tipo</th>
                <th className="py-2">Data</th>
                <th className="py-2">Sorologia</th>
              </tr>
            </thead>
            <tbody>
              {pet.registros.map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="py-2">{r.tipo}</td>
                  <td className="py-2">{formatarData(r.data_aplicacao)}</td>
                  <td className="py-2 text-slate-500">{r.sorologia_result ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-slate-800">Registrar Procedimento</h2>
        <form onSubmit={registrarProcedimento} className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Tipo</span>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2">
              <option value="Vacina">Vacina</option>
              <option value="Vermifugo">Vermífugo</option>
              <option value="Antipulga">Antipulga</option>
              <option value="Sorologia">Sorologia</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Veterinário</span>
            <select value={veterinarioId} onChange={(e) => setVeterinarioId(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2">
              {VETERINARIOS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Data de aplicação</span>
            <input type="date" value={dataAplicacao} onChange={(e) => setDataAplicacao(e.target.value)} required className="w-full rounded border border-slate-300 px-3 py-2" />
          </label>
          {tipo === "Sorologia" && (
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">Resultado da sorologia</span>
              <input value={sorologiaResult} onChange={(e) => setSorologiaResult(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2" />
            </label>
          )}
          <div className="sm:col-span-2">
            {erroForm && <p className="mb-2 text-sm text-red-600">{erroForm}</p>}
            <button type="submit" className="rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900">
              Registrar
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-slate-800">Próximas Doses</h2>
        {doses.length === 0 ? (
          <p className="text-sm text-slate-500">Sem doses calculadas.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {doses.map((d) => (
              <li key={d.tipo} className="flex items-center justify-between">
                <span>{d.tipo}</span>
                <span className={d.dias_restantes <= 7 ? "font-medium text-red-600" : "text-slate-600"}>
                  {formatarData(d.proxima_dose)} ({d.dias_restantes} dias)
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-emerald-800">Emitir Smart Pet Pass</h2>
        <div className="flex flex-wrap items-end gap-4">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Destino</span>
            <select value={destino} onChange={(e) => setDestino(e.target.value)} className="rounded border border-slate-300 px-3 py-2">
              <option value="BR">Brasil (BR)</option>
              <option value="UE">União Europeia (UE)</option>
              <option value="JP">Japão (JP)</option>
            </select>
          </label>
          <button onClick={emitirPetPass} disabled={emitindo} className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
            {emitindo ? "Emitindo..." : "Emitir Smart Pet Pass"}
          </button>
        </div>
        {erroEmissao && <p className="mt-3 text-sm text-red-600">{erroEmissao}</p>}
      </section>
    </div>
  );
}
