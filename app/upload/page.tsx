"use client"

import React, { useState, useRef, useEffect } from 'react'
import Script from 'next/script'

export default function UploadPage(){
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const plotRef = useRef<HTMLDivElement | null>(null)
  const DEFAULT_THRESHOLD = 5

  useEffect(()=>{
    if (!result) return
    const { current_series, baseline_series } = result
    if (typeof window === 'undefined' || !plotRef.current) return
    // wait for Plotly to be available
    const tryPlot = () => {
      // @ts-ignore
      if ((window as any).Plotly && plotRef.current){
        const traces: any[] = []
        if (current_series){
          traces.push({ x: current_series.map((_:any,i:number)=>i), y: current_series, name: 'Atual', mode: 'lines+markers' })
        }
        if (baseline_series){
          traces.push({ x: baseline_series.map((_:any,i:number)=>i), y: baseline_series, name: 'Baseline', mode: 'lines' })
        }
        // @ts-ignore
        ;(window as any).Plotly.newPlot(plotRef.current, traces, {margin:{t:20}})
      } else {
        setTimeout(tryPlot, 200)
      }
    }
    tryPlot()
  }, [result])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    setLoading(true)
    const fd = new FormData()
    fd.append('file', file)
    try{
      const res = await fetch('http://127.0.0.1:8000/api/classify', { method: 'POST', body: fd })
      const data = await res.json()
      setResult(data)
    }catch(err){
      alert('Erro ao enviar: '+err)
    }finally{
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h1 className="text-2xl font-semibold">Upload CSV</h1>
        <p className="text-zinc-600">Envie um CSV de resultados do JMeter para classificar e visualizar anomalias.</p>

        <form onSubmit={onSubmit} className="mt-4 flex flex-col sm:flex-row sm:items-center sm:gap-4 gap-3">
          <input id="file-input" style={{display:'none'}} type="file" accept=".csv" onChange={e=>setFile(e.target.files?.[0] ?? null)} />
          <label htmlFor="file-input" className="btn btn-ghost" onClick={(ev)=>{
            // clicking label will focus input; keep for accessibility
          }}>{file ? `Arquivo: ${file.name}` : 'Escolher arquivo'}</label>

          <button className="btn btn-primary" type="submit" disabled={loading || !file}>{loading? 'Enviando...' : 'Enviar'}</button>
        </form>
        <div className="text-sm text-zinc-500 mt-2">Usamos threshold fixo de <strong>5%</strong> para alertas.</div>
      </div>

      {result && (
        <div className="mt-6">
          <div className="card">
            <h2 className="text-xl font-semibold">Resultado</h2>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <div className="text-sm text-zinc-500">Linhas</div>
                <div className="text-lg font-medium">{result.n_rows}</div>
              </div>
              <div>
                <div className="text-sm text-zinc-500">Porcentagem de anomalias</div>
                <div className="text-lg font-medium">{result.pct_anom?.toFixed?.(2)}%</div>
              </div>
              <div>
                {result.pct_anom > threshold ? (
                  <div className="alert alert-danger">⚠️ Alerta: anomalias acima de {threshold}%</div>
                ) : (
                  <div className="alert alert-ok">✔️ Dentro da faixa</div>
                )}
              </div>
            </div>
          </div>

          {result.latency_col && (
            <div className="card mt-4">
              <h3 className="font-semibold">Tendência ({result.latency_col})</h3>
              <div className="plotly-container mt-3" ref={plotRef} />
            </div>
          )}

          <div className="card mt-4">
            <h3 className="font-semibold">Sample (primeiras linhas)</h3>
            <div className="mt-2" style={{overflow:'auto',maxHeight:360}}>
              <table className="table">
                <thead>
                  <tr>
                    {result.sample && result.sample.length>0 && Object.keys(result.sample[0]).map((k:string)=> (
                      <th key={k}>{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.sample && result.sample.map((row:any,ri:number)=> (
                    <tr key={ri}>
                      {Object.keys(row).map((k:string)=> (
                        <td key={k}>{String(row[k])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Plotly CDN */}
      <Script src="https://cdn.plot.ly/plotly-2.24.2.min.js" strategy="afterInteractive" />
    </div>
  )
}
