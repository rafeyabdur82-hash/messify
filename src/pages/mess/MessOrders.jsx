import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import PageLayout from '../../components/common/MessPage.jsx'
import { Card, Button, Toast, Select, EmptyState, Input } from '../../components/common/UI.jsx'
import { getMessSubscribers, getMessSkipsForDate, createRoute, getMessDeliveryPartners } from '../../firebase/firestore.js'
import { planIncludesMeal } from '../../utils/messResolver.js'
import { formatINR } from '../../constants.js'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase/config.js'

const todayStr = () => new Date().toISOString().slice(0, 10)

export default function MessOrders() {
  const { currentUser, profile } = useAuth()
  const [subs, setSubs] = useState([])
  const [skips, setSkips] = useState([])
  const [students, setStudents] = useState({})
  const [partners, setPartners] = useState([])
  const [toast, setToast] = useState('')
  const [routeSaving, setRouteSaving] = useState(false)
  const [routeBuilder, setRouteBuilder] = useState(null) // { meal, stops, partnerId }

  useEffect(() => { load() }, [currentUser])

  async function load() {
    const [subData, skipData, partnerData] = await Promise.all([
      getMessSubscribers(currentUser.uid),
      getMessSkipsForDate(currentUser.uid, todayStr()),
      getMessDeliveryPartners(currentUser.uid),
    ])
    setSubs(subData); setSkips(skipData); setPartners(partnerData)
    const map = {}
    for (const s of subData) { const snap = await getDoc(doc(db, 'users', s.studentId)); if (snap.exists()) map[s.studentId] = snap.data() }
    setStudents(map)
  }

  function isSkippedToday(studentId, meal) { return skips.some((sk) => sk.studentId === studentId && sk.meal === meal) }

  function openRouteBuilder(meal) {
    const activeStudents = subs.filter((s) => s.status === 'active' && planIncludesMeal(s.plan, meal) && !isSkippedToday(s.studentId, meal))
    // Prefer the delivery details the student entered at checkout; fall back to their profile.
    const stops = activeStudents.map((s) => {
      const hasOrderGps = s.deliveryLat != null && s.deliveryLng != null
      const studentProfile = students[s.studentId] || {}
      const hasProfileGps = studentProfile.lat != null && studentProfile.lng != null
      const point = hasOrderGps ? { lat: s.deliveryLat, lng: s.deliveryLng } : hasProfileGps ? { lat: studentProfile.lat, lng: studentProfile.lng } : { lat: null, lng: null }
      return {
        subscriptionId: s.id,
        studentId: s.studentId,
        name: s.deliveryName || studentProfile.name || 'Student',
        phone: s.deliveryPhone || studentProfile.phone || '',
        address: s.deliveryAddress || studentProfile.area || 'Address not set',
        landmark: s.deliveryLandmark || '',
        dietaryNote: s.dietaryNote || '',
        ...point,
        status: 'pending',
        selected: true,
      }
    })
    setRouteBuilder({ meal, stops, partnerId: partners[0]?.partnerId || '', tipAmount: '' })
  }

  function toggleStop(subscriptionId) {
    setRouteBuilder((prev) => ({
      ...prev,
      stops: prev.stops.map((stop) => stop.subscriptionId === subscriptionId ? { ...stop, selected: !stop.selected } : stop),
    }))
  }

  function toggleAllStops(selected) {
    setRouteBuilder((prev) => ({
      ...prev,
      stops: prev.stops.map((stop) => ({ ...stop, selected })),
    }))
  }

  function moveStop(index, direction) {
    setRouteBuilder((prev) => {
      const stops = [...prev.stops]
      const newIndex = index + direction
      if (newIndex < 0 || newIndex >= stops.length) return prev
      ;[stops[index], stops[newIndex]] = [stops[newIndex], stops[index]]
      return { ...prev, stops }
    })
  }

  async function confirmRoute() {
    if (routeSaving) return
    const partner = partners.find((p) => p.partnerId === routeBuilder.partnerId)
    const deliveryPersonId = routeBuilder.partnerId || 'unassigned'
    const stops = routeBuilder.stops
      .filter((stop) => stop.selected)
      .map(({ selected, subscriptionId, ...stop }) => stop)
    if (stops.length === 0) return
    const messLocation = profile?.lat != null && profile?.lng != null ? { lat: profile.lat, lng: profile.lng, label: profile.messName || profile.name || 'Mess' } : null
    const tipAmount = Number(routeBuilder.tipAmount) || 0
    setRouteSaving(true)
    try {
      await createRoute(currentUser.uid, deliveryPersonId, todayStr(), routeBuilder.meal, stops, messLocation, tipAmount, profile?.messName)
      setToast(`${routeBuilder.meal === 'lunch' ? 'Lunch' : 'Dinner'} route created — ${stops.length} stops${partner ? ` · assigned to ${partner.name}` : ''}${tipAmount > 0 ? ` · ${formatINR(tipAmount)} tip on completion` : ''}`)
      setTimeout(() => setToast(''), 3500)
      setRouteBuilder(null)
    } catch (error) {
      setToast(error.message || 'Could not create the delivery route.')
      setTimeout(() => setToast(''), 4000)
    } finally {
      setRouteSaving(false)
    }
  }

  const lunchCount = subs.filter((s) => s.status === 'active' && planIncludesMeal(s.plan, 'lunch') && !isSkippedToday(s.studentId, 'lunch')).length
  const dinnerCount = subs.filter((s) => s.status === 'active' && planIncludesMeal(s.plan, 'dinner') && !isSkippedToday(s.studentId, 'dinner')).length

  return (
    <PageLayout title="Today's Orders" subtitle="Total tiffins to deliver today">
      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="animate-fadeUp">
          <h3 className="text-lg mb-2">Lunch</h3>
          <p className="font-mono text-[26px] font-bold text-masala mb-4">{lunchCount} tiffins</p>
          <Button onClick={() => openRouteBuilder('lunch')} disabled={lunchCount === 0}>Create Delivery Route</Button>
        </Card>
        <Card className="animate-fadeUp" style={{ animationDelay: '.1s' }}>
          <h3 className="text-lg mb-2">Dinner</h3>
          <p className="font-mono text-[26px] font-bold text-masala mb-4">{dinnerCount} tiffins</p>
          <Button onClick={() => openRouteBuilder('dinner')} disabled={dinnerCount === 0}>Create Delivery Route</Button>
        </Card>
      </div>

      {routeBuilder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setRouteBuilder(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl mb-1 capitalize">{routeBuilder.meal} Route</h3>
            <p className="text-charcoal-soft text-sm mb-4">Choose which students to include, then set the stop order.</p>

            {partners.length === 0 ? (
              <p className="text-xs text-charcoal-soft bg-dahi p-3 rounded-lg mb-4">No delivery partners linked yet — this route will be created unassigned. Link a partner from the Delivery page to assign it.</p>
            ) : (
              <div className="mb-4">
                <Select label="Assign to" value={routeBuilder.partnerId} onChange={(e) => setRouteBuilder((prev) => ({ ...prev, partnerId: e.target.value }))}>
                  <option value="">Unassigned</option>
                  {partners.map((p) => <option key={p.partnerId} value={p.partnerId}>{p.name}</option>)}
                </Select>
              </div>
            )}

            <div className="mb-4">
              <Input
                label="Delivery tip (optional, ₹)"
                type="number"
                min="0"
                step="0.01"
                value={routeBuilder.tipAmount}
                disabled={partners.length === 0}
                onChange={(e) => setRouteBuilder((prev) => ({ ...prev, tipAmount: e.target.value }))}
                placeholder="0.00"
              />
              <p className="text-xs text-charcoal-soft mt-1">This tip is added to the selected delivery partner’s in-app earnings only after all route stops are delivered.</p>
              {Number(routeBuilder.tipAmount) > 0 && !routeBuilder.partnerId && <p className="text-xs text-danger mt-1">Select a delivery partner to add a tip.</p>}
            </div>

            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="text-xs text-charcoal-soft">
                {routeBuilder.stops.filter((stop) => stop.selected).length} of {routeBuilder.stops.length} students selected
              </p>
              <button type="button" onClick={() => toggleAllStops(routeBuilder.stops.some((stop) => !stop.selected))} className="text-xs font-semibold text-masala">
                {routeBuilder.stops.every((stop) => stop.selected) ? 'Deselect all' : 'Select all'}
              </button>
            </div>

            <div className="flex flex-col gap-2 mb-5">
              {(() => {
                let routePosition = 0
                return routeBuilder.stops.map((stop, i) => {
                  const position = stop.selected ? ++routePosition : null
                  return (
                    <div key={stop.subscriptionId} className={`flex items-center gap-3 p-3 border border-sooji rounded-xl ${stop.selected ? '' : 'opacity-60'}`}>
                      <input
                        type="checkbox"
                        checked={stop.selected}
                        onChange={() => toggleStop(stop.subscriptionId)}
                        aria-label={`Include ${stop.name} in this route`}
                        className="w-4 h-4 accent-[#8B2635] flex-shrink-0"
                      />
                      <span className="w-7 h-7 grid place-items-center bg-sooji rounded-full font-mono text-xs font-bold flex-shrink-0">{position || '—'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{stop.name}</div>
                        <div className="text-xs text-charcoal-soft truncate">{stop.address}</div>
                      </div>
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        <button type="button" onClick={() => moveStop(i, -1)} disabled={i === 0} aria-label={`Move ${stop.name} up`} className="w-6 h-6 grid place-items-center rounded bg-dahi disabled:opacity-30 text-xs">▲</button>
                        <button type="button" onClick={() => moveStop(i, 1)} disabled={i === routeBuilder.stops.length - 1} aria-label={`Move ${stop.name} down`} className="w-6 h-6 grid place-items-center rounded bg-dahi disabled:opacity-30 text-xs">▼</button>
                      </div>
                    </div>
                  )
                })
              })()}
            </div>

            <div className="flex gap-3">
              <Button full onClick={confirmRoute} disabled={routeSaving || !routeBuilder.stops.some((stop) => stop.selected) || (Number(routeBuilder.tipAmount) > 0 && !routeBuilder.partnerId)}>{routeSaving ? 'Creating…' : 'Confirm Route'}</Button>
              <Button variant="outline" onClick={() => setRouteBuilder(null)} disabled={routeSaving}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </PageLayout>
  )
}
