"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface PetPass {
  id: string;
  status_compliance: string;
  motivo: string | null;
  data_liberacao: string | null;
  destino_codigo: string;
  data_emissao: string;
  data_expiracao: string;
  hash_polygon: string | null;
  pet: { nome: string; microchip: string };
}

function formatarData(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default function PassaportePage(): React.ReactElement {
  const params = useParams<{ id: string }>();
  const petpassId = params.id;

  const [petpass, setPetpass] = useState<PetPass | null>(null);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [erro, setErro] = useState<string | null>(null);
  const [reavaliando, setReavaliando] = useState<boolean>(false);

  const carregar = useCallback(async (): Promise<void> => {
    setCarregando(true);
    setErro(null);
    try {
      const resp = await fetch(`/api/petpass/${petpassId}`);
      const data = await resp.json();
      if (!resp.ok) {
        setErro(data.error ?? "Erro ao carregar passaporte");
        return;
      }
      setPetpass(data);
    } catch {
      setErro("Falha de rede ao carregar passaporte");
    } finally {
      setCarregando(false);
    }
  }, [petpassId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function reavaliar(): Promise<void> {
    setReavaliando(true);
    try {
      const resp = await fetch(`/api/petpass/${petpassId}/compliance`, { method: "POST" });
      if (resp.ok) await carregar();
    } finally {
      setReavaliando(false);
    }
  }

  if (carregando) return <p className="text-slate-500">Carregando...</p>;
  if (erro) return <p className="rounded bg-red-50 p-3 text-sm text-red-700">{erro}</p>;
  if (!petpass) return <p className="text-slate-500">Passaporte não encontrado.</p>;

  const apto = petpass.status_compliance === "Apto";

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{petpass.pet.nome}</h1>
            <p className="text-sm text-slate-600">
              Destino {petpass.destino_codigo} · Microchip {petpass.pet.microchip}
            </p>
          </div>
          <span
            className={`rounded-full px-4 py-1 text-sm font-semibold ${
              apto ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
            }`}
          >
            {petpass.status_compliance}
          </span>
        </div>

        <hr className="my-5 border-slate-100" />

        {apto ? (
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Hash Polygon</dt>
              <dd className="font-mono text-xs text-slate-800">{petpass.hash_polygon}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Emitido em</dt>
              <dd>{formatarData(petpass.data_emissao)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Expira em</dt>
              <dd>{formatarData(petpass.data_expiracao)}</dd>
            </div>
          </dl>
        ) : (
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Motivo</dt>
              <dd className="text-right text-red-700">{petpass.motivo ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Liberação prevista</dt>
              <dd>{formatarData(petpass.data_liberacao)}</dd>
            </div>
          </dl>
        )}
      </div>

      <button
        onClick={reavaliar}
        disabled={reavaliando}
        className="rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50"
      >
        {reavaliando ? "Reavaliando..." : "Reavaliar"}
      </button>
      {apto && (
        <p className="text-xs text-slate-400">
          PetPass Apto é imutável (I4): a reavaliação não altera o registro.
        </p>
      )}
    </div>
  );
}
