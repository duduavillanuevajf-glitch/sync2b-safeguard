import { useState, useRef } from 'react'
import { Upload, FileDown, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { PageHeader } from '@/components/ui/PageHeader'
import { vaultService } from '@/services/vault.service'
import type { ImportResult } from '@/types'
import { cn } from '@/utils/cn'

export function Import() {
  const [file, setFile] = useState<File | null>(null)
  const [strict, setStrict] = useState(true)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    setFile(f)
    setResult(null)
    setError('')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleImport = async () => {
    if (!file) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await vaultService.import(file, strict)
      setResult(res)
    } catch (e: any) {
      setError(e.response?.data?.error?.message || 'Erro ao importar arquivo')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadTemplate = async () => {
    const blob = await vaultService.downloadTemplate()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'vault-template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        icon={Upload}
        title="Importar Credenciais"
        description="Importe credenciais em massa via CSV ou XLSX"
        actions={
          <button onClick={handleDownloadTemplate} className="btn-ghost flex items-center gap-2 text-sm">
            <FileDown className="w-4 h-4" />
            Baixar template
          </button>
        }
      />

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'glass rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-all duration-300',
          dragging ? 'border-brand bg-brand/10' : file ? 'border-brand/40 bg-brand/5' : 'border-border hover:border-border-strong hover:bg-white/[0.02]'
        )}
      >
        <input ref={inputRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        <Upload className={cn('w-10 h-10 mx-auto mb-3', file ? 'text-brand' : 'text-txt-muted')} />
        {file ? (
          <>
            <p className="text-txt-primary font-semibold">{file.name}</p>
            <p className="text-xs text-txt-muted mt-1">{(file.size / 1024).toFixed(1)} KB · clique para trocar</p>
          </>
        ) : (
          <>
            <p className="text-txt-primary font-semibold">Arraste o arquivo ou clique para selecionar</p>
            <p className="text-xs text-txt-muted mt-1">CSV ou XLSX — máx. 10 MB</p>
          </>
        )}
      </div>

      {/* Options */}
      <div className="glass rounded-2xl border border-border p-5 space-y-4">
        <h3 className="text-sm font-semibold text-txt-primary">Opções de importação</h3>
        <div className="flex items-start gap-3 p-4 rounded-xl bg-bg-elevated border border-border">
          <input
            id="strict"
            type="checkbox"
            checked={strict}
            onChange={e => setStrict(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-brand rounded"
          />
          <div>
            <label htmlFor="strict" className="text-sm font-semibold text-txt-primary cursor-pointer">Modo estrito</label>
            <p className="text-xs text-txt-muted mt-0.5">Reverte toda a importação se qualquer linha tiver erro. Garante consistência total dos dados.</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-4 rounded-xl bg-bg-elevated border border-border opacity-60">
          <input id="best" type="checkbox" checked={!strict} onChange={e => setStrict(!e.target.checked)} className="mt-0.5 w-4 h-4 accent-brand rounded" />
          <div>
            <label htmlFor="best" className="text-sm font-semibold text-txt-primary cursor-pointer">Modo best-effort</label>
            <p className="text-xs text-txt-muted mt-0.5">Importa o máximo possível e reporta erros por linha sem cancelar o restante.</p>
          </div>
        </div>
      </div>

      {/* Action */}
      <button
        onClick={handleImport}
        disabled={!file || loading}
        className="btn-primary w-full flex items-center justify-center gap-2 h-12 text-sm"
      >
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Importando...</> : <><Upload className="w-4 h-4" />Iniciar importação</>}
      </button>

      {/* Error */}
      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex items-center gap-3 p-4 rounded-2xl bg-danger/10 border border-danger/20 text-danger text-sm">
          <XCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </motion.div>
      )}

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl border border-border p-5 space-y-4">
            <div className="flex items-center gap-2">
              {result.failed === 0
                ? <CheckCircle className="w-5 h-5 text-success" />
                : <AlertTriangle className="w-5 h-5 text-warn" />
              }
              <span className="text-sm font-semibold text-txt-primary">Resultado da importação</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-xl bg-success/10 border border-success/20">
                <p className="text-2xl font-black text-success">{result.imported}</p>
                <p className="text-xs text-txt-muted">Importados</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-warn/10 border border-warn/20">
                <p className="text-2xl font-black text-warn">{result.skipped ?? 0}</p>
                <p className="text-xs text-txt-muted">Ignorados</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-danger/10 border border-danger/20">
                <p className="text-2xl font-black text-danger">{result.failed}</p>
                <p className="text-xs text-txt-muted">Erros</p>
              </div>
            </div>
            {result.errors && result.errors.length > 0 && (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                <p className="text-xs font-semibold text-txt-secondary uppercase tracking-wide mb-2">Erros por linha</p>
                {result.errors.map((e: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-xs p-2 rounded-lg bg-danger/5 border border-danger/10">
                    <span className="font-mono text-danger font-bold flex-shrink-0">L{e.row}</span>
                    <span className="text-txt-muted">{e.message}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
