// A stat card with a colored icon chip — used across Admin, Mess, and
// Student dashboards so key numbers don't all look like flat identical boxes.
const COLOR_MAP = {
  masala: { bg: 'bg-masala/10', text: 'text-masala' },
  tamarind: { bg: 'bg-tamarind/10', text: 'text-tamarind' },
  haldi: { bg: 'bg-haldi/20', text: 'text-[#8A5A0D]' },
  success: { bg: 'bg-success/10', text: 'text-success' },
}

export default function StatCard({ icon, label, value, color = 'masala', delay = 0 }) {
  const c = COLOR_MAP[color] || COLOR_MAP.masala
  return (
    <div className="bg-white border border-sooji rounded-2xl p-5 shadow-sm flex items-center gap-4 animate-fadeUp" style={{ animationDelay: `${delay}s` }}>
      {icon && (
        <div className={`w-11 h-11 rounded-xl grid place-items-center text-xl flex-shrink-0 ${c.bg}`}>
          <span className={c.text}>{icon}</span>
        </div>
      )}
      <div className="min-w-0">
        <div className="text-xs text-charcoal-soft font-semibold truncate">{label}</div>
        <div className={`font-mono text-2xl font-bold truncate ${c.text}`}>{value}</div>
      </div>
    </div>
  )
}
