"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface PetListItem {
  id: string;
  nome: string;
  tipo_especie: string;
  microchip: string;
  responsavel?: { nome: string };
}

// Responsáveis do seed (MVP sem auth — ADR 003).
const RESPONSAVEIS = [
  { id: "resp-001", nome: "Maria Silva" },
  { id: "resp-002", nome: "João Santos" },
];

export default function PetsPage(): React.ReactElement {
  const [pets, setPets] = useState<PetListItem[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [erro, setErro] = useState<string | null>(null);

  const [nome, setNome] = useState<string>("");
  const [tipoEspecie, setTipoEspecie] = useState<string>("Cao");
  const [microchip, setMicrochip] = useState<string>("");
  const [dataNascimento, setDataNascimento] = useState<string>("");
  const [responsavelId, setResponsavelId] = useState<string>("resp-001");
  const [enviando, setEnviando] = useState<boolean>(false);
  const [erroForm, setErroForm] = useState<string | null>(null);

  async function carregarPets(): Promise<void> {
    setCarregando(true);
    setErro(null);
    try {
      const resp = await fetch("/api/pets");
      const data = await resp.json();
      if (!resp.ok) {
        setErro(data.error ?? "Erro ao carregar pets");
        return;
      }
      setPets(data);
    } catch {
      setErro("Falha de rede ao carregar pets");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void carregarPets();
  }, []);

  async function criarPet(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setEnviando(true);
    setErroForm(null);
    try {
      const resp = await fetch("/api/pets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          tipo_especie: tipoEspecie,
          microchip,
          data_nascimento: dataNascimento,
          responsavel_id: responsavelId,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setErroForm(data.error ?? "Erro ao criar pet");
        return;
      }
      setNome("");
      setMicrochip("");
      setDataNascimento("");
      await carregarPets();
    } catch {
      setErroForm("Falha de rede ao criar pet");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Pets</h1>

      <form onSubmit={criarPet} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-slate-800">Novo Pet</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Nome</span>
            <input value={nome} onChange={(e) => setNome(e.target.value)} required className="w-full rounded border border-slate-300 px-3 py-2" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Espécie</span>
            <select value={tipoEspecie} onChange={(e) => setTipoEspecie(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2">
              <option value="Cao">Cão</option>
              <option value="Gato">Gato</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Microchip</span>
            <input value={microchip} onChange={(e) => setMicrochip(e.target.value)} required className="w-full rounded border border-slate-300 px-3 py-2" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Data de nascimento</span>
            <input type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} required className="w-full rounded border border-slate-300 px-3 py-2" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Responsável</span>
            <select value={responsavelId} onChange={(e) => setResponsavelId(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2">
              {RESPONSAVEIS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nome}
                </option>
              ))}
            </select>
          </label>
        </div>
        {erroForm && <p className="mt-3 text-sm text-red-600">{erroForm}</p>}
        <button type="submit" disabled={enviando} className="mt-4 rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
          {enviando ? "Salvando..." : "Cadastrar Pet"}
        </button>
      </form>

      {carregando && <p className="text-slate-500">Carregando pets...</p>}
      {erro && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{erro}</p>}

      {!carregando && !erro && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pets.map((pet) => (
            <Link key={pet.id} href={`/pets/${pet.id}`} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:border-emerald-400">
              <h3 className="font-semibold text-slate-900">{pet.nome}</h3>
              <p className="text-sm text-slate-600">{pet.tipo_especie === "Cao" ? "Cão" : "Gato"}</p>
              <p className="mt-2 text-xs text-slate-500">Microchip: {pet.microchip}</p>
              {pet.responsavel && <p className="text-xs text-slate-500">Resp.: {pet.responsavel.nome}</p>}
            </Link>
          ))}
          {pets.length === 0 && <p className="text-slate-500">Nenhum pet cadastrado.</p>}
        </div>
      )}
    </div>
  );
}
