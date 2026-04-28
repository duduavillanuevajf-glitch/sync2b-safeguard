interface LogoProps {
  className?: string
  white?: boolean
}

export function Logo({ className, white }: LogoProps) {
  if (white) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        aria-label="Sync2B Safeguard"
      >
        <path
          d="M12 3L4 7v5c0 5.5 3.5 10.7 8 12.5C16.5 22.7 20 17.5 20 12V7L12 3z"
          fill="rgba(255,255,255,0.2)"
          stroke="white"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M9.5 11V9.5a2.5 2.5 0 0 1 5 0V11"
          stroke="white"
          strokeWidth="1.4"
          strokeLinecap="round"
          fill="none"
        />
        <rect x="8" y="11" width="8" height="6" rx="1.5" fill="white" opacity="0.9" />
        <circle cx="12" cy="14" r="1.1" fill="rgba(0,196,125,0.7)" />
      </svg>
    )
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-label="Sync2B Safeguard"
    >
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00C47D" />
          <stop offset="100%" stopColor="#00a3ff" />
        </linearGradient>
      </defs>
      <path
        d="M12 3L4 7v5c0 5.5 3.5 10.7 8 12.5C16.5 22.7 20 17.5 20 12V7L12 3z"
        fill="url(#logo-g)"
      />
      <path
        d="M9.5 11V9.5a2.5 2.5 0 0 1 5 0V11"
        stroke="white"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
      <rect x="8" y="11" width="8" height="6" rx="1.5" fill="white" />
      <circle cx="12" cy="14" r="1.1" fill="#00a3ff" />
    </svg>
  )
}
