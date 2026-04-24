import { motion } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Activity } from 'lucide-react'

interface DataPoint {
  date: string
  reads: number
  writes: number
}

interface Props {
  data: DataPoint[]
  loading?: boolean
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-strong rounded-xl p-3 border border-border text-xs">
      <p className="font-semibold text-txt-primary mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-txt-secondary capitalize">{p.name === 'reads' ? 'Leituras' : 'Escritas'}:</span>
          <span className="font-bold text-txt-primary">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export function ActivityChart({ data, loading }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="glass rounded-2xl p-6 border border-border"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-brand" />
          <span className="text-sm font-semibold text-txt-primary">Atividade (30 dias)</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-txt-muted">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-brand inline-block" />Leituras</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />Escritas</span>
        </div>
      </div>

      {loading ? (
        <div className="h-48 shimmer-bg rounded-xl" />
      ) : (
        <ResponsiveContainer width="100%" height={192}>
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="gradReads" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#00C47D" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00C47D" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradWrites" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#60A5FA" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#60A5FA" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }} />
            <Area type="monotone" dataKey="reads" stroke="#00C47D" strokeWidth={2} fill="url(#gradReads)" dot={false} />
            <Area type="monotone" dataKey="writes" stroke="#60A5FA" strokeWidth={2} fill="url(#gradWrites)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </motion.div>
  )
}
