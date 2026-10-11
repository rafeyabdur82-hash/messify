import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import PageLayout from '../../components/common/DeliveryPage.jsx'
import { Card, Button, Spinner, Badge } from '../../components/common/UI.jsx'
import LiveMap from '../../components/common/LiveMap.jsx'
import { listenRoute, listenUserProfile, startRoute, completeStop, updateRouteLocation, getUserProfile, getMessProfile } from '../../firebase/firestore.js'
import { geocodeAddress } from '../../utils/location.js'

const SEND_EVERY_MS = 8000 // how often the live position is written to Firestore

function mapsLink(stop) {
  const q = stop.lat && stop.lng ? `${stop.lat},${stop.lng}` : encodeURIComponent(stop.address || '')
  return `https://www.google.com/maps/dir/?api=1&destination=${q}`
}

export default function RouteView() {
  const { routeId } = useParams()
  const [route, setRoute] = useState(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [sharing, setSharing] = useState(false)
  const [geoError, setGeoError] = useState('')
  const lastSent = useRef(0)
  const [myPos, setMyPos] = useState(null)
  const [geo, setGeo] = useState({}) // address -> {lat,lng} for stops saved without coordinates
  const [messPoint, setMessPoint] = useState(null)
  const [riderLabel, setRiderLabel] = useState('Delivery partner')
  const [studentLiveLocations, setStudentLiveLocations] = useState({})
  const routeStudentIds = [...new Set((route?.stops || []).map((stop) => stop.studentId).filter(Boolean))].join('|')

  useEffect(() => listenRoute(routeId, setRoute), [routeId])

  useEffect(() => {
    if (!route?.messId) return undefined
    let cancelled = false
    ;(async () => {
      try {
        const [userProfile, publicProfile] = await Promise.all([
          getUserProfile(route.messId).catch(() => null),
          getMessProfile(route.messId).catch(() => null),
        ])
        const profile = { ...(publicProfile || {}), ...(userProfile || {}) }
        const label = route.messLocation?.label || profile.messName || publicProfile?.messName || 'Mess'
        const savedPoint = route.messLocation?.lat != null && route.messLocation?.lng != null ? route.messLocation : profile
        if (savedPoint.lat != null && savedPoint.lng != null) {
          if (!cancelled) setMessPoint({ lat: Number(savedPoint.lat), lng: Number(savedPoint.lng), label })
          return
        }
        const point = await geocodeAddress(profile.fullAddress || profile.area || publicProfile?.area)
        if (!cancelled) setMessPoint(point ? { ...point, label } : null)
      } catch { if (!cancelled) setMessPoint(null) }
    })()
    return () => { cancelled = true }
  }, [route?.messId])

  useEffect(() => {
    if (!route?.deliveryPersonId) return undefined
    let cancelled = false
    getUserProfile(route.deliveryPersonId)
      .then((profile) => { if (!cancelled) setRiderLabel(profile?.name || 'Delivery partner') })
      .catch(() => { if (!cancelled) setRiderLabel('Delivery partner') })
    return () => { cancelled = true }
  }, [route?.deliveryPersonId])

  useEffect(() => {
    const studentIds = routeStudentIds ? routeStudentIds.split('|') : []
    if (studentIds.length === 0) { setStudentLiveLocations({}); return undefined }
    setStudentLiveLocations({})
    const unsubscribers = studentIds.map((studentId) => listenUserProfile(studentId, (profile) => {
      setStudentLiveLocations((current) => ({ ...current, [studentId]: profile?.liveLocation || null }))
    }))
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe())
  }, [routeStudentIds])

  const live = route?.status === 'in_progress'

  // Watch the phone's GPS while the route runs: always draws it on the map, and writes it to Firestore only while sharing.
  useEffect(() => {
    if (!live) return undefined
    if (!('geolocation' in navigator)) { setGeoError('This browser cannot read your location.'); return undefined }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy, heading } = pos.coords
        setMyPos({ lat: latitude, lng: longitude })
        setGeoError('')
        const now = Date.now()
        if (!sharingRef.current || now - lastSent.current < SEND_EVERY_MS) return
        lastSent.current = now
        updateRouteLocation(routeId, { lat: latitude, lng: longitude, accuracy, heading })
          .catch((err) => console.error('Location update failed', err))
      },
      (err) => {
        setGeoError(err.code === err.PERMISSION_DENIED ? 'Location permission was denied. Allow it in the browser to see yourself on the map and share live location.' : 'Could not read your location.')
        setSharing(false)
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [live, routeId])

  const sharingRef = useRef(false)
  useEffect(() => { sharingRef.current = sharing }, [sharing])

  // Stops saved without coordinates (student typed the address) are looked up once on OpenStreetMap so they still appear on the map.
  useEffect(() => {
    if (!route) return undefined
    let cancelled = false
    ;(async () => {
      for (const st of route.stops) {
        if (cancelled) return
        if (st.lat != null && st.lng != null || !st.address || geo[st.address]) continue
        try {
          const studentProfile = st.studentId ? await getUserProfile(st.studentId).catch(() => null) : null
          const hasProfileGps = studentProfile?.lat != null && studentProfile?.lng != null
          const point = hasProfileGps
            ? { lat: Number(studentProfile.lat), lng: Number(studentProfile.lng) }
            : await geocodeAddress(st.address)
          setGeo((g) => ({ ...g, [st.address]: point || { lat: null, lng: null } }))
          if (!hasProfileGps) await new Promise((res) => setTimeout(res, 1100)) // Nominatim: max 1 request/second
        } catch { /* map is optional */ }
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route?.stops?.length])

  if (!route) return <PageLayout><Spinner /></PageLayout>

  const isComplete = route.status === 'completed' || route.currentStopIndex >= route.stops.length

  async function handleStart() {
    setBusy(true)
    setActionError('')
    setActionMessage('')
    try {
      await startRoute(routeId)
      setSharing(true)
      setActionMessage('Route started. Mark each stop delivered after handing over the tiffin.')
    } catch (error) {
      console.error('Could not start delivery route:', error)
      setActionError(error.code === 'permission-denied'
        ? 'Route access was denied. Confirm that this route is assigned to your delivery account and that the latest Firestore rules are published.'
        : 'Could not start the route. Check your connection and try again.')
    } finally { setBusy(false) }
  }

  async function handleDelivered() {
    if (!route || route.status !== 'in_progress' || isComplete || busy) return
    setBusy(true)
    setActionError('')
    setActionMessage('')
    try {
      await completeStop(route, route.currentStopIndex)
      setActionMessage(route.currentStopIndex + 1 >= route.stops.length
        ? (Number(route.tipAmount) > 0 ? 'Route completed. The tip has been credited to your earnings.' : 'Route completed. All stops are delivered.')
        : `Stop ${route.currentStopIndex + 1} delivered successfully.`)
    } catch (error) {
      console.error('Could not mark delivery stop complete:', error)
      setActionError(error.code === 'permission-denied'
        ? 'Firestore denied this update. Publish the latest firestore.rules; a route with a tip is credited only when its final stop is marked delivered.'
        : 'Could not save this delivery. Check your connection and try again.')
    } finally { setBusy(false) }
  }

  return (
    <PageLayout title={`${route.meal[0].toUpperCase() + route.meal.slice(1)} Route`} subtitle={`${route.stops.length} stops total`}>
      <Card className="animate-fadeUp">
        {isComplete ? (
          <p className="text-center font-bold text-success">✅ Route complete — all tiffins delivered!</p>
        ) : route.status === 'not_started' ? (
          <Button full disabled={busy} onClick={handleStart}>{busy ? 'Starting…' : 'Start Route & Share Live Location'}</Button>
        ) : (
          <>
            {actionError && <p role="alert" className="text-danger text-sm mb-3">{actionError}</p>}
            {actionMessage && <p role="status" className="text-success text-sm mb-3">{actionMessage}</p>}
            <Button full disabled={busy} onClick={handleDelivered}>{busy ? 'Saving…' : `Mark Stop ${route.currentStopIndex + 1} Delivered`}</Button>
            <div className="flex items-center justify-between gap-3 mt-4 p-3 bg-dahi rounded-xl">
              <div className="text-sm">
                <strong>Live location</strong>
                <p className="text-xs text-charcoal-soft">{sharing ? 'Students on this route can see where you are.' : 'Turn on so students can track you on the map.'}</p>
              </div>
              <Button size="sm" variant={sharing ? 'outline' : 'primary'} onClick={() => setSharing((s) => !s)}>{sharing ? 'Stop sharing' : 'Share location'}</Button>
            </div>
            {geoError && <p className="text-danger text-xs mt-2">{geoError}</p>}
          </>
        )}
        {route.status === 'not_started' && actionError && <p role="alert" className="text-danger text-sm mt-3">{actionError}</p>}
        {route.status === 'not_started' && actionMessage && <p role="status" className="text-success text-sm mt-3">{actionMessage}</p>}

        <div className="mt-5">
          <LiveMap
            rider={myPos || route.liveLocation}
            riderLabel={riderLabel}
            origin={messPoint}
            stops={route.stops.map((st, i) => {
              const liveLocation = studentLiveLocations[st.studentId]
              const updatedAt = liveLocation?.updatedAt?.toMillis?.() ?? (liveLocation?.updatedAt?.seconds ? liveLocation.updatedAt.seconds * 1000 : 0)
              const freshLocation = live && Date.now() - updatedAt < 30000 && liveLocation?.lat != null && liveLocation?.lng != null
                ? liveLocation
                : null
              const c = freshLocation || (st.lat != null && st.lng != null ? st : geo[st.address] || {})
              return { lat: c.lat, lng: c.lng, label: `${i + 1}. ${st.name || 'Student'}`, done: i < route.currentStopIndex, current: i === route.currentStopIndex && !isComplete }
            })}
            className="h-72 md:h-96 w-full rounded-xl overflow-hidden border border-sooji z-0"
          />
          <p className="text-xs text-charcoal-soft mt-2">
            {myPos ? 'Your position (maroon dot) updates live.' : live ? 'Waiting for your GPS position…' : 'Start the route to see your live position.'} Dashed line connects the mess, you, and delivery stops.
          </p>
        </div>

        <div className="flex flex-col gap-3 mt-5">
          {route.stops.map((stop, i) => {
            const done = i < route.currentStopIndex
            const current = i === route.currentStopIndex && !isComplete
            return (
              <div key={i} className={`flex justify-between items-center gap-3 p-4 border-[1.5px] rounded-xl transition-opacity ${
                done ? 'border-sooji opacity-55' : current ? 'border-haldi bg-[#FFF8E9]' : 'border-sooji bg-white'
              }`}>
                <div className="flex items-start min-w-0">
                  <span className={`w-7 h-7 grid place-items-center rounded-full font-mono text-[13px] font-bold mr-3 flex-shrink-0 ${
                    done ? 'bg-success text-white' : current ? 'bg-haldi' : 'bg-sooji'
                  }`}>{i + 1}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{stop.name || 'Student'}{stop.slotNote ? ` · ${stop.slotNote}` : ''}</div>
                    <div className="text-xs text-charcoal-soft">{stop.address}</div>
                    {stop.landmark && <div className="text-xs text-charcoal-soft">Drop: {stop.landmark}</div>}
                    {stop.dietaryNote && <div className="text-xs text-masala">Note: {stop.dietaryNote}</div>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  {done ? <Badge tone="success">Delivered</Badge> : (
                    <>
                      {stop.phone && <a className="text-xs font-bold text-tamarind" href={`tel:${stop.phone}`}>📞 Call</a>}
                      <a className="text-xs font-bold text-masala" href={mapsLink(stop)} target="_blank" rel="noreferrer">🧭 Navigate</a>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </PageLayout>
  )
}
