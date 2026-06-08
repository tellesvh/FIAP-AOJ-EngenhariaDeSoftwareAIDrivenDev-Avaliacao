import Link from "next/link";

// Server Component (padrão): home com os três fluxos do MVP.
export default function HomePage(): React.ReactElement {
  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-bold text-slate-900">Smart Pet Pass</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Compliance as a Service que automatiza a validação sanitária de pets para embarque aéreo.
          Reduz o check-in de 20 minutos para 30 segundos.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Link href="/pets" className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:border-emerald-400">
          <h2 className="font-semibold text-emerald-700">1. Cadastro & Emissão</h2>
          <p className="mt-1 text-sm text-slate-600">Cadastre pets e emita o Smart Pet Pass por destino.</p>
        </Link>
        <Link href="/pets" className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:border-emerald-400">
          <h2 className="font-semibold text-emerald-700">2. Cronograma & Alertas</h2>
          <p className="mt-1 text-sm text-slate-600">Acompanhe doses e alertas proativos D-7/D-3/D-1.</p>
        </Link>
        <Link href="/checkin" className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:border-emerald-400">
          <h2 className="font-semibold text-emerald-700">3. Check-in Aéreo</h2>
          <p className="mt-1 text-sm text-slate-600">Valide o embarque por microchip e destino.</p>
        </Link>
      </section>
    </div>
  );
}
