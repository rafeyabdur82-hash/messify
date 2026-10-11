import { useEffect, useRef, useState } from 'react'

// Header pill showing the browser-detected location (see utils/location.js).
// The full address is shown; when it is longer than the pill it scrolls
// continuously (marquee). Clicking re-runs detection.
const PinIcon = () => (
  <svg className="w-3.5 h-3.5 text-brand-saffron shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
    <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const TEXT = {
  idle: 'Detect my location',
  detecting: 'Detecting location…',
  denied: 'Location blocked · tap to retry',
  unsupported: 'Location unavailable',
  error: 'Could not detect · tap to retry',
}

export default function LocationPill({ location, status, onDetect }) {
  const label = status === 'ready' && location ? (location.full || location.label).replace(/,\s*India$/, '') : TEXT[status] || TEXT.idle
  const boxRef = useRef(null)
  const textRef = useRef(null)
  const [overflowing, setOverflowing] = useState(false)

  // Measure the single (non-duplicated) text to decide whether it needs to scroll.
  useEffect(() => {
    const measure = () => {
      if (boxRef.current && textRef.current) setOverflowing(textRef.current.scrollWidth > boxRef.current.clientWidth + 1)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [label])

  const seconds = Math.max(10, Math.round(label.length * 0.28))

  return (
    <button
      type="button"
      onClick={onDetect}
      disabled={status === 'detecting' || status === 'unsupported'}
      title={label}
      className="flex items-center gap-1.5 bg-brand-forestDark px-3 py-1.5 rounded-full border border-brand-gold/40 text-xs shadow-inner text-brand-gold font-semibold hover:border-brand-gold transition-colors disabled:cursor-default max-w-[200px] sm:max-w-[320px] min-w-0"
    >
      <PinIcon />
      <span ref={boxRef} className="overflow-hidden whitespace-nowrap min-w-0 w-[120px] sm:w-[240px]">
        {overflowing ? (
          <span className="inline-flex" style={{ animation: `locationScroll ${seconds}s linear infinite` }}>
            <span className="pr-10">{label}</span>
            <span className="pr-10" aria-hidden="true">{label}</span>
          </span>
        ) : (
          <span ref={textRef} className={`inline-block ${status === 'detecting' ? 'animate-pulse' : ''}`}>{label}</span>
        )}
        {/* hidden probe keeps the natural width available once the marquee is running */}
        {overflowing && <span ref={textRef} className="absolute invisible whitespace-nowrap" aria-hidden="true">{label}</span>}
      </span>
    </button>
  )
}
