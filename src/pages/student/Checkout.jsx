import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import StudentLayout from '../../components/common/StudentLayout.jsx'
import Icon from '../../components/common/Icon.jsx'
import { getMessProfile, getMenu, createSubscription, createNotification } from '../../firebase/firestore.js'
import { PLANS, priceBreakdown } from '../../utils/pricing.js'
import { planIncludesMeal } from '../../utils/messResolver.js'
import { useBrowserLocation } from '../../utils/location.js'
import { BUSINESS, formatINR } from '../../constants.js'

const todayStr = () => new Date().toISOString().slice(0, 10)

const SLOTS = [
  { id: 'lunch', label: 'Lunch Slot', time: '12:30 PM - 2:00 PM', note: 'Cooked fresh every morning' },
  { id: 'dinner', label: 'Dinner Slot', time: '7:30 PM - 9:30 PM', note: 'Cooked fresh every evening' },
]

const fieldCls = 'w-full bg-brand-cream/60 border border-brand-gold/30 rounded-lg px-3 py-2.5 text-sm text-brand-charcoal font-medium placeholder:text-brand-charcoal/40 focus:outline-none focus:border-brand-forest focus:ring-1 focus:ring-brand-forest'
const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-brand-forest mb-1.5'

function Stepper({ confirmed }) {
  const steps = [
    { n: 1, label: 'Cart Selection', state: 'done' },
    { n: 2, label: 'Details & Payment', state: confirmed ? 'done' : 'current' },
    { n: 3, label: 'Order Confirmed', state: confirmed ? 'done' : 'todo' },
  ]
  return (
    <ol className="bg-white/80 border border-brand-gold/30 rounded-full px-4 sm:px-8 py-3 shadow-sm flex items-center justify-between gap-2" aria-label="Checkout progress">
      {steps.map((s, i) => (
        <li key={s.n} className="flex items-center gap-2 sm:gap-3 flex-1 last:flex-none">
          <span className={`w-9 h-9 shrink-0 rounded-full grid place-items-center text-sm font-bold ${
            s.state === 'done' ? 'bg-brand-forest text-white' : s.state === 'current' ? 'bg-brand-saffron text-white' : 'bg-gray-300 text-white'}`}>
            {s.state === 'done' ? <Icon name="check" className="text-base" /> : s.n}
          </span>
          <span className="hidden sm:block leading-tight">
            <span className="block text-[10px] uppercase tracking-wider text-gray-500">Step {s.n}{s.state === 'current' ? ' · Current' : ''}</span>
            <span className={`block text-xs font-bold ${s.state === 'current' ? 'text-brand-saffron' : 'text-brand-forest'}`}>{s.label}</span>
          </span>
          {i < steps.length - 1 && <span className={`flex-1 h-0.5 ${steps[i + 1].state !== 'todo' ? 'bg-brand-forest' : 'bg-gray-300'}`} />}
        </li>
      ))}
    </ol>
  )
}

function RadioCard({ checked, onChange, disabled, children, name, value }) {
  return (
    <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
      disabled ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50' : checked ? 'border-brand-forest bg-brand-forest/5 shadow-sm' : 'border-gray-200 bg-white hover:border-brand-gold'}`}>
      <input type="radio" name={name} value={value} checked={checked} disabled={disabled} onChange={onChange} className="mt-1 accent-brand-forest" />
      <div className="flex-1 min-w-0">{children}</div>
    </label>
  )
}

