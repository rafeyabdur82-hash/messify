import { useEffect, useRef, useState } from 'react'

// Wraps children and adds the 'in-view' class once scrolled into viewport,
// triggering the .reveal CSS transition defined in styles/tailwind.css.
export default function Reveal({ children, delay = 0, className = '', as: Tag = 'div', ...props }) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setInView(true)
            io.unobserve(el)
          }
        })
      },
      { threshold: 0.15 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const delayClass = delay ? `reveal-delay-${delay}` : ''

  return (
    <Tag ref={ref} className={`reveal ${delayClass} ${inView ? 'in-view' : ''} ${className}`} {...props}>
      {children}
    </Tag>
  )
}
