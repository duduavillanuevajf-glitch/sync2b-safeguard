import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function fDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return '—'
  return format(d, 'dd/MM/yyyy', { locale: ptBR })
}

export function fDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return '—'
  return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

export function fRelative(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return '—'
  return formatDistanceToNow(d, { addSuffix: true, locale: ptBR })
}

export function fMask(value: string, visible = false): string {
  return visible ? value : '•'.repeat(Math.min(value.length, 16))
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text)
}

export const SERVICE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  SIP:        { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' },
  SSH:        { bg: 'bg-green-500/10',  text: 'text-green-400',  border: 'border-green-500/20'  },
  MySQL:      { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
  PostgreSQL: { bg: 'bg-blue-500/10',   text: 'text-blue-400',   border: 'border-blue-500/20'   },
  RDP:        { bg: 'bg-cyan-500/10',   text: 'text-cyan-400',   border: 'border-cyan-500/20'   },
  FTP:        { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' },
  HTTPS:      { bg: 'bg-emerald-500/10',text: 'text-emerald-400',border: 'border-emerald-500/20'},
  HTTP:       { bg: 'bg-slate-500/10',  text: 'text-slate-400',  border: 'border-slate-500/20'  },
  SMTP:       { bg: 'bg-pink-500/10',   text: 'text-pink-400',   border: 'border-pink-500/20'   },
  LDAP:       { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
  SFTP:       { bg: 'bg-teal-500/10',  text: 'text-teal-400',  border: 'border-teal-500/20'  },
  API:        { bg: 'bg-rose-500/10',  text: 'text-rose-400',  border: 'border-rose-500/20'  },
  Email:      { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  Outro:      { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' },
}

export const ROLE_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  super_admin:   { label: 'Super Admin',    bg: 'bg-brand/10',    text: 'text-brand',    border: 'border-brand/25'    },
  org_admin:     { label: 'Admin',          bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/25' },
  vault_manager: { label: 'Gestor',         bg: 'bg-violet-500/10',text:'text-violet-400',border:'border-violet-500/25'},
  vault_viewer:  { label: 'Visualizador',   bg: 'bg-slate-500/10',text: 'text-slate-400',border: 'border-slate-500/25'},
}

export function getRoleLabel(role: string): string {
  return ROLE_CONFIG[role]?.label || role.replace(/_/g, ' ')
}
