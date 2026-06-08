"use client";

import { useState } from "react";

interface ResultadoCheckin {
  liberado: boolean;
  motivo?: string;
  pet?: { nome: string };
  destino_codigo?: string;
}

export default function CheckinPage(): React.ReactElement {
  const [microchip, setMicrochip] = useState<string>("");
  const [destino, setDestino] = useState<string>("BR");
  const [resultado, setResultado] = useState<ResultadoCheckin | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [processando, setProcessando] = useState<boolean>(false);

  async function validar(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setProcessando(true);
    setErro(null);
    setResultado(null);
    try {
      const resp = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ microchip, destino_codigo: destino }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setErro(data.error ?? "Erro no check-in");
        return;
      }
      setResultado(data);
    } catch {
      setErro("Falha de rede ao validar check-in");
    } finally {
      setProcessando(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">Check-in Aéreo</h1>

      <form onSubmit={validar} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Microchip</span>
            <input
              value={microchip}
              onChange={(e) => setMicrochip(e.target.value)}
              required
              placeholder="Ex.: BR001"
              className="w-full rounded border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Destino</span>
            <select value={destino} onChange={(e) => setDestino(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2">
              <option value="BR">Brasil (BR)</option>
              <option value="UE">União Europeia (UE)</option>
              <option value="JP">Japão (JP)</option>
            </select>
          </label>
        </div>
        <button
          type="submit"
          disabled={processando}
          className="mt-4 rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {processando ? "Validando..." : "Validar Embarque"}
        </button>
      </form>

      {erro && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{erro}</p>}

      {resultado?.liberado && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-5">
          <h2 className="text-lg font-bold text-emerald-800">✓ Embarque liberado</h2>
          <p className="mt-1 text-sm text-emerald-700">
            {resultado.pet?.nome} está apto para o destino {resultado.destino_codigo}.
          </p>
        </div>
      )}

      {resultado && !resultado.liberado && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-5">
          <h2 className="text-lg font-bold text-red-800">✗ Embarque não liberado</h2>
          <p className="mt-1 text-sm text-red-700">{resultado.motivo}</p>
        </div>
      )}
    </div>
  );
}
