interface LogoProps {
  className?: string
  white?: boolean
}

export function Logo({ className, white }: LogoProps) {
  return (
    <img
      src="/sync2logo.png"
      alt="Sync2B Safeguard"
      className={className}
      style={white ? { filter: 'brightness(0) invert(1)' } : undefined}
      draggable={false}
    />
  )
}
