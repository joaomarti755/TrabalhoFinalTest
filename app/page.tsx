import Link from "next/link";

export default function Home() {
  return (
    <div className="container">
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Dashboard de Monitoramento</h1>
            <p className="text-zinc-600 mt-1">Envie um CSV com resultados do JMeter para detectar anomalias de performance.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/upload" className="btn btn-primary">Ir para Upload</Link>
            <a href="/backend/README.md" className="btn btn-ghost">Instruções Backend</a>
          </div>
        </div>
      </div>

      <div className="card mt-6">
        <h2 className="text-lg font-medium">O que faz</h2>
        <ul className="list-disc ml-5 mt-2 text-zinc-700">
          <li>Classifica cada requisição como <strong>Normal</strong> ou <strong>Anomalia</strong>.</li>
          <li>Exibe alerta visual se a porcentagem de anomalias ultrapassar o limite.</li>
          <li>Plota tendência de latência comparada à baseline (se disponível).</li>
        </ul>
      </div>
    </div>
  );
}
