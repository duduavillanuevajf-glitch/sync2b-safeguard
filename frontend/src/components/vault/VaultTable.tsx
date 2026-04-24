import { motion } from 'framer-motion'
import { Eye, Edit, Trash2, Clock, Globe, ToggleLeft, ToggleRight } from 'lucide-react'
import type { VaultItem } from '@/types'
import { ServiceBadge, AlertBadge, StatusBadge } from '@/components/ui/Badge'
import { fRelative } from '@/utils/format'
import { cn } from '@/utils/cn'

interface Props {
  items: VaultItem[]
  loading?: boolean
  onView: (item: VaultItem) => void
  onEdit: (item: VaultItem) => void
  onDelete: (item: VaultItem) => void
  onToggle: (item: VaultItem) => void
  canEdit?: boolean
  canDelete?: boolean
}

function SkeletonRow() {
  return (
    <tr>
      {[1,2,3,4,5].map(i => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 shimmer-bg rounded w-full" />
        </td>
      ))}
    </tr>
  )
}

export function VaultTable({ items, loading, onView, onEdit, onDelete, onToggle, canEdit = true, canDelete = true }: Props) {
  return (
    <div className="glass rounded-2xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left text-xs font-semibold text-txt-muted uppercase tracking-wide">Serviço / Título</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-txt-muted uppercase tracking-wide">Usuário</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-txt-muted uppercase tracking-wide hidden md:table-cell">Host</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-txt-muted uppercase tracking-wide hidden lg:table-cell">Atualizado</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-txt-muted uppercase tracking-wide">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              : items.length === 0
              ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-txt-muted text-sm">
                    Nenhuma credencial encontrada
                  </td>
                </tr>
              )
              : items.map((item, i) => (
                <motion.tr
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={cn(
                    'group hover:bg-white/[0.03] transition-colors duration-150',
                    item.isArchived && 'opacity-50'
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <ServiceBadge service={item.serviceType} />
                      <span className="text-sm font-medium text-txt-primary truncate max-w-[160px]">{item.title}</span>
                      {item.staleDays && item.staleDays > 90 && <AlertBadge days={item.staleDays} />}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-txt-secondary font-mono truncate max-w-[140px]">{item.username}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {item.host && (
                      <span className="flex items-center gap-1 text-xs text-txt-muted font-mono">
                        <Globe className="w-3 h-3 flex-shrink-0" />
                        {item.host}
                        {item.port && <span className="text-txt-muted/60">:{item.port}</span>}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="flex items-center gap-1 text-xs text-txt-muted">
                      <Clock className="w-3 h-3" />
                      {fRelative(item.updatedAt)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge active={!item.isArchived} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onView(item)} className="w-7 h-7 rounded-lg flex items-center justify-center text-txt-muted hover:text-brand hover:bg-brand/10 transition-all">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {canEdit && (
                        <button onClick={() => onEdit(item)} className="w-7 h-7 rounded-lg flex items-center justify-center text-txt-muted hover:text-txt-primary hover:bg-white/5 transition-all">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canEdit && (
                        <button onClick={() => onToggle(item)} className="w-7 h-7 rounded-lg flex items-center justify-center text-txt-muted hover:text-warn hover:bg-warn/10 transition-all">
                          {item.isArchived ? <ToggleLeft className="w-3.5 h-3.5" /> : <ToggleRight className="w-3.5 h-3.5" />}
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => onDelete(item)} className="w-7 h-7 rounded-lg flex items-center justify-center text-txt-muted hover:text-danger hover:bg-danger/10 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  )
}
