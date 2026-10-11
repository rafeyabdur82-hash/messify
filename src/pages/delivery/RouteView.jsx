import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import PageLayout from '../../components/common/DeliveryPage.jsx'
import { Card, Button, Spinner, Badge } from '../../components/common/UI.jsx'
import LiveMap from '../../components/common/LiveMap.jsx'
import { listenRoute, startRoute, completeStop, updateRouteLocation } from '../../firebase/firestore.js'

const SEND_EVERY_MS = 8000 // how often the live position is written to Firestore

function mapsLink(stop) {
  const q = stop.lat && stop.lng ? `${stop.lat},${stop.lng}` : encodeURIComponent(stop.address || '')
  return `https://www.google.com/maps/dir/?api=1&destination=${q}`
}

export default function RouteView() {
  const { routeId } = useParams()
  const [route, setRoute] = useState(null)
  const [busy, setBusy] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [geoError, setGeoError] = useState('')
  const lastSent = useRef(0)
  const [myPos, setMyPos] = useState(null)
  const [geo, setGeo] = useState({}) // address -> {lat,lng} for stops saved without coordinates

  useEffect(() => listenRoute(routeId, setRoute), [routeId])

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
        if (st.lat != null || !st.address || geo[st.address]) continue
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(st.address)}`)
          const j = await r.json()
          if (j[0]) setGeo((g) => ({ ...g, [st.address]: { lat: Number(j[0].lat), lng: Number(j[0].lon) } }))
          else setGeo((g) => ({ ...g, [st.address]: { lat: null, lng: null } }))
        } catch { /* map is optional */ }
        await new Promise((res) => setTimeout(res, 1100)) // Nominatim: max 1 request/second
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route?.stops?.length])

  if (!route) return <PageLayout><Spinner /></PageLayout>

  const isComplete = route.status === 'completed' || route.currentStopIndex >= route.stops.length

  async function handleStart() {
    setBusy(true)
    try { await startRoute(routeId); setSharing(true) } finally { setBusy(false) }
  }

  async function handleDelivered() {
    setBusy(true)
    try { await completeStop(route, route.currentStopIndex) } finally { setBusy(false) }
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

        <div className="mt-5">
          <LiveMap
            rider={myPos || route.liveLocation}
            stops={route.stops.map((st, i) => {
              const c = st.lat != null ? st : geo[st.address] || {}
              return { lat: c.lat, lng: c.lng, label: st.name || 'Student', done: i < route.currentStopIndex, current: i === route.currentStopIndex && !isComplete }
            })}
            className="h-72 md:h-96 w-full rounded-xl overflow-hidden border border-sooji z-0"
          />
          <p className="text-xs text-charcoal-soft mt-2">
            {myPos ? 'Your position (maroon dot) updates live.' : live ? 'Waiting for your GPS position…' : 'Start the route to see your live position.'} Stops: green delivered, amber next, grey later.
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
