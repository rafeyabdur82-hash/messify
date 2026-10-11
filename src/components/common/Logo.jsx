// The Messify emblem (public/logo.png — round, transparent corners).
// `ring` adds a cream disc + gold ring so it stays readable on dark green headers.
export default function Logo({ className = 'w-11 h-11', ring = true, ...rest }) {
  return (
    <img
      src="/logo.png"
      alt="Messify"
      width="512"
      height="512"
      className={`rounded-full shrink-0 object-cover ${ring ? 'bg-brand-cream ring-2 ring-brand-gold/70' : ''} ${className}`}
      {...rest}
    />
  )
}
