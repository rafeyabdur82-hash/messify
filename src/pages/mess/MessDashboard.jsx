import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import MessPage from '../../components/common/MessPage.jsx'
import Icon from '../../components/common/Icon.jsx'
import { formatINR } from '../../constants.js'
import { respondToCustomRequest, ensureMessProfile, listenMessPayments, approvePayment, listenWhere, listenMenu } from '../../firebase/firestore.js'

const todayStr = () => new Date().toISOString().slice(0, 10)

function StatCard({ label, icon, children, foot, tone = 'bg-surface-container' }) {
  return (
    <div className={`${tone} rounded-2xl p-space-md flex flex-col gap-space-xs shadow-sm`}>
      <div className="flex items-start justify-between">
        <span className="font-label-xs text-label-xs uppercase tracking-wider text-on-surface-variant">{label}</span>
        <span className="w-9 h-9 rounded-lg bg-surface-container-high grid place-items-center text-primary"><Icon name={icon} className="text-lg" /></span>
      </div>
      <div className="font-headline-md text-headline-md text-on-surface mt-space-xs">{children}</div>
      <div className="font-body-sm text-body-sm text-on-surface-variant">{foot}</div>
    </div>
  )
}

function MealSlot({ title, window, status, menu, portions, price, tone }) {
  return (
    <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-space-xs">
      <div className="flex items-center justify-between gap-2">
        <span className={`px-2 py-0.5 rounded font-label-xs text-label-xs ${tone}`}>{title} ({window})</span>
        <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-primary font-label-xs text-label-xs">{status}</span>
      </div>
      <h4 className="font-headline-sm text-headline-sm text-on-surface">{menu?.items ? menu.items.split(',')[0] : 'Menu not set'}</h4>
      <p className="font-body-sm text-body-sm text-on-surface-variant min-h-[40px]">{menu?.items || 'Add today\'s menu so students can see it.'}</p>
      <p className="flex items-center gap-1 font-body-sm text-body-sm text-on-surface"><Icon name="room_service" className="text-base" />{portions} portions to prepare</p>
      <div className="flex items-end justify-between mt-space-xs">
        <span className="font-headline-sm text-headline-sm text-secondary">{menu?.price ? formatINR(menu.price) : '—'}<span className="font-body-sm text-body-sm text-on-surface-variant"> / thali</span></span>
        <Link to="/mess/menu" className="flex items-center gap-1 font-label-md text-label-md text-on-surface hover:text-secondary">Manage Dish <Icon name="edit" className="text-base" /></Link>
      </div>
    </div>
  )
}

