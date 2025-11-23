"use client"

import React, { useState } from 'react'

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const THRESHOLD = 5

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    setLoading(true)

    const fd = new FormData()
    fd.append("arquivo", file)

    try {
      const res = await fetch("http://127.0.0.1:8000/analisar-csv", {
        method: "POST",
        body: fd,
      })

      if (!res.ok) {
        const error = await res.text()
        throw new Error("Erro na API: " + error)
      }

      const data = await res.json()
      setResult(data)
    } catch (err: any) {
      alert("Erro ao enviar arquivo: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">

      <div className="card">
        <h1 className="text-2xl font-semibold">Análise de Tráfego</h1>
        <p className="text-zinc-600">
          Envie um CSV gerado pelo JMeter para análise de anomalias.
        </p>

        <form
          onSubmit={onSubmit}
          className="mt-4 flex flex-col sm:flex-row sm:items-center sm:gap-4 gap-3"
        >
          <input
            id="file-input"
            type="file"
            accept=".csv"
            style={{ display: "none" }}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />

          <label htmlFor="file-input" className="btn btn-ghost">
            {file ? `Arquivo: ${file.name}` : "Escolher arquivo"}
          </label>

          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading || !file}
          >
            {loading ? "Enviando..." : "Enviar"}
          </button>
        </form>
      </div>

      {result && (
        <div className="mt-6">

          <div className="card">
            <h2 className="text-xl font-semibold">Resultado</h2>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">

              <div>
                <div className="text-sm text-zinc-500">Total de Registros</div>
                <div className="text-lg font-medium">{result.total_amostras}</div>
              </div>

              <div>
                <div className="text-sm text-zinc-500">Anomalias Detectadas</div>
                <div className="text-lg font-medium">
                  {result.isolation_forest.anomalias}
                </div>
              </div>

              <div>
                <div className="text-sm text-zinc-500">% de Anomalias</div>
                <div className="text-lg font-medium">
                  {result.isolation_forest.percentual}%
                </div>
              </div>
            </div>

            {/* ALERTA */}
            <div className="mt-4">
              {result.isolation_forest.percentual > THRESHOLD ? (
                <div className="alert alert-danger">
                  ⚠️ Alto índice de anomalias detectado!
                </div>
              ) : (
                <div className="alert alert-ok">✔ Dentro da normalidade</div>
              )}
            </div>
          </div>

          {/* GRÁFICO BASE64 */}
          {result.grafico_latencia_base64 && (
            <div className="card mt-4">
              <h3 className="font-semibold">Gráfico de Latência</h3>

              <img
                src={`data:image/png;base64,${result.grafico_latencia_base64}`}
                className="mt-3 rounded border"
                style={{ maxWidth: "100%" }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