export default function Checkout() {
  const { messId } = useParams()
  const [params] = useSearchParams()
  const { currentUser, profile } = useAuth()
  const navigate = useNavigate()
  const planId = params.get('plan')
  const plan = PLANS.find((p) => p.id === planId)

  const [mess, setMess] = useState(null)
  const [menu, setMenu] = useState(null)
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState(profile?.name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [address, setAddress] = useState(profile?.area || '')
  const [coords, setCoords] = useState(null) // set only when the address came from the browser location
  const [landmark, setLandmark] = useState('')
  const [slot, setSlot] = useState('lunch')
  const [note, setNote] = useState('')
  const [method, setMethod] = useState('online')
  const [couponInput, setCouponInput] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [couponError, setCouponError] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmed, setConfirmed] = useState(null)

  const { location, status: locStatus, detect } = useBrowserLocation({ auto: false })
  const wantsLocation = useRef(false)

  useEffect(() => {
    if (!plan || messId.startsWith('dummy-')) return
    Promise.all([getMessProfile(messId), getMenu(messId, todayStr())])
      .then(([m, mn]) => { setMess(m); setMenu(mn) })
      .catch((err) => { console.error(err); setError('Could not load this mess. Please go back and try again.') })
      .finally(() => setLoading(false))
  }, [messId, plan])

  // Fill the address from the browser location when the student asks for it.
  useEffect(() => {
    if (wantsLocation.current && locStatus === 'ready' && location?.full) {
      wantsLocation.current = false
      setAddress(location.full)
      setCoords({ lat: location.lat, lng: location.lon })
    }
  }, [locStatus, location])

  // Demo listings and unknown plans never reach checkout.
  if (!plan || messId.startsWith('dummy-')) return <Navigate to={`/student/mess/${messId}`} replace />

  const lunchOnly = !planIncludesMeal(plan.id, 'dinner')
  const price = priceBreakdown(plan.id, menu, couponCode)
  const total = price.total

  function applyCoupon() {
    const result = priceBreakdown(plan.id, menu, couponInput)
    if (result.error || !result.code) { setCouponError(result.error || 'Enter a coupon code.'); return }
    setCouponCode(result.code)
    setCouponError('')
  }

  function removeCoupon() {
    setCouponCode('')
    setCouponInput('')
    setCouponError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!name.trim()) return setError('Please enter the recipient name.')
    if (!/^\+?[0-9 ]{10,15}$/.test(phone.trim())) return setError('Please enter a valid mobile number.')
    if (!address.trim()) return setError('Please enter your hostel / campus room address.')

    const details = {
      deliveryName: name.trim(), deliveryPhone: phone.trim(), deliveryAddress: address.trim(),
      ...(coords ? { deliveryLat: coords.lat, deliveryLng: coords.lng } : {}),
      deliveryLandmark: landmark.trim(), deliverySlot: lunchOnly ? 'lunch' : slot, dietaryNote: note.trim(),
      paymentMethod: method === 'online' ? 'upi_qr' : 'cod',
      couponCode: price.code, subtotal: price.subtotal, discount: price.discount, amount: total,
    }

    setSubmitting(true)
    try {
      if (method === 'online') {
        // Online: subscription waits for the mess owner to verify the UPI payment (QR flow).
        const subRef = await createSubscription(currentUser.uid, messId, plan.id, 'pending_payment', details)
        const q = new URLSearchParams({ subId: subRef.id, plan: plan.id })
        if (price.code) q.set('coupon', price.code)
        navigate(`/student/mess/${messId}/pay?${q.toString()}`)
      } else {
        // Cash on delivery: nothing to verify, so the order is confirmed right away.
        const subRef = await createSubscription(currentUser.uid, messId, plan.id, 'active', { ...details, paymentStatus: 'cod_pending' })
        createNotification(messId, {
          title: 'New Cash on Delivery order',
          message: `${name.trim()} ordered the ${plan.label} plan (${formatINR(total)} cash on delivery) — ${lunchOnly ? 'lunch' : slot} slot.`,
          type: 'cod_order',
          link: '/mess/subscribers',
        }).catch(() => {})
        setConfirmed({ id: subRef.id })
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } catch (err) {
      console.error(err)
      setError('Something went wrong placing your order. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <StudentLayout><div className="flex justify-center py-24"><div className="spinner" /></div></StudentLayout>

  const menuItems = ['lunch', 'dinner']
    .filter((m) => planIncludesMeal(plan.id, m) && menu?.[m]?.items)
    .map((m) => ({ meal: m, items: menu[m].items }))

  return (
    <StudentLayout>
      <Stepper confirmed={!!confirmed} />

      {confirmed ? (
        <div className="max-w-2xl mx-auto w-full bg-white rounded-2xl border border-brand-gold/40 shadow-lg p-6 sm:p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-brand-forest text-white grid place-items-center mx-auto"><Icon name="check" className="text-4xl" /></div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-brand-forest mt-4">Order confirmed!</h1>
          <p className="text-sm text-gray-600 mt-2">
            {mess?.messName} will start your {plan.label.toLowerCase()} plan. Please keep <strong>{formatINR(total)}</strong> ready to pay in cash to the delivery partner.
          </p>
          <div className="mt-6 text-left bg-brand-cream/60 border border-brand-gold/30 rounded-xl p-4 text-sm space-y-1.5">
            <div className="flex justify-between gap-4"><span className="text-gray-500">Order ID</span><span className="font-mono font-semibold">{confirmed.id.slice(0, 10).toUpperCase()}</span></div>
            <div className="flex justify-between gap-4"><span className="text-gray-500">Plan</span><span className="font-semibold">{plan.label}</span></div>
            <div className="flex justify-between gap-4"><span className="text-gray-500">Delivery slot</span><span className="font-semibold">{lunchOnly ? 'Lunch' : slot === 'lunch' ? 'Lunch' : 'Dinner'}</span></div>
            <div className="flex justify-between gap-4"><span className="text-gray-500">Deliver to</span><span className="font-semibold text-right">{address}</span></div>
            <div className="flex justify-between gap-4"><span className="text-gray-500">Pay on delivery</span><span className="font-bold text-brand-chili">{formatINR(total)}</span></div>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/student" className="px-6 py-3 rounded-full bg-brand-saffron hover:bg-brand-saffronHover text-white font-bold text-sm transition-colors">Go to Dashboard</Link>
            <Link to="/student/subscriptions" className="px-6 py-3 rounded-full border-2 border-brand-forest text-brand-forest hover:bg-brand-forest hover:text-white font-bold text-sm transition-colors">My Subscriptions</Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <div className="xl:col-span-7 space-y-6">
            <section className="bg-white rounded-2xl border border-brand-gold/30 shadow-md p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3 mb-5">
                <h2 className="font-heading text-lg font-bold text-brand-forest flex items-center gap-2"><Icon name="location_on" fill className="text-brand-chili" />Hostel &amp; Delivery Details</h2>
                <span className="text-[11px] font-bold bg-brand-gold/25 text-brand-forestDark px-3 py-1 rounded-full whitespace-nowrap">Doorstep Hot Tiffin</span>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls} htmlFor="co-name">Student / Recipient Name</label>
                  <input id="co-name" className={fieldCls} value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
                </div>
                <div>
                  <label className={labelCls} htmlFor="co-phone">Mobile Number (for gate OTP)</label>
                  <input id="co-phone" type="tel" className={fieldCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" required autoComplete="tel" />
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-end justify-between gap-2">
                  <label className={labelCls} htmlFor="co-address">Hostel / Campus Room Address</label>
                  <button type="button" onClick={() => { wantsLocation.current = true; if (locStatus === 'ready' && location?.full) { wantsLocation.current = false; setAddress(location.full); setCoords({ lat: location.lat, lng: location.lon }) } else detect() }}
                    className="text-[11px] font-bold text-brand-saffron hover:underline mb-1.5 flex items-center gap-1">
                    <Icon name="my_location" className="text-sm" />{locStatus === 'detecting' ? 'Detecting…' : 'Use my current location'}
                  </button>
                </div>
                <textarea id="co-address" rows={2} className={fieldCls} value={address} onChange={(e) => { setAddress(e.target.value); setCoords(null) }} placeholder="Hostel name, room number, area" required />
                {(locStatus === 'denied' || locStatus === 'error') && <p className="text-xs text-brand-chili mt-1">We couldn't read your location. Allow location access in the browser, or type the address.</p>}
              </div>

              <div className="mt-4">
                <label className={labelCls} htmlFor="co-landmark">Delivery Landmark / Drop Instruction</label>
                <input id="co-landmark" className={fieldCls} value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="e.g. Opp. Security Gate #2, leave with the guard" />
              </div>

              <fieldset className="mt-5">
                <legend className={labelCls}>Select Delivery Meal Slot</legend>
                <div className="grid sm:grid-cols-2 gap-3">
                  {SLOTS.map((s) => {
                    const disabled = lunchOnly && s.id === 'dinner'
                    return (
                      <RadioCard key={s.id} name="slot" value={s.id} checked={(lunchOnly ? 'lunch' : slot) === s.id} disabled={disabled} onChange={() => setSlot(s.id)}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-brand-forest">{s.label}</span>
                          <span className="text-[10px] font-bold bg-brand-gold/30 text-brand-forestDark px-2 py-0.5 rounded">{s.time}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{disabled ? 'Not included in a lunch-only plan' : s.note}</p>
                      </RadioCard>
                    )
                  })}
                </div>
              </fieldset>

              <div className="mt-5">
                <label className={labelCls} htmlFor="co-note">Dietary Note to Mess (optional)</label>
                <textarea id="co-note" rows={2} className={`${fieldCls} border-dashed`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Please send extra spicy lasan ni chutney & soft rotli without ghee" />
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-brand-gold/30 shadow-md p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3 mb-5">
                <h2 className="font-heading text-lg font-bold text-brand-forest flex items-center gap-2"><Icon name="credit_card" fill className="text-brand-forest" />Select Payment Method</h2>
                <span className="text-[11px] text-gray-500 flex items-center gap-1"><Icon name="lock" className="text-sm text-brand-gold" />Secure checkout</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <RadioCard name="method" value="online" checked={method === 'online'} onChange={() => setMethod('online')}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-brand-forest">Pay Online (UPI QR)</span>
                    <span className="text-[10px] font-extrabold bg-brand-gold text-brand-forestDark px-2 py-0.5 rounded">INSTANT</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Scan the mess's UPI QR with GPay, PhonePe or Paytm, then upload your payment proof.</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {['UPI', 'GPay', 'PhonePe', 'Paytm'].map((b) => <span key={b} className="text-[10px] font-bold border border-gray-300 rounded px-2 py-0.5 text-gray-600">{b}</span>)}
                  </div>
                </RadioCard>
                <RadioCard name="method" value="cod" checked={method === 'cod'} onChange={() => setMethod('cod')}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-brand-forest">Cash on Delivery</span>
                    <span className="text-[10px] font-extrabold bg-gray-200 text-gray-700 px-2 py-0.5 rounded">CASH ONLY</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Order is confirmed now. Pay the delivery partner when your tiffin arrives.</p>
                  <p className="text-[11px] font-semibold text-green-700 mt-2 flex items-center gap-1"><Icon name="payments" className="text-sm" />Exact cash of {formatINR(total)} requested</p>
                </RadioCard>
              </div>
            </section>
          </div>

          <aside className="xl:col-span-5 xl:sticky xl:top-20 space-y-4">
            <section className="bg-white rounded-2xl border border-brand-gold/40 shadow-lg p-5 sm:p-6 relative overflow-hidden">
              <span className="absolute top-3 -right-8 rotate-45 bg-brand-gold text-brand-forestDark text-[10px] font-extrabold px-9 py-0.5 tracking-wider">VERIFIED</span>
              <p className="font-script text-brand-saffron text-xl leading-none">Homely Tiffin Cart</p>
              <h2 className="font-heading text-xl font-bold text-brand-forest mt-1">Order Summary</h2>
              <p className="text-xs text-gray-500 mt-0.5">Mess: <strong className="text-brand-forest">{mess?.messName || 'Mess'}</strong>{mess?.area ? ` · ${mess.area}` : ''}</p>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="font-bold text-brand-forest">1× {plan.label} Plan</p>
                    <p className="text-xs text-brand-chili">{plan.desc}</p>
                  </div>
                  <span className="font-bold whitespace-nowrap">{formatINR(price.subtotal)}</span>
                </div>
                {menuItems.map((m) => (
                  <p key={m.meal} className="text-xs text-gray-500"><span className="font-semibold capitalize text-brand-forest">{m.meal} today:</span> {m.items}</p>
                ))}
              </div>

              <div className="mt-4">
                {couponCode ? (
                  <div className="flex items-center justify-between gap-3 border-2 border-dashed border-brand-gold rounded-lg px-3 py-2.5 bg-brand-cream/50">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon name="sell" className="text-brand-saffron text-lg" />
                      <span className="font-mono text-xs font-bold">{couponCode}</span>
                      <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Applied</span>
                    </div>
                    <button type="button" onClick={removeCoupon} className="text-xs font-bold text-brand-chili hover:underline">Remove</button>
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-2">
                      <input aria-label="Coupon code" className={`${fieldCls} uppercase font-mono`} value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder="Coupon code (e.g. MESSIFY50)" />
                      <button type="button" onClick={applyCoupon} className="px-4 rounded-lg bg-brand-forest hover:bg-brand-forestDark text-brand-gold text-xs font-bold uppercase tracking-wider transition-colors">Apply</button>
                    </div>
                    {couponError && <p className="text-xs text-brand-chili mt-1">{couponError}</p>}
                  </div>
                )}
              </div>

              <dl className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-gray-600">Plan subtotal</dt><dd className="font-semibold">{formatINR(price.subtotal)}</dd></div>
                {price.discount > 0 && <div className="flex justify-between"><dt className="text-gray-600">Coupon discount</dt><dd className="font-semibold text-green-700">- {formatINR(price.discount)}</dd></div>}
                <div className="flex justify-between"><dt className="text-gray-600">Hostel batch delivery</dt><dd className="font-bold text-green-700">FREE</dd></div>
              </dl>

              <div className="mt-4 pt-4 border-t border-gray-200 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Total payable</p>
                  <p className="font-heading text-3xl font-bold text-brand-forest">{formatINR(total)}</p>
                </div>
                {price.discount > 0 && <span className="text-[11px] font-bold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">You saved {formatINR(price.discount)} today</span>}
              </div>

              {error && <p role="alert" className="mt-4 text-sm text-brand-chili bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

              <button type="submit" disabled={submitting}
                className="mt-4 w-full py-3.5 rounded-xl bg-brand-saffron hover:bg-brand-saffronHover text-white font-bold text-sm shadow-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
                <Icon name={method === 'online' ? 'qr_code_2' : 'check_circle'} className="text-lg" />
                {submitting ? 'Please wait…' : method === 'online' ? `Continue to UPI payment · ${formatINR(total)}` : `Confirm order · Pay ${formatINR(total)} on delivery`}
              </button>
              <p className="text-[11px] text-gray-500 text-center mt-3 flex items-center justify-center gap-1"><Icon name="lock" className="text-xs" />{method === 'online' ? 'Your plan activates once the mess verifies your payment.' : 'No payment needed now.'}</p>
            </section>

            <div className="bg-amber-50 border border-brand-gold/50 rounded-xl p-4 text-xs text-brand-charcoal flex gap-2.5">
              <Icon name="info" className="text-brand-gold text-lg shrink-0" />
              <p><strong>Skip anytime:</strong> need to cancel a meal? Skip it from your dashboard and your mess is notified. Questions? Call {BUSINESS.phone}.</p>
            </div>
          </aside>
        </form>
      )}
    </StudentLayout>
  )
}
