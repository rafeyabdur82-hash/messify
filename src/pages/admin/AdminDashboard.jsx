import { useEffect, useMemo, useState } from 'react'
import PageLayout from '../../components/common/PageLayout.jsx'
import { Card, Badge, Spinner } from '../../components/common/UI.jsx'
import StatCard from '../../components/common/StatCard.jsx'
import { listenCollection } from '../../firebase/firestore.js'
import { formatINR } from '../../constants.js'

// Every Firestore collection the admin can see. All of them update in realtime.
const COLLECTIONS = ['users', 'messProfiles', 'menus', 'subscriptions', 'payments', 'skips', 'ledger', 'customRequests', 'routes', 'tiffinBoxes', 'notifications', 'messDeliveryPartners']

const tsMillis = (ts) => (ts?.toMillis ? ts.toMillis() : ts?.seconds ? ts.seconds * 1000 : 0)
const fmtTs = (ts) => (tsMillis(ts) ? new Date(tsMillis(ts)).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—')
const PLAN = { weekly: 'Weekly', monthly: 'Monthly', monthly_lunch: 'Monthly (lunch)', both: 'Lunch + Dinner', lunch: 'Lunch', dinner: 'Dinner' }
const TONE = { active: 'success', approved: 'success', delivered: 'success', completed: 'success', accepted: 'success', paid: 'success', with_student: 'success', in_progress: 'info', pending: 'warn', pending_payment: 'warn', not_started: 'neutral', paused: 'warn', cod_pending: 'warn', rejected: 'danger', payment_rejected: 'danger', cancelled: 'danger' }
const label = (v) => String(v ?? '—').replace(/_/g, ' ')
const badge = (v) => ({ badge: label(v), tone: TONE[v] || 'neutral' })

function useLiveData() {
  const [data, setData] = useState({})
  const [errors, setErrors] = useState({})
  const [updatedAt, setUpdatedAt] = useState(null)

  useEffect(() => {
    const unsubs = COLLECTIONS.map((name) => listenCollection(
      name,
      (rows) => { setData((d) => ({ ...d, [name]: rows })); setUpdatedAt(new Date()) },
      (err) => { console.error(`Listening to ${name} failed:`, err); setErrors((e) => ({ ...e, [name]: err.code || err.message })) },
    ))
    return () => unsubs.forEach((u) => u())
  }, [])

  return { data, errors, updatedAt, ready: COLLECTIONS.every((c) => data[c] || errors[c]) }
}

export default function AdminDashboard() {
  const { data, errors, updatedAt, ready } = useLiveData()
  const [tab, setTab] = useState('overview')

  const ctx = useMemo(() => {
    const users = Object.fromEntries((data.users || []).map((u) => [u.id, u]))
    const messes = Object.fromEntries((data.messProfiles || []).map((m) => [m.id, m]))
    return {
      user: (id) => users[id]?.name || (id ? `${id.slice(0, 6)}…` : '—'),
      mess: (id) => messes[id]?.messName || users[id]?.messName || (id ? `${id.slice(0, 6)}…` : '—'),
    }
  }, [data.users, data.messProfiles])

  const tables = useMemo(() => buildTables(ctx), [ctx])
  const errorList = Object.entries(errors)

  if (!ready) return <PageLayout wide><Spinner /></PageLayout>

  const tabs = [{ key: 'overview', label: 'Overview' }, ...tables.map((t) => ({ key: t.key, label: `${t.label} (${(data[t.collection] || []).length})` }))]
  const active = tables.find((t) => t.key === tab)

  return (
    <PageLayout wide title="Admin Reports" subtitle="Every table, updating live"
      actions={<span className="inline-flex items-center gap-2 text-xs font-semibold text-charcoal-soft"><span className="w-2 h-2 rounded-full bg-success animate-pulseDot" />Live · {updatedAt?.toLocaleTimeString('en-IN')}</span>}>
      {errorList.length > 0 && (
        <div role="alert" className="mb-5 text-sm text-danger bg-[#F7E3E0] rounded-xl px-4 py-3">
          Some tables could not be read ({errorList.map(([n, c]) => `${n}: ${c}`).join(', ')}). This account needs role <strong>admin</strong> in Firestore, and the latest <code>firestore.rules</code> must be published.
        </div>
      )}

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${tab === t.key ? 'bg-masala text-white' : 'bg-white border border-sooji text-charcoal-soft hover:bg-sooji'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <Overview data={data} ctx={ctx} />}
      {active && <DataTable key={active.key} table={active} rows={data[active.collection] || []} ctx={ctx} />}
    </PageLayout>
  )
}

/* ---------------- overview ---------------- */
function Overview({ data, ctx }) {
  const users = data.users || [], subs = data.subscriptions || [], pays = data.payments || [], routes = data.routes || []
  const today = new Date().toISOString().slice(0, 10)
  const count = (rows, fn) => rows.filter(fn).length
  const approved = pays.filter((p) => p.status === 'approved')
  const sum = (rows, f) => rows.reduce((t, r) => t + (r[f] || 0), 0)
  const liveRoutes = routes.filter((r) => r.status === 'in_progress')

  const recent = [
    ...pays.map((p) => ({ at: tsMillis(p.createdAt), text: `${p.payerName || ctx.user(p.studentId)} paid ${formatINR(p.amount)} to ${ctx.mess(p.messId)}`, tag: p.status })),
    ...subs.map((s) => ({ at: tsMillis(s.createdAt), text: `${ctx.user(s.studentId)} subscribed to ${ctx.mess(s.messId)} (${PLAN[s.plan] || s.plan})`, tag: s.status })),
    ...routes.map((r) => ({ at: tsMillis(r.createdAt), text: `${r.meal} route · ${ctx.mess(r.messId)} → ${ctx.user(r.deliveryPersonId)}`, tag: r.status })),
    ...(data.customRequests || []).map((r) => ({ at: tsMillis(r.createdAt), text: `${ctx.user(r.studentId)} requested: ${r.requestText}`, tag: r.status })),
  ].sort((a, b) => b.at - a.at).slice(0, 10)

  return (
    <>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        <StatCard icon="👤" label="Total users" value={users.length} color="tamarind" />
        <StatCard icon="🎓" label="Students" value={count(users, (u) => u.role === 'student')} color="tamarind" delay={0.04} />
        <StatCard icon="🍛" label="Mess owners" value={count(users, (u) => u.role === 'mess')} color="haldi" delay={0.08} />
        <StatCard icon="🛵" label="Delivery partners" value={count(users, (u) => u.role === 'delivery')} color="masala" delay={0.12} />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        <StatCard icon="📦" label="Active subscriptions" value={count(subs, (s) => s.status === 'active')} color="success" />
        <StatCard icon="⏳" label="Awaiting payment approval" value={count(pays, (p) => p.status === 'pending')} color="haldi" delay={0.04} />
        <StatCard icon="💵" label="Online revenue (approved)" value={formatINR(sum(approved, 'amount'))} color="success" delay={0.08} />
        <StatCard icon="🏦" label="Platform commission" value={formatINR(sum(approved, 'commission'))} color="masala" delay={0.12} />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-8">
        <StatCard icon="🍽️" label="Mess earnings (after fee)" value={formatINR(sum(approved, 'messEarning'))} color="tamarind" />
        <StatCard icon="💸" label="Cash-on-delivery orders" value={count(subs, (s) => s.paymentMethod === 'cod')} color="haldi" delay={0.04} />
        <StatCard icon="📍" label="Deliveries live now" value={liveRoutes.length} color="success" delay={0.08} />
        <StatCard icon="⏭️" label="Meals skipped today" value={count(data.skips || [], (s) => s.date === today)} color="masala" delay={0.12} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <h3 className="text-base font-bold mb-3">Live deliveries</h3>
          {liveRoutes.length === 0 ? <p className="text-sm text-charcoal-soft">No route is running right now.</p> : liveRoutes.map((r) => (
            <div key={r.id} className="flex justify-between items-center gap-3 py-2.5 border-t border-sooji first:border-t-0 text-sm">
              <div><strong className="capitalize">{r.meal}</strong> · {ctx.mess(r.messId)}<p className="text-xs text-charcoal-soft">{ctx.user(r.deliveryPersonId)} · stop {Math.min(r.currentStopIndex + 1, r.stops?.length || 0)} of {r.stops?.length || 0}</p></div>
              {r.liveLocation
                ? <a className="text-xs font-bold text-masala" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${r.liveLocation.lat}&mlon=${r.liveLocation.lng}#map=16/${r.liveLocation.lat}/${r.liveLocation.lng}`}>View on map ↗</a>
                : <span className="text-xs text-charcoal-soft">no GPS yet</span>}
            </div>
          ))}
        </Card>
        <Card>
          <h3 className="text-base font-bold mb-3">Recent activity</h3>
          {recent.length === 0 ? <p className="text-sm text-charcoal-soft">Nothing yet.</p> : recent.map((a, i) => (
            <div key={i} className="flex justify-between items-start gap-3 py-2.5 border-t border-sooji first:border-t-0 text-sm">
              <div className="min-w-0"><span>{a.text}</span><p className="text-[11px] text-charcoal-soft">{fmtTs({ toMillis: () => a.at })}</p></div>
              <Badge tone={TONE[a.tag] || 'neutral'}>{label(a.tag)}</Badge>
            </div>
          ))}
        </Card>
      </div>
    </>
  )
}

/* ---------------- tables ---------------- */
function buildTables(c) {
  const stops = (r) => `${Math.min(r.currentStopIndex || 0, r.stops?.length || 0)}/${r.stops?.length || 0}`
  const ledgerTotals = (r) => {
    const e = r.entries || []
    const charges = e.filter((x) => x.type === 'charge').reduce((t, x) => t + x.amount, 0)
    const credits = e.filter((x) => x.type === 'skip').reduce((t, x) => t + x.amount, 0)
    return { charges, credits, n: e.length }
  }
  return [
    { key: 'users', label: 'Users', collection: 'users', sort: (r) => r.role + r.name, cols: [
      ['Name', (r) => r.name], ['Role', (r) => badge(r.role)], ['Email', (r) => r.email], ['Phone', (r) => r.phone || '—'],
      ['Area', (r) => r.area || r.messName || '—'], ['Joined', (r) => fmtTs(r.createdAt)]] },
    { key: 'messes', label: 'Messes', collection: 'messProfiles', sort: (r) => r.messName, cols: [
      ['Mess', (r) => r.messName], ['Owner', (r) => c.user(r.ownerId)], ['Area', (r) => r.area], ['Rating', (r) => (r.rating ? `${Number(r.rating).toFixed(1)} ★` : 'New')],
      ['Subscribers', (r) => r.subscriberCount || 0], ['UPI QR', (r) => (r.paymentQrUrl ? 'Uploaded' : 'Missing')]] },
    { key: 'menus', label: 'Menus', collection: 'menus', sort: (r) => r.date, desc: true, cols: [
      ['Date', (r) => r.date], ['Mess', (r) => c.mess(r.messId)], ['Lunch', (r) => (r.lunch ? `${r.lunch.items} · ₹${r.lunch.price}` : '—')], ['Dinner', (r) => (r.dinner ? `${r.dinner.items} · ₹${r.dinner.price}` : '—')]] },
    { key: 'orders', label: 'Orders', collection: 'subscriptions', sort: (r) => tsMillis(r.createdAt), desc: true, cols: [
      ['Student', (r) => c.user(r.studentId)], ['Mess', (r) => c.mess(r.messId)], ['Plan', (r) => PLAN[r.plan] || r.plan], ['Status', (r) => badge(r.status)],
      ['Payment', (r) => (r.paymentMethod === 'cod' ? 'Cash on delivery' : r.paymentMethod === 'upi_qr' ? 'UPI QR' : '—')], ['Amount', (r) => (r.amount ? formatINR(r.amount) : '—')],
      ['Deliver to', (r) => r.deliveryAddress || '—'], ['Started', (r) => r.startDate || '—']] },
    { key: 'payments', label: 'Payments', collection: 'payments', sort: (r) => tsMillis(r.createdAt), desc: true, cols: [
      ['Date', (r) => fmtTs(r.createdAt)], ['Student', (r) => r.payerName || c.user(r.studentId)], ['Mess', (r) => c.mess(r.messId)], ['Plan', (r) => PLAN[r.plan] || r.plan],
      ['Amount', (r) => formatINR(r.amount)], ['Fee', (r) => formatINR(r.commission)], ['Mess gets', (r) => formatINR(r.messEarning)], ['UTR', (r) => r.utrNumber], ['Status', (r) => badge(r.status)]] },
    { key: 'deliveries', label: 'Deliveries', collection: 'routes', sort: (r) => tsMillis(r.createdAt), desc: true, cols: [
      ['Date', (r) => r.date], ['Meal', (r) => r.meal], ['Mess', (r) => c.mess(r.messId)], ['Partner', (r) => c.user(r.deliveryPersonId)], ['Status', (r) => badge(r.status)],
      ['Stops done', stops], ['GPS', (r) => (r.liveLocation ? `${r.liveLocation.lat.toFixed(4)}, ${r.liveLocation.lng.toFixed(4)} · ${fmtTs(r.liveLocation.updatedAt)}` : '—')]] },
    { key: 'skips', label: 'Skips', collection: 'skips', sort: (r) => r.date, desc: true, cols: [
      ['Date', (r) => r.date], ['Student', (r) => c.user(r.studentId)], ['Mess', (r) => c.mess(r.messId)], ['Meal', (r) => r.meal]] },
    { key: 'requests', label: 'Requests', collection: 'customRequests', sort: (r) => tsMillis(r.createdAt), desc: true, cols: [
      ['Date', (r) => r.date], ['Student', (r) => c.user(r.studentId)], ['Mess', (r) => c.mess(r.messId)], ['Meal', (r) => r.meal], ['Request', (r) => r.requestText], ['Status', (r) => badge(r.status)]] },
    { key: 'ledger', label: 'Ledger', collection: 'ledger', sort: (r) => r.month, desc: true, cols: [
      ['Month', (r) => r.month], ['Student', (r) => c.user(r.studentId)], ['Mess', (r) => c.mess(r.messId)], ['Entries', (r) => ledgerTotals(r).n],
      ['Meals charged', (r) => formatINR(ledgerTotals(r).charges)], ['Skip credits', (r) => formatINR(ledgerTotals(r).credits)], ['Balance', (r) => formatINR(ledgerTotals(r).charges - ledgerTotals(r).credits)]] },
    { key: 'boxes', label: 'Tiffin Boxes', collection: 'tiffinBoxes', sort: (r) => tsMillis(r.lastScannedAt), desc: true, cols: [
      ['Box', (r) => (r.qrId || r.id).slice(0, 10)], ['Student', (r) => c.user(r.studentId)], ['Mess', (r) => c.mess(r.messId)], ['Status', (r) => badge(r.status)], ['Scanned by', (r) => c.user(r.scannedBy)], ['Last scan', (r) => fmtTs(r.lastScannedAt)]] },
    { key: 'notifications', label: 'Notifications', collection: 'notifications', sort: (r) => tsMillis(r.createdAt), desc: true, cols: [
      ['When', (r) => fmtTs(r.createdAt)], ['To', (r) => c.user(r.userId)], ['Title', (r) => r.title], ['Message', (r) => r.message], ['Type', (r) => r.type], ['Read', (r) => (r.read ? 'Yes' : 'No')]] },
    { key: 'links', label: 'Partner Links', collection: 'messDeliveryPartners', sort: (r) => tsMillis(r.linkedAt), desc: true, cols: [
      ['Mess', (r) => c.mess(r.messId)], ['Partner', (r) => r.name || c.user(r.partnerId)], ['Email', (r) => r.email], ['Phone', (r) => r.phone || '—'], ['Linked', (r) => fmtTs(r.linkedAt)]] },
  ]
}

const plain = (v) => (v && typeof v === 'object' && 'badge' in v ? v.badge : String(v ?? ''))

function DataTable({ table, rows, ctx }) {
  const [query, setQuery] = useState('')
  const view = useMemo(() => {
    const sorted = [...rows].sort((a, b) => {
      const x = table.sort(a), y = table.sort(b)
      const r = x > y ? 1 : x < y ? -1 : 0
      return table.desc ? -r : r
    })
    const q = query.trim().toLowerCase()
    return q ? sorted.filter((r) => table.cols.some(([, f]) => plain(f(r)).toLowerCase().includes(q))) : sorted
  }, [rows, query, table, ctx])

  function exportCsv() {
    const esc = (v) => `"${plain(v).replace(/"/g, '""')}"`
    const csv = [table.cols.map(([h]) => esc(h)).join(','), ...view.map((r) => table.cols.map(([, f]) => esc(f(r))).join(','))].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    a.download = `messify-${table.key}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <Card className="!p-0 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-sooji">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${table.label.toLowerCase()}…`} aria-label="Search"
          className="w-full sm:w-72 border border-sooji rounded-full px-4 py-2 text-sm bg-dahi focus:outline-none focus:border-masala" />
        <div className="flex items-center gap-3 text-xs text-charcoal-soft">
          <span>{view.length} row{view.length === 1 ? '' : 's'}</span>
          <button onClick={exportCsv} disabled={!view.length} className="px-4 py-2 rounded-full bg-masala text-white font-bold disabled:opacity-40">Export CSV</button>
        </div>
      </div>
      {view.length === 0 ? (
        <p className="p-8 text-center text-sm text-charcoal-soft">{rows.length === 0 ? 'No records in this table yet.' : 'No rows match your search.'}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-charcoal-soft bg-dahi">
                {table.cols.map(([h]) => <th key={h} className="text-left px-4 py-3 whitespace-nowrap font-bold">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {view.map((r) => (
                <tr key={r.id} className="border-t border-sooji hover:bg-dahi/60">
                  {table.cols.map(([h, f]) => {
                    const v = f(r)
                    return <td key={h} className="px-4 py-3 align-top">{v && typeof v === 'object' && 'badge' in v ? <Badge tone={v.tone}>{v.badge}</Badge> : String(v ?? '')}</td>
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