export default function MessDashboard() {
  const { profile, currentUser } = useAuth()
  const [menu, setMenu] = useState(null)
  const [subCount, setSubCount] = useState(0)
  const [skips, setSkips] = useState([])
  const [requests, setRequests] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    if (!currentUser) return
    return listenMessPayments(currentUser.uid, setPayments)
  }, [currentUser])

  // Everything on this page is a live Firestore listener, so numbers update the moment students order, skip or pay.
  useEffect(() => {
    if (!currentUser) return undefined
    const uid = currentUser.uid
    const onErr = (err) => setError(err.code === 'permission-denied' ? 'Database access denied. Publish firestore.rules in Firebase console.' : 'Live data connection problem. Check your connection.')
    // Auto-repair: make sure this owner has a public listing so students can find them.
    ensureMessProfile(uid, profile).catch(() => {})
    let ready = 0
    const markReady = () => { ready += 1; if (ready >= 4) setLoading(false) }
    const once = (fn) => { let done = false; return (v) => { fn(v); if (!done) { done = true; markReady() } } }
    const unsubs = [
      listenMenu(uid, todayStr(), once(setMenu)),
      listenWhere('subscriptions', [['messId', uid], ['status', 'active']], once((subs) => setSubCount(subs.length)), onErr),
      listenWhere('skips', [['messId', uid], ['date', todayStr()]], once(setSkips), onErr),
      listenWhere('customRequests', [['messId', uid], ['status', 'pending']], once(setRequests), onErr),
    ]
    const t = setTimeout(() => setLoading(false), 6000)
    return () => { unsubs.forEach((u) => u()); clearTimeout(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid])

  async function handleRequest(id, status) {
    await respondToCustomRequest(id, status)
  }
  async function handleApprove(p) {
    setBusyId(p.id)
    try { await approvePayment(p) } finally { setBusyId(null) }
  }

  if (loading) return <MessPage><div className="flex justify-center py-24"><Icon name="progress_activity" className="text-4xl text-primary animate-spin" /></div></MessPage>

  const lunchSkips = skips.filter((s) => s.meal === 'lunch').length
  const dinnerSkips = skips.filter((s) => s.meal === 'dinner').length
  const lunchPortions = Math.max(subCount - lunchSkips, 0)
  const dinnerPortions = Math.max(subCount - dinnerSkips, 0)
  const pending = payments.filter((p) => p.status === 'pending')
  const approved = payments.filter((p) => p.status === 'approved')
  const monthKey = new Date().toISOString().slice(0, 7)
  const monthRevenue = approved
    .filter((p) => (p.createdAt?.toDate ? p.createdAt.toDate().toISOString().slice(0, 7) : monthKey) === monthKey)
    .reduce((sum, p) => sum + (p.messEarning || 0), 0)
  const totalEarnings = approved.reduce((sum, p) => sum + (p.messEarning || 0), 0)
  const pendingAmount = pending.reduce((sum, p) => sum + (p.amount || 0), 0)
  const owner = profile?.name?.split(' ')[0] || 'Chef'
  const dateLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })
  const actionItems = pending.length + requests.length

  return (
    <MessPage>
      {error && <div className="bg-error-container text-on-error-container rounded-xl p-space-sm flex items-center gap-2" role="alert"><Icon name="error" className="text-error" />{error}</div>}

      {/* Greeting banner */}
      <section className="rounded-2xl bg-primary-container text-surface-bright p-space-lg shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div className="min-w-0">
          <h2 className="font-headline-lg text-headline-lg text-tertiary-fixed-dim">Namaste, {owner}! <span aria-hidden>👋</span></h2>
          <p className="font-body-md text-body-md text-on-primary-container mt-1 max-w-xl">
            Here is what's cooking at <strong className="text-surface-bright">{profile?.messName || 'your mess'}</strong> today.
            {subCount > 0 ? ` ${subCount} active subscriber${subCount === 1 ? '' : 's'} are expecting meals.` : ' Share your mess so students can subscribe.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-space-sm">
          <Link to="/mess/menu" className="px-space-md py-space-sm rounded-xl bg-secondary-container text-on-secondary-container font-label-lg text-label-lg flex items-center gap-2 shadow-md hover:brightness-105 transition">
            <Icon name="add_circle" /> Add / Update Meal
          </Link>
          <Link to="/mess/orders" className="px-space-md py-space-sm rounded-xl bg-primary text-surface-bright font-label-lg text-label-lg flex items-center gap-2 hover:bg-primary-fixed-dim hover:text-primary transition">
            <Icon name="receipt_long" /> View Orders
          </Link>
        </div>
      </section>

      {/* Stat cards */}
      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
        <StatCard label="Today's orders" icon="room_service" foot={`${lunchPortions} Lunch • ${dinnerPortions} Dinner`}>
          {Math.max(lunchPortions, dinnerPortions) ? lunchPortions + dinnerPortions : 0} <span className="font-body-lg text-body-lg text-on-surface-variant">Thalis</span>
        </StatCard>
        <StatCard label="Active subscribers" icon="group" foot={`${lunchSkips + dinnerSkips} meal skip${lunchSkips + dinnerSkips === 1 ? '' : 's'} today`}>
          {subCount} <span className="font-body-lg text-body-lg text-on-surface-variant">Students</span>
        </StatCard>
        <StatCard label="Pending UPI verify" icon="pending_actions" tone="bg-surface-container-lowest" foot={<>{formatINR(pendingAmount)} pending check {pending.length > 0 && <Link to="/mess/payments" className="text-secondary font-semibold ml-1">Review →</Link>}</>}>
          {pending.length} <span className="font-body-lg text-body-lg text-on-surface-variant">Receipts</span>
        </StatCard>
        <StatCard label="Monthly revenue" icon="currency_rupee" foot={`Total earned: ${formatINR(totalEarnings)} • 3% platform fee`}>
          {formatINR(monthRevenue)}
        </StatCard>
      </section>

      <div className="grid xl:grid-cols-3 gap-space-md items-start">
        {/* Kitchen schedule */}
        <section className="xl:col-span-2 bg-surface-container rounded-2xl p-space-md md:p-space-lg shadow-sm">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-space-md">
            <h3 className="font-headline-md text-headline-md text-primary flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-secondary-container" />Today's Kitchen Schedule</h3>
            <span className="px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-md text-label-md">{dateLabel}</span>
          </div>
          <div className="grid md:grid-cols-2 gap-space-md">
            <MealSlot title="LUNCH SLOT" window="12:00 – 2:00 PM" status={menu?.lunch?.items ? 'Menu set' : 'Needs menu'} menu={menu?.lunch} portions={lunchPortions} tone="bg-tertiary-fixed text-tertiary" />
            <MealSlot title="DINNER SLOT" window="7:30 – 9:30 PM" status={menu?.dinner?.items ? 'Menu set' : 'Needs menu'} menu={menu?.dinner} portions={dinnerPortions} tone="bg-primary-fixed text-primary" />
          </div>
        </section>

        {/* Needs attention */}
        <aside className="bg-surface-container rounded-2xl p-space-md md:p-space-lg shadow-sm flex flex-col gap-space-sm">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-headline-md text-headline-md text-primary flex items-center gap-2"><Icon name="notifications_active" className="text-secondary" />Needs Attention</h3>
            <span className="px-2 py-0.5 rounded-full bg-tertiary-fixed text-tertiary font-label-xs text-label-xs whitespace-nowrap">{actionItems} action item{actionItems === 1 ? '' : 's'}</span>
          </div>
          {actionItems === 0 && <p className="font-body-sm text-body-sm text-on-surface-variant">All caught up — no payments or requests waiting.</p>}

          {pending.slice(0, 3).map((p) => (
            <div key={p.id} className="bg-surface-container-lowest rounded-xl p-space-sm flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-label-lg text-label-lg text-on-surface truncate">{p.payerName || 'Student'}</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant truncate">{p.plan} • {formatINR(p.amount)}</p>
              </div>
              <button type="button" disabled={busyId === p.id} onClick={() => handleApprove(p)} className="px-3 py-1.5 rounded-lg bg-primary-fixed text-primary font-label-md text-label-md hover:bg-primary hover:text-on-primary transition disabled:opacity-60">
                {busyId === p.id ? '...' : 'Approve'}
              </button>
            </div>
          ))}

          {requests.slice(0, 3).map((r) => (
            <div key={r.id} className="bg-surface-container-lowest rounded-xl p-space-sm flex flex-col gap-2">
              <div>
                <span className="px-2 py-0.5 rounded bg-tertiary-fixed text-tertiary font-label-xs text-label-xs capitalize">Custom • {r.meal}</span>
                <p className="font-body-sm text-body-sm text-on-surface mt-1">{r.requestText}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => handleRequest(r.id, 'accepted')} className="px-3 py-1.5 rounded-lg bg-primary-fixed text-primary font-label-md text-label-md hover:bg-primary hover:text-on-primary transition">Accept</button>
                <button type="button" onClick={() => handleRequest(r.id, 'rejected')} className="px-3 py-1.5 rounded-lg bg-surface-container-high text-on-surface-variant font-label-md text-label-md hover:bg-error-container transition">Reject</button>
              </div>
            </div>
          ))}

          <Link to="/mess/payments" className="mt-space-xs w-full py-3 rounded-xl bg-secondary-container text-on-secondary-container font-label-lg text-label-lg text-center flex items-center justify-center gap-2 shadow-md hover:brightness-105 transition">
            Review All Payments ({pending.length}) <Icon name="arrow_forward" />
          </Link>
        </aside>
      </div>
    </MessPage>
  )
}
