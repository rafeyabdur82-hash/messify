// Reusable UI primitives — Tailwind + animation classes throughout.

const VARIANTS = {
  primary: 'btn-glow bg-masala hover:bg-masala-dark text-white shadow-sm hover:shadow-md hover:-translate-y-0.5',
  accent: 'btn-glow bg-haldi hover:brightness-95 text-charcoal shadow-sm',
  outline: 'bg-transparent border-2 border-masala text-masala hover:bg-masala/5',
  ghost: 'bg-transparent text-charcoal hover:bg-charcoal/5',
  danger: 'bg-danger hover:brightness-95 text-white',
}
const SIZES = {
  sm: 'px-4 py-2 text-xs',
  md: 'px-6 py-3 text-sm',
  lg: 'px-8 py-4 text-base',
}

export function Button({ children, variant = 'primary', size = 'md', full, className = '', ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full font-bold transition-all active:scale-[.97] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${VARIANTS[variant]} ${SIZES[size]} ${full ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function Card({ children, className = '', hover = false, ...props }) {
  return (
    <div className={`bg-white border border-sooji rounded-2xl p-5 shadow-sm ${hover ? 'lift cursor-pointer' : ''} ${className}`} {...props}>
      {children}
    </div>
  )
}

const BADGE_TONES = {
  neutral: 'bg-sooji text-charcoal-soft',
  success: 'bg-[#E4F0E6] text-success',
  danger: 'bg-[#F7E3E0] text-danger',
  warn: 'bg-haldi-soft text-[#8A5A0D]',
  info: 'bg-tamarind/10 text-tamarind',
}

export function Badge({ children, tone = 'neutral' }) {
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide animate-popIn ${BADGE_TONES[tone]}`}>
      {children}
    </span>
  )
}

export function Input({ label, error, ...props }) {
  return (
    <label className="flex flex-col gap-2">
      {label && <span className="text-[13px] font-bold text-charcoal-soft">{label}</span>}
      <input
        className={`px-4 py-3 border-[1.5px] rounded-xl text-[15px] bg-white text-charcoal transition-colors focus:outline-none focus:border-tamarind ${error ? 'border-danger' : 'border-sooji'}`}
        {...props}
      />
      {error && <span className="text-xs text-danger">{error}</span>}
    </label>
  )
}

export function Select({ label, children, ...props }) {
  return (
    <label className="flex flex-col gap-2">
      {label && <span className="text-[13px] font-bold text-charcoal-soft">{label}</span>}
      <select className="px-4 py-3 border-[1.5px] border-sooji rounded-xl text-[15px] bg-white text-charcoal focus:outline-none focus:border-tamarind" {...props}>
        {children}
      </select>
    </label>
  )
}

export function Textarea({ label, ...props }) {
  return (
    <label className="flex flex-col gap-2">
      {label && <span className="text-[13px] font-bold text-charcoal-soft">{label}</span>}
      <textarea className="px-4 py-3 border-[1.5px] border-sooji rounded-xl text-[15px] bg-white text-charcoal focus:outline-none focus:border-tamarind resize-y min-h-[80px]" {...props} />
    </label>
  )
}

export function EmptyState({ icon, title, message, action }) {
  return (
    <div className="text-center py-16 px-5 text-charcoal-soft animate-fadeUp">
      {icon && <div className="text-5xl mb-3 animate-float inline-block">{icon}</div>}
      <h3 className="text-charcoal text-xl mb-2">{title}</h3>
      <p className="mb-5">{message}</p>
      {action}
    </div>
  )
}

export function Spinner() {
  return <div className="spinner" role="status" aria-label="Loading" />
}

const TOAST_TONES = {
  success: 'bg-success',
  danger: 'bg-danger',
  info: 'bg-tamarind',
}

export function Toast({ message, tone = 'success', onClose }) {
  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3.5 rounded-full shadow-lg font-semibold text-sm text-white cursor-pointer z-[1000] animate-toastIn ${TOAST_TONES[tone]}`}
      onClick={onClose}
    >
      {message}
    </div>
  )
}
