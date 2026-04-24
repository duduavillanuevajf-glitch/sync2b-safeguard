import { motion } from 'framer-motion'
import { Eye, Edit, Trash2, Copy, Check, Globe, Clock } from 'lucide-react'
import { useState } from 'react'
import type { VaultItem } from '@/types'
import { ServiceBadge, AlertBadge, StatusBadge } from '@/components/ui/Badge'
import { fRelative } from '@/utils/format'
import { copyToClipboard } from '@/utils/format'

interface Props {
  item: VaultItem
  onView: () => void
  onEdit: () => void
  onDelete: () => void
  canEdit?: boolean
  canDelete?: boolean
  delay?: number
}

export function CredentialCard({ item, onView, onEdit, onDelete, canEdit = true, canDelete = true, delay = 0 }: Props) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await copyToClipboard(item.username)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      onClick={onView}
      className="glass rounded-2xl border border-border p-4 hover:border-brand/30 hover:shadow-brand transition-all duration-300 cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-3">
        <ServiceBadge service={item.serviceType} />
        <StatusBadge active={!item.isArchived} />
      </div>

      <h3 className="text-sm font-semibold text-txt-primary mb-1 truncate group-hover:text-brand transition-colors">
        {item.title}
      </h3>

      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-xs text-txt-muted font-mono truncate flex-1">{item.username}</span>
        <button
          onClick={handleCopy}
          className="w-6 h-6 flex items-center justify-center rounded-lg text-txt-muted hover:text-brand hover:bg-brand/10 transition-all flex-shrink-0"
        >
          {copied ? <Check className="w-3 h-3 text-brand" /> : <Copy className="w-3 h-3" />}
        </button>
      </div>

      {item.host && (
        <div className="flex items-center gap-1 text-xs text-txt-muted mb-3">
          <Globe className="w-3 h-3 flex-shrink-0" />
          <span className="font-mono truncate">{item.host}{item.port ? `:${item.port}` : ''}</span>
        </div>
      )}

      {item.staleDays && item.staleDays > 90 && (
        <div className="mb-3">
          <AlertBadge days={item.staleDays} />
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-border">
        <span className="flex items-center gap-1 text-xs text-txt-muted">
          <Clock className="w-3 h-3" />
          {fRelative(item.updatedAt)}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={e => { e.stopPropagation(); onView() }}
            className="w-6 h-6 flex items-center justify-center rounded-lg text-txt-muted hover:text-brand hover:bg-brand/10 transition-all">
            <Eye className="w-3 h-3" />
          </button>
          {canEdit && (
            <button onClick={e => { e.stopPropagation(); onEdit() }}
              className="w-6 h-6 flex items-center justify-center rounded-lg text-txt-muted hover:text-txt-primary hover:bg-white/5 transition-all">
              <Edit className="w-3 h-3" />
            </button>
          )}
          {canDelete && (
            <button onClick={e => { e.stopPropagation(); onDelete() }}
              className="w-6 h-6 flex items-center justify-center rounded-lg text-txt-muted hover:text-danger hover:bg-danger/10 transition-all">
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
