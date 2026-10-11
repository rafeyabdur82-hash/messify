import Navbar from './Navbar.jsx'

export default function PageLayout({ title, subtitle, actions, wide = false, children }) {
  return (
    <div className="min-h-screen bg-dahi relative overflow-x-hidden">
      <div className="pointer-events-none fixed top-0 left-0 w-96 h-96 bg-haldi-soft/25 rounded-full blur-3xl -z-10" />
      <div className="pointer-events-none fixed bottom-0 right-0 w-[420px] h-[420px] bg-tamarind-light/10 rounded-full blur-3xl -z-10" />
      <Navbar />
      <main className={`${wide ? 'max-w-7xl' : 'max-w-5xl'} mx-auto px-5 py-7 pb-16`}>
        {(title || actions) && (
          <div className="flex justify-between items-end gap-4 flex-wrap mb-7 animate-fadeUp">
            <div>
              {title && <h1 className="text-2xl md:text-[32px]">{title}</h1>}
              {subtitle && <p className="text-charcoal-soft text-sm mt-2">{subtitle}</p>}
            </div>
            {actions && <div className="flex gap-3">{actions}</div>}
          </div>
        )}
        {children}
      </main>
    </div>
  )
}
