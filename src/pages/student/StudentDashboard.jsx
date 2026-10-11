import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import { QRCodeCanvas } from 'qrcode.react'
import { useAuth } from '../../context/AuthContext.jsx'
import StudentLayout from '../../components/common/StudentLayout.jsx'
import Icon from '../../components/common/Icon.jsx'
import {
  getStudentSubscriptions, skipMeal, getSkipsForDate, getAllMessProfiles,
  getStudentRouteForDate, listenRoute, getUserProfile, addLedgerEntry, getBoxStatus,
  getStudentCustomRequests, createCustomOrderRequest, createNotification, listenWhere, listenMenu,
} from '../../firebase/firestore.js'
import { resolveMessProfile, resolveMessMenu, planIncludesMeal } from '../../utils/messResolver.js'
import { generateMealSuggestion } from '../../utils/aiSuggestion.js'
import { formatINR } from '../../constants.js'

const todayStr = () => new Date().toISOString().slice(0, 10)

const PLAN_LABEL = {
  weekly: 'Weekly Trial Pass',
  monthly: 'Monthly Full Pass',
  monthly_lunch: 'Monthly Lunch Booklet',
  both: 'Lunch & Dinner',
  lunch: 'Lunch Only',
  dinner: 'Dinner Only',
}
const PLAN_DAYS = { weekly: 7, monthly: 30, monthly_lunch: 30 }

const STATUS_PILL = {
  active: { label: 'Active', cls: 'bg-secondary-container text-on-primary' },
  pending_payment: { label: 'Awaiting Approval', cls: 'bg-tertiary-fixed-dim text-tertiary' },
  payment_rejected: { label: 'Payment Rejected', cls: 'bg-error-container text-on-error-container' },
  paused: { label: 'Paused', cls: 'bg-surface-container-highest text-primary' },
}

const MEAL = {
  lunch: {
    label: 'Lunch Thali', window: '12:30 PM - 2:00 PM', badge: 'bg-surface-tint text-on-primary',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAcwNeteRGs75Cb9Bs_HItGIomPU6U0-4dXDDT7nk-M6KNLum3WrRxBNt75pUPX_b-uS6T9b22i846YjbNw9MTjaOe5J7VoiTBzvEkWzKwxmhVWZWuStrKTu2kMKpeTyVJd7QIWjyK-xL3tsLB9ey-dqG451_MHonWnSPvSlzWa2N4Q5xbQBYRHsotDTNqdmcuZfcpBKbmN26s8REQwE3en07JQx7l138xOjpHTNmA',
  },
  dinner: {
    label: 'Dinner Thali', window: '7:45 PM - 9:30 PM', badge: 'bg-primary text-on-primary',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCgkSU781NX2PxNn9fMHvc9wGm4A5Gs3LtnKxId6bVJUZKbZWLmLv79nNvaa9b_l0_Gx4JiPr1Fo1J5CfstYtaIiBcvm6lpnQQBh5olSAbJW9fucROsf0V-GhvxFpDKVT7KHrKpqosSFDxTF_S4_IMeR3otFKXL2DA2nEMxUyo1avmUAryfshWTzhyvaWLxyiXlsIYZOs4cFWHDEaHjfxWy7hFC_jMRBEofzpyhoBc',
  },
}

const TRACK_STEPS = [
  { label: 'Preparing', icon: 'soup_kitchen' },
  { label: 'On the Way', icon: 'local_shipping' },
  { label: 'Arriving', icon: 'meeting_room' },
  { label: 'Delivered', icon: 'check' },
]

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

// Validity of a fixed-length plan (weekly / monthly) counted from its start date.
function planValidity(sub) {
  const days = PLAN_DAYS[sub.plan]
  if (!days || !sub.startDate) return null
  const start = parseISO(sub.startDate)
  const end = addDays(start, days)
  const remaining = Math.max(0, Math.min(days, differenceInCalendarDays(end, new Date())))
  return { days, remaining, validTill: format(end, 'd MMM yyyy') }
}

function trackingState(route) {
  if (!route) return { active: -1, stopsAway: 0 }
  const { currentStopIndex = 0, stopIndex, status } = route
  if (currentStopIndex > stopIndex) return { active: 3, stopsAway: 0 }
  if (currentStopIndex === stopIndex && status === 'in_progress') return { active: 2, stopsAway: 0 }
  if (status === 'in_progress') return { active: 1, stopsAway: stopIndex - currentStopIndex }
  return { active: 0, stopsAway: stopIndex - currentStopIndex }
}

