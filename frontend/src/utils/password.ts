const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const LOWER = 'abcdefghijklmnopqrstuvwxyz'
const DIGITS = '0123456789'
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?'

export interface PasswordOptions {
  length: number
  uppercase: boolean
  lowercase: boolean
  digits: boolean
  symbols: boolean
}

export function generatePassword(opts: PasswordOptions): string {
  let chars = ''
  const required: string[] = []

  if (opts.uppercase) { chars += UPPER; required.push(UPPER[Math.floor(Math.random() * UPPER.length)]) }
  if (opts.lowercase) { chars += LOWER; required.push(LOWER[Math.floor(Math.random() * LOWER.length)]) }
  if (opts.digits)    { chars += DIGITS; required.push(DIGITS[Math.floor(Math.random() * DIGITS.length)]) }
  if (opts.symbols)   { chars += SYMBOLS; required.push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]) }

  if (!chars) chars = LOWER + DIGITS

  const arr = new Uint32Array(opts.length)
  crypto.getRandomValues(arr)
  const pool = [...required]

  while (pool.length < opts.length) {
    pool.push(chars[arr[pool.length % arr.length] % chars.length])
  }

  return pool.sort(() => Math.random() - 0.5).join('').slice(0, opts.length)
}

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4
  label: string
  color: string
  percent: number
}

export function checkStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: 'Vazia', color: '#64748b', percent: 0 }

  let score = 0
  if (password.length >= 12) score++
  if (password.length >= 16) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  score = Math.min(4, score) as 0 | 1 | 2 | 3 | 4

  const map: Record<number, Omit<PasswordStrength, 'score'>> = {
    0: { label: 'Muito fraca', color: '#ef4444', percent: 10 },
    1: { label: 'Fraca',       color: '#f97316', percent: 25 },
    2: { label: 'Regular',     color: '#f59e0b', percent: 50 },
    3: { label: 'Boa',         color: '#22c55e', percent: 75 },
    4: { label: 'Excelente',   color: '#00C47D', percent: 100 },
  }

  return { score: score as PasswordStrength['score'], ...map[score] }
}
