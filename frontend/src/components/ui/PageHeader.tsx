import type { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'

interface Props {
  icon: LucideIcon
  title: string
  description?: string
  actions?: React.ReactNode
}

export function PageHeader({ icon: Icon, title, description, actions }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start justify-between"
    >
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center">
          <Icon className="w-5 h-5 text-brand" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-txt-primary tracking-tight">{title}</h1>
          {description && <p className="text-sm text-txt-secondary mt-0.5">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </motion.div>
  )
}