export default function StudentDashboard() {
  const { profile, currentUser } = useAuth()
  const navigate = useNavigate()
  const [subs, setSubs] = useState([])
  const [menus, setMenus] = useState({})
  const [messes, setMesses] = useState({})
  const [todaySkips, setTodaySkips] = useState([])
  const [recommended, setRecommended] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [route, setRoute] = useState(null)
  const [rider, setRider] = useState(null)
  const [skipping, setSkipping] = useState('')
  const [requests, setRequests] = useState([])
  const [reqMeal, setReqMeal] = useState('lunch')
  const [reqText, setReqText] = useState('')
  const [reqBusy, setReqBusy] = useState(false)
  const [box, setBox] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const firstName = profile?.name?.split(' ')[0] || 'there'

  useEffect(() => {
    async function load() {
      try {
        const subscriptions = await getStudentSubscriptions(currentUser.uid)
        const relevant = subscriptions.filter((s) => s.status !== 'cancelled')
        setSubs(relevant)
        const active = relevant.find((s) => s.status === 'active') || relevant[0]
        setSelectedId(active?.id || null)

        const menuMap = {}, messMap = {}
        await Promise.all(relevant.map(async (s) => {
          const [menu, mess] = await Promise.all([resolveMessMenu(s.messId, todayStr()), resolveMessProfile(s.messId)])
          menuMap[s.messId] = menu
          messMap[s.messId] = mess
        }))
        setMenus(menuMap)
        setMesses(messMap)
        setTodaySkips(await getSkipsForDate(currentUser.uid, todayStr()))
        getStudentCustomRequests(currentUser.uid).then((r) => setRequests(r.slice(0, 5))).catch(() => {})

        // Recommendations: highest-rated messes the student isn't subscribed to,
        // boosted when they're in the student's own area.
        const subscribedIds = new Set(subscriptions.map((s) => s.messId))
        const realMesses = await getAllMessProfiles()
        const pool = realMesses.filter((m) => !subscribedIds.has(m.id))
        const studentArea = (profile?.area || '').toLowerCase()
        const scored = pool.map((m) => ({
          ...m,
          score: (m.rating || 0) + (studentArea && m.area?.toLowerCase().includes(studentArea.split(',')[0]) ? 1 : 0),
        }))
        scored.sort((a, b) => b.score - a.score)
        setRecommended(scored.slice(0, 3))
      } catch (err) {
        console.error('Dashboard load failed:', err)
        setError('We could not load your dashboard. Check your connection, and that the Firestore rules are published.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [currentUser])

  // ---- realtime layer: keep subscriptions, skips, requests and today's menus live ----
  useEffect(() => {
    const uid = currentUser.uid
    const unsubs = [
      listenWhere('subscriptions', [['studentId', uid]], (all) => {
        const relevant = all.filter((s) => s.status !== 'cancelled')
        setSubs(relevant)
        setSelectedId((cur) => (relevant.some((s) => s.id === cur) ? cur : (relevant.find((s) => s.status === 'active') || relevant[0])?.id || null))
      }),
      listenWhere('skips', [['studentId', uid]], (all) => setTodaySkips(all.filter((k) => k.date === todayStr()))),
      listenWhere('customRequests', [['studentId', uid]], (all) =>
        setRequests([...all].sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)).slice(0, 5))),
    ]
    return () => unsubs.forEach((u) => u())
  }, [currentUser.uid])

  const messIdsKey = [...new Set(subs.map((s) => s.messId).filter((id) => !id.startsWith('dummy-')))].sort().join(',')
  useEffect(() => {
    const ids = messIdsKey ? messIdsKey.split(',') : []
    const unsubs = ids.map((id) => listenMenu(id, todayStr(), (menu) => setMenus((prev) => ({ ...prev, [id]: menu }))))
    resolveMissingMesses(ids)
    return () => unsubs.forEach((u) => u())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messIdsKey])

  async function resolveMissingMesses(ids) {
    const missing = ids.filter((id) => !messes[id])
    if (!missing.length) return
    const found = await Promise.all(missing.map((id) => resolveMessProfile(id).catch(() => null)))
    setMesses((prev) => ({ ...prev, ...Object.fromEntries(missing.map((id, i) => [id, found[i]])) }))
  }

  const selected = useMemo(() => subs.find((s) => s.id === selectedId) || null, [subs, selectedId])

  // Find today's delivery route for the selected subscription and keep it live.
  useEffect(() => {
    setRoute(null)
    setRider(null)
    if (!selected || selected.status !== 'active' || selected.messId.startsWith('dummy-')) return undefined
    let unsub = () => {}
    let cancelled = false
    getStudentRouteForDate(selected.messId, todayStr(), currentUser.uid)
      .then((found) => {
        if (cancelled || !found) return
        setRoute(found)
        unsub = listenRoute(found.id, (data) => data && setRoute((prev) => ({ ...data, stopIndex: prev?.stopIndex ?? found.stopIndex })))
        if (found.deliveryPersonId) getUserProfile(found.deliveryPersonId).then((p) => !cancelled && setRider(p)).catch(() => {})
      })
      .catch((err) => console.error('Route lookup failed:', err))
    return () => { cancelled = true; unsub() }
  }, [selected?.id, selected?.status, currentUser.uid])

  useEffect(() => {
    setBox(null)
    if (selected?.status === 'active') getBoxStatus(selected.id).then(setBox).catch(() => {})
  }, [selected?.id, selected?.status])

  async function handleCustomRequest(e) {
    e.preventDefault()
    if (!selected || !reqText.trim()) return
    setReqBusy(true)
    try {
      await createCustomOrderRequest(currentUser.uid, selected.messId, todayStr(), reqMeal, reqText.trim())
      createNotification(selected.messId, {
        title: 'New custom request',
        message: `${profile?.name || 'A student'} asked for: "${reqText.trim().slice(0, 80)}" (${reqMeal}).`,
        type: 'custom_request', link: '/mess',
      }).catch(() => {})
      setReqText('')
      setRequests((await getStudentCustomRequests(currentUser.uid)).slice(0, 5))
    } catch (err) {
      console.error(err)
      setError('Could not send your request. Please try again.')
    } finally {
      setReqBusy(false)
    }
  }

  async function handleSkip(sub, meal) {
    setSkipping(meal)
    try {
      await skipMeal(sub.id, currentUser.uid, sub.messId, todayStr(), meal)
      setTodaySkips((prev) => [...prev, { subscriptionId: sub.id, meal, date: todayStr() }])
      const price = menus[sub.messId]?.[meal]?.price || 0
      if (price > 0) addLedgerEntry(currentUser.uid, sub.messId, todayStr().slice(0, 7), { date: todayStr(), meal, amount: price, type: 'skip' }).catch((err) => console.error('Ledger write failed', err))
    } catch (err) {
      console.error('Skip failed:', err)
      setError('Could not skip this meal. Please try again.')
    } finally {
      setSkipping('')
    }
  }

  const isSkipped = (subId, meal) => todaySkips.some((s) => s.subscriptionId === subId && s.meal === meal)
  const messOf = (sub) => messes[sub?.messId]
  const planLabel = selected ? PLAN_LABEL[selected.plan] || selected.plan : ''

  if (loading) {
    return (
      <StudentLayout>
        <div className="flex justify-center py-24"><div className="spinner" /></div>
      </StudentLayout>
    )
  }

  const activeSubs = subs.filter((s) => s.status === 'active')
  const messNames = Object.fromEntries(Object.entries(messes).map(([id, m]) => [id, m?.messName || 'Mess']))
  const aiTip = generateMealSuggestion(firstName, activeSubs, menus, messNames)
  const menu = selected ? menus[selected.messId] : null
  const mess = messOf(selected)
  const validity = selected ? planValidity(selected) : null
  const pill = selected ? STATUS_PILL[selected.status] || { label: selected.status, cls: 'bg-surface-container-highest text-primary' } : null
  const track = trackingState(route)
  const mealsForSelected = selected?.status === 'active' ? ['lunch', 'dinner'].filter((m) => planIncludesMeal(selected.plan, m)) : []

  return (
    <StudentLayout planLabel={selected ? `${mess?.messName || 'Mess'} · ${planLabel}` : ''}>
      {error && (
        <div className="bg-error-container text-on-error-container rounded-xl p-space-md flex items-start gap-space-sm" role="alert">
          <Icon name="error" fill className="text-error" />
          <p className="font-body-md text-body-md flex-1">{error}</p>
          <button type="button" onClick={() => setError('')} aria-label="Dismiss"><Icon name="close" className="text-sm" /></button>
        </div>
      )}

      {/* Welcome bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-surface-container-low p-space-lg rounded-xl shadow-sm relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-surface-container-high/60 pointer-events-none" />
        <div className="flex flex-col space-y-1 z-10 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {selected && <span className="px-2.5 py-0.5 rounded-full bg-primary text-on-tertiary-container font-label-xs text-label-xs uppercase tracking-widest">{planLabel}</span>}
            <span className="text-on-surface-variant font-label-md text-label-md">• {format(new Date(), 'EEEE, d MMM yyyy')}</span>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-3">
            <h1 className="font-headline-md text-headline-md md:text-headline-lg text-primary tracking-tight">{greeting()}, {profile?.name || firstName}</h1>
            <span className="font-script-accent text-script-accent text-secondary italic">Ghar Ka Khana Ready Hai!</span>
          </div>
          {profile?.area && (
            <div className="flex items-center gap-1.5 text-on-surface-variant font-body-md text-body-md pt-0.5">
              <Icon name="location_on" className="text-primary text-base" />
              <span>{profile.area}</span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 z-10">
          <div className="bg-surface-container-highest/80 px-4 py-2.5 rounded-lg flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-container text-on-tertiary-container flex items-center justify-center">
              <Icon name="account_balance_wallet" className="text-lg" />
            </div>
            <div>
              <p className="font-label-xs text-label-xs text-on-surface-variant uppercase">Wallet Credits</p>
              <p className="font-headline-sm text-headline-sm text-primary leading-tight font-bold">{formatINR(profile?.walletBalance)}</p>
            </div>
          </div>
          <Link to={selected ? `/student/mess/${selected.messId}` : '/student/browse'}
            className="bg-secondary hover:bg-on-secondary-container text-on-primary px-4 py-3 rounded-lg font-label-lg text-label-lg flex items-center gap-2 shadow-sm transition-all active:scale-95">
            <Icon name={selected ? 'autorenew' : 'add_card'} className="text-base" />
            <span>{selected ? 'Renew Plan' : 'Find a Mess'}</span>
          </Link>
        </div>
      </div>

      {/* AI tip */}
      <div className="bg-surface-container rounded-xl p-space-md shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start md:items-center gap-3.5">
          <div className="w-10 h-10 rounded-full bg-surface-container-highest text-secondary-container flex items-center justify-center shrink-0">
            <Icon name="auto_awesome" fill className="text-2xl" />
          </div>
          <div className="flex flex-col">
            <span className="font-label-lg text-label-lg text-primary uppercase tracking-wide">AI Meal Suggestion</span>
            <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">{aiTip}</p>
          </div>
        </div>
      </div>

      {subs.length === 0 ? (
        <div className="bg-surface-container-low rounded-xl p-space-xl shadow-sm text-center">
          <Icon name="lunch_dining" className="text-5xl text-secondary-container" />
          <h2 className="font-headline-md text-headline-md text-primary mt-2">No tiffin subscriptions yet</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1 mb-space-md">Browse mess providers in your area and subscribe to your first tiffin.</p>
          <Link to="/student/browse" className="inline-flex items-center gap-2 bg-secondary hover:bg-on-secondary-container text-on-primary px-6 py-3 rounded-lg font-label-lg text-label-lg shadow-sm transition-colors">
            <Icon name="storefront" className="text-base" /> Browse Messes
          </Link>
        </div>
      ) : (
        <>
          {subs.length > 1 && (
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Your subscriptions">
              {subs.map((s) => (
                <button key={s.id} type="button" role="tab" aria-selected={s.id === selectedId} onClick={() => setSelectedId(s.id)}
                  className={`px-4 py-2 rounded-full font-label-md text-label-md transition-colors ${s.id === selectedId ? 'bg-primary-container text-on-tertiary-container' : 'bg-surface-container-high text-primary hover:bg-surface-variant'}`}>
                  {messOf(s)?.messName || 'Mess'}
                </button>
              ))}
            </div>
          )}

          {/* Subscription pass + live tracking */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-5 flex flex-col justify-between bg-primary-container text-on-primary p-space-lg rounded-xl shadow-md relative overflow-hidden">
              <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-primary/40 pointer-events-none" />
              <div className="absolute right-4 bottom-4 opacity-10 pointer-events-none"><Icon name="temple_hindu" className="text-9xl" /></div>
              <div className="relative z-10 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-lg bg-surface flex items-center justify-center text-primary-container shadow-inner shrink-0">
                      <Icon name="soup_kitchen" className="text-2xl" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-headline-sm text-headline-sm text-on-primary leading-tight truncate">{mess?.messName || 'Mess'}</h3>
                      <p className="font-label-xs text-label-xs text-on-primary-container tracking-wider uppercase truncate">{mess?.area || 'Tiffin service'}</p>
                    </div>
                  </div>
                  {pill && <span className={`${pill.cls} px-2.5 py-1 rounded font-label-xs text-label-xs tracking-wider uppercase font-bold whitespace-nowrap`}>{pill.label}</span>}
                </div>

                <div className="bg-primary/60 p-space-md rounded-lg space-y-3 shadow-inner">
                  <div className="flex justify-between items-center gap-3">
                    <span className="font-body-md text-body-md text-on-primary-container">Subscribed Tier</span>
                    <span className="font-label-lg text-label-lg text-on-tertiary-container text-right">{planLabel}</span>
                  </div>
                  <div className="flex justify-between items-center gap-3">
                    <span className="font-body-md text-body-md text-on-primary-container">Meal Schedule</span>
                    <span className="font-label-md text-label-md text-on-primary text-right">
                      {planIncludesMeal(selected.plan, 'lunch') && planIncludesMeal(selected.plan, 'dinner') ? 'Lunch & Dinner' : planIncludesMeal(selected.plan, 'lunch') ? 'Lunch only' : 'Dinner only'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-3">
                    <span className="font-body-md text-body-md text-on-primary-container">Validity</span>
                    <span className="font-label-md text-label-md text-on-primary text-right">{validity ? `Valid till ${validity.validTill}` : 'Ongoing'}</span>
                  </div>
                  {validity && (
                    <div className="pt-2">
                      <div className="flex justify-between text-label-xs font-label-xs mb-1.5">
                        <span className="text-on-primary-container">Pass Duration</span>
                        <span className="text-on-tertiary-container font-bold">{validity.remaining} of {validity.days} Days Remaining</span>
                      </div>
                      <div className="w-full bg-primary rounded-full h-2.5 overflow-hidden">
                        <div className="bg-secondary-container h-full rounded-full transition-all duration-500" style={{ width: `${(validity.remaining / validity.days) * 100}%` }} />
                      </div>
                    </div>
                  )}
                </div>

                {selected.status === 'pending_payment' && (
                  <p className="font-body-sm text-body-sm text-on-primary-container">Your payment is being reviewed by the mess owner. You'll get a notification once it's approved.</p>
                )}
                {selected.status === 'payment_rejected' && (
                  <p className="font-body-sm text-body-sm text-on-primary-container">Your payment couldn't be verified. Check your notifications, or subscribe again.</p>
                )}
              </div>

              <div className="relative z-10 pt-5 flex items-center gap-3">
                <Link to={`/student/mess/${selected.messId}`} className="flex-1 bg-secondary hover:bg-on-secondary-container text-on-primary py-3 rounded-lg font-label-lg text-label-lg flex items-center justify-center gap-2 shadow-sm transition-colors">
                  <Icon name="autorenew" className="text-base" /><span>Renew Plan</span>
                </Link>
                <Link to="/student/browse" className="px-4 py-3 bg-surface text-primary hover:bg-surface-container-high rounded-lg font-label-lg text-label-lg transition-colors flex items-center gap-1.5">
                  <Icon name="swap_horiz" className="text-base" /><span>Change Mess</span>
                </Link>
              </div>
            </div>

            <div className="xl:col-span-7 flex flex-col justify-between bg-surface-container-low p-space-lg rounded-xl shadow-sm">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-secondary-container/15 text-secondary flex items-center justify-center"><Icon name="moped" className="text-xl" /></div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-headline-sm text-headline-sm text-primary">Live Tiffin Tracking</h3>
                        {route && (
                          <span className={`px-2 py-0.5 rounded font-label-xs text-label-xs font-bold uppercase ${track.active >= 3 ? 'bg-surface-tint/15 text-surface-tint' : 'bg-secondary-container/20 text-on-secondary-container animate-pulse'}`}>
                            {TRACK_STEPS[track.active].label}
                          </span>
                        )}
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        {!route ? 'No delivery route scheduled for you today.'
                          : track.active === 3 ? 'Your tiffin has been delivered.'
                          : track.active === 2 ? 'The delivery partner is at your stop.'
                          : track.active === 1 ? `${track.stopsAway} stop${track.stopsAway === 1 ? '' : 's'} away · ETA ~${Math.max(3, track.stopsAway * 4)} min`
                          : 'The route has not started yet.'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="py-4 overflow-x-auto">
                  <ol className="relative flex items-center justify-between min-w-[320px]">
                    <div className="absolute left-6 right-6 top-5 h-1 bg-surface-container-highest" />
                    <div className="absolute left-6 top-5 h-1 bg-surface-tint transition-all duration-500"
                      style={{ width: `calc((100% - 3rem) * ${Math.max(0, track.active) / (TRACK_STEPS.length - 1)})` }} />
                    {TRACK_STEPS.map((step, i) => {
                      const done = track.active > i || track.active === 3
                      const current = track.active === i && track.active < 3
                      return (
                        <li key={step.label} className="flex flex-col items-center z-10">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${done ? 'bg-surface-tint text-on-primary' : current ? 'bg-secondary text-on-primary shadow-md animate-bounce' : 'bg-surface-container-highest text-on-surface-variant'}`}>
                            <Icon name={done ? 'check' : step.icon} className="text-base" />
                          </div>
                          <span className={`font-label-md text-label-md mt-2 ${current ? 'text-secondary font-bold' : done ? 'text-primary' : 'text-on-surface-variant'}`}>{step.label}</span>
                        </li>
                      )
                    })}
                  </ol>
                </div>

                {rider && (
                  <div className="mt-2 p-space-sm bg-surface rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center font-bold text-primary">
                        {(rider.name || 'D').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                      </div>
                      <div>
                        <p className="font-label-lg text-label-lg text-on-surface">{rider.name} (Delivery Partner)</p>
                        {rider.vehicleNumber && <p className="font-body-sm text-body-sm text-on-surface-variant">Vehicle: {rider.vehicleNumber}</p>}
                      </div>
                    </div>
                    {rider.phone && (
                      <a className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-container-highest hover:bg-surface-container text-primary font-label-md text-label-md rounded-md transition-colors" href={`tel:${rider.phone}`}>
                        <Icon name="call" className="text-base" /><span>Call {rider.phone}</span>
                      </a>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 flex items-center justify-between text-on-surface-variant font-body-sm text-body-sm">
                <span className="flex items-center gap-1.5"><Icon name="shelves" className="text-surface-tint text-base" />Updates live as your delivery partner moves.</span>
                {route && (
                  <Link to={`/student/track/${route.id}`} className="text-secondary font-label-md text-label-md hover:underline flex items-center gap-0.5">
                    <span>{route.liveLocation ? 'Live map' : 'Full tracking'}</span><Icon name="open_in_new" className="text-sm" />
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Today's meals */}
          {mealsForSelected.length > 0 && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pt-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-label-xs text-label-xs uppercase tracking-widest text-secondary font-bold">{mess?.messName} Menu</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                    <span className="font-label-xs text-label-xs text-on-surface-variant">Updated daily by your mess</span>
                  </div>
                  <h2 className="font-headline-md text-headline-md md:text-headline-lg text-primary tracking-tight">Today's Meal Thalis</h2>
                </div>
                <span className="font-script-accent text-script-accent text-on-tertiary-container italic">Soft Phulkas &amp; Pure Ghee</span>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {mealsForSelected.map((meal) => {
                  const m = MEAL[meal]
                  const data = menu?.[meal]
                  const items = (data?.items || '').split(',').map((s) => s.trim()).filter(Boolean)
                  const skipped = isSkipped(selected.id, meal)
                  return (
                    <div key={meal} className="bg-surface-container-low rounded-xl p-space-lg shadow-sm flex flex-col justify-between relative overflow-hidden">
                      <div className="flex justify-between items-start gap-3 mb-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-2 py-0.5 rounded ${m.badge} font-label-xs text-label-xs uppercase font-bold`}>{m.label}</span>
                            <span className="px-2 py-0.5 rounded bg-surface-container-highest text-primary font-label-xs text-label-xs">{m.window}</span>
                          </div>
                          <h3 className="font-headline-sm text-headline-sm md:text-headline-md text-primary mt-1">{data?.price ? `${formatINR(data.price)} per meal` : 'Menu not updated yet'}</h3>
                        </div>
                        <span className={`px-3 py-1 rounded-full font-label-xs text-label-xs font-bold flex items-center gap-1 whitespace-nowrap ${skipped ? 'bg-surface-container-highest text-on-surface-variant' : items.length ? 'bg-secondary-container/20 text-on-secondary-container' : 'bg-surface-container-highest text-primary'}`}>
                          {!skipped && items.length > 0 && <span className="w-2 h-2 rounded-full bg-secondary-container animate-ping" />}
                          {skipped ? 'Skipped today' : items.length ? 'On the menu' : 'Awaiting menu'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 my-2">
                        <div className="sm:col-span-5">
                          <img className="w-full h-40 object-cover rounded-lg shadow-sm" alt={`${m.label} sample`} src={m.image} loading="lazy" />
                        </div>
                        <div className="sm:col-span-7 flex flex-col justify-center space-y-1.5">
                          <p className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider font-semibold">Today's Items:</p>
                          {items.length ? (
                            <ul className="space-y-1 text-on-surface font-body-md text-body-md">
                              {items.map((it) => (
                                <li key={it} className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" /><span>{it}</span></li>
                              ))}
                            </ul>
                          ) : (
                            <p className="font-body-md text-body-md text-on-surface-variant">Your mess hasn't posted this meal yet.</p>
                          )}
                        </div>
                      </div>

                      <div className={`mt-4 rounded-lg p-space-sm flex items-center justify-between gap-3 transition-colors ${skipped ? 'bg-surface-container-highest' : 'bg-surface-container'}`}>
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-secondary/10 text-secondary flex items-center justify-center shrink-0"><Icon name="event_busy" className="text-base" /></div>
                          <div className="min-w-0">
                            <p className="font-label-md text-label-md text-on-surface">{skipped ? `${meal === 'lunch' ? 'Lunch' : 'Dinner'} skipped` : `Skip this ${meal === 'lunch' ? 'lunch' : 'dinner'}?`}</p>
                            <p className="font-body-sm text-body-sm text-on-surface-variant">{skipped ? 'Your mess has been told not to send it.' : "Let your mess know you won't need it today."}</p>
                          </div>
                        </div>
                        <button type="button" disabled={skipped || skipping === meal} onClick={() => handleSkip(selected, meal)}
                          className={`px-4 py-2 rounded-lg font-label-md text-label-md shadow-xs transition-all active:scale-95 flex items-center gap-1.5 whitespace-nowrap disabled:cursor-not-allowed ${skipped ? 'bg-surface-tint text-on-primary' : 'bg-secondary hover:bg-on-secondary-container text-on-primary disabled:opacity-60'}`}>
                          <Icon name={skipped ? 'check' : 'event_busy'} className="text-base" />
                          <span>{skipped ? 'Skipped' : skipping === meal ? 'Skipping…' : 'Skip Meal'}</span>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}

      {selected?.status === 'active' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <section className="bg-surface-container-low rounded-xl p-space-lg shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Icon name="tune" className="text-primary" />
              <h3 className="font-headline-sm text-headline-sm text-primary">Custom dietary request</h3>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">Less green chillies, no onion, extra roti — {mess?.messName || 'your mess'} will accept or decline.</p>
            <form onSubmit={handleCustomRequest} className="space-y-3">
              <div className="flex gap-2">
                {['lunch', 'dinner'].filter((m) => planIncludesMeal(selected.plan, m)).map((m) => (
                  <button key={m} type="button" onClick={() => setReqMeal(m)}
                    className={`px-4 py-1.5 rounded-full font-label-md text-label-md capitalize transition-colors ${reqMeal === m ? 'bg-primary-container text-on-tertiary-container' : 'bg-surface-container-high text-primary'}`}>{m}</button>
                ))}
              </div>
              <textarea value={reqText} onChange={(e) => setReqText(e.target.value)} rows={2} maxLength={200} required placeholder="e.g. Please make it less spicy, no onion or garlic"
                className="w-full bg-surface-container text-on-surface font-body-md text-body-md rounded-lg px-3 py-2.5 outline-none focus:bg-surface-container-lowest focus:shadow-md transition-all placeholder:text-outline" />
              <button type="submit" disabled={reqBusy || !reqText.trim()} className="bg-secondary hover:bg-on-secondary-container disabled:opacity-60 text-on-primary px-5 py-2.5 rounded-lg font-label-lg text-label-lg flex items-center gap-2 transition-colors">
                <Icon name="send" className="text-base" />{reqBusy ? 'Sending…' : 'Send request'}
              </button>
            </form>
            {requests.length > 0 && (
              <ul className="mt-4 pt-3 space-y-2 border-t border-outline-variant/50">
                {requests.map((r) => (
                  <li key={r.id} className="flex items-start justify-between gap-3 font-body-sm text-body-sm">
                    <span className="text-on-surface-variant min-w-0"><span className="capitalize font-semibold text-on-surface">{r.meal}</span> · {r.requestText}</span>
                    <span className={`px-2 py-0.5 rounded-full font-label-xs text-label-xs uppercase shrink-0 ${r.status === 'accepted' ? 'bg-primary-fixed text-primary' : r.status === 'rejected' ? 'bg-error-container text-on-error-container' : 'bg-tertiary-fixed text-tertiary'}`}>{r.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-surface-container-low rounded-xl p-space-lg shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Icon name="qr_code_2" className="text-primary" />
              <h3 className="font-headline-sm text-headline-sm text-primary">Your tiffin box QR</h3>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">Stick this on your tiffin box. The delivery partner scans it on delivery and on return.</p>
            <div className="flex flex-wrap items-center gap-5">
              <div className="bg-white p-3 rounded-xl shadow-sm">
                <QRCodeCanvas value={`${selected.id}|${currentUser.uid}|${selected.messId}`} size={132} level="M" />
              </div>
              <div className="space-y-1.5">
                <p className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider">Box status</p>
                <span className={`inline-flex px-3 py-1 rounded-full font-label-md text-label-md ${box?.status === 'with_student' ? 'bg-primary-fixed text-primary' : box?.status === 'with_mess' ? 'bg-tertiary-fixed text-tertiary' : 'bg-surface-container-highest text-on-surface-variant'}`}>
                  {box?.status === 'with_student' ? 'With you' : box?.status === 'with_mess' ? 'Returned to mess' : box?.status === 'in_transit' ? 'In transit' : 'Not scanned yet'}
                </span>
                <p className="font-mono text-label-xs text-on-surface-variant">ID {selected.id.slice(0, 8).toUpperCase()}</p>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Promo voucher */}
      <div className="bg-primary text-on-primary rounded-xl shadow-md overflow-hidden relative">
        <div className="p-space-lg flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-on-tertiary-container text-on-primary-fixed font-label-xs text-label-xs uppercase font-extrabold tracking-wider">Campus Special Voucher</span>
              <span className="text-on-primary-container font-label-md text-label-md">For students</span>
            </div>
            <h3 className="font-headline-sm text-headline-sm md:text-headline-md leading-tight text-on-primary">Super Delicious Meals Delivered Fresh Daily</h3>
            <p className="font-body-md text-body-md text-on-primary-container">Buy a 30-pass booklet for your hostel roommates and save ₹100.</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-on-tertiary-container font-label-md text-label-md font-bold">
              <span className="flex items-center gap-1"><Icon name="call" className="text-base" />Helpline: (+91) 82386 92705</span>
            </div>
          </div>
          <div className="w-full lg:w-auto bg-surface text-on-surface p-space-md rounded-xl shadow-lg flex flex-col justify-between shrink-0">
            <div className="flex items-center justify-between gap-4 pb-3">
              <span className="font-label-xs text-label-xs tracking-widest text-on-surface-variant uppercase font-bold">Exclusive Pass</span>
              <span className="bg-secondary-container text-on-primary font-label-xs text-label-xs px-2 py-0.5 rounded font-bold">₹100 FLAT OFF</span>
            </div>
            <div className="py-2 text-center">
              <p className="text-xs text-on-surface-variant uppercase tracking-wider">30 Passes Booklet</p>
              <div className="flex items-baseline justify-center gap-2 mt-1">
                <span className="font-headline-lg text-headline-lg font-bold text-primary">₹2,400</span>
                <span className="font-body-md text-body-md text-error line-through">₹2,500</span>
              </div>
            </div>
            <Link to="/student/browse" className="mt-3 text-center w-full bg-secondary hover:bg-on-secondary-container text-on-primary py-2.5 px-4 rounded-lg font-label-md text-label-md transition-colors shadow-xs">Apply Campus Pass</Link>
          </div>
        </div>
      </div>

      {/* Recommended messes */}
      {recommended.length > 0 && (
        <div>
          <h2 className="font-headline-md text-headline-md text-primary mb-space-md">Recommended for you</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recommended.map((m) => (
              <button key={m.id} type="button" onClick={() => navigate(`/student/mess/${m.id}`)}
                className="text-left bg-surface-container-low hover:bg-surface-container p-space-md rounded-xl shadow-xs transition-all group">
                <h4 className="font-label-lg text-label-lg text-primary group-hover:text-secondary transition-colors">{m.messName}</h4>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 mb-3">{m.area}</p>
                <div className="flex justify-between items-center font-label-md text-label-md">
                  <span className="flex items-center gap-1 text-on-tertiary-container"><Icon name="star" fill className="text-base" />{m.rating?.toFixed(1) || 'New'}</span>
                  <span className="px-2 py-0.5 rounded bg-surface-container-highest text-primary">{m.subscriberCount || 0} subscribers</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { to: '/student/browse', icon: 'storefront', title: 'Browse Messes', text: 'Compare menus, prices and ratings' },
          { to: '/student/subscriptions', icon: 'card_membership', title: 'My Subscriptions', text: 'Manage plans and payment status' },
          { to: '/student/billing', icon: 'receipt_long', title: 'Billing & Ledger', text: 'Charges, skips and monthly totals' },
        ].map((s) => (
          <Link key={s.to} to={s.to} className="bg-surface-container-low hover:bg-surface-container p-space-md rounded-xl shadow-xs transition-all flex items-center gap-3.5 group">
            <div className="w-11 h-11 rounded-lg bg-surface-container-highest text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-on-primary transition-colors">
              <Icon name={s.icon} className="text-xl" />
            </div>
            <div>
              <h4 className="font-label-lg text-label-lg text-primary group-hover:text-secondary transition-colors">{s.title}</h4>
              <p className="font-body-sm text-body-sm text-on-surface-variant">{s.text}</p>
            </div>
          </Link>
        ))}
      </div>
    </StudentLayout>
  )
}
