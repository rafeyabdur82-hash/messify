import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import PageLayout from '../../components/common/StudentPage.jsx'
import { Card, Badge, Spinner } from '../../components/common/UI.jsx'
import LiveMap from '../../components/common/LiveMap.jsx'
import { getMessProfile, getUserProfile, listenRoute } from '../../firebase/firestore.js'
import { geocodeAddress } from '../../utils/location.js'

function agoText(ts) {
  if (!ts?.toDate) return ''
  const secs = Math.max(0, Math.round((Date.now() - ts.toDate().getTime()) / 1000))
  if (secs < 60) return `${secs}s ago`
  return `${Math.round(secs / 60)} min ago`
}

export default function TrackDelivery() {
  const { orderId } = useParams() // the route id
  const { currentUser, profile } = useAuth()
  const [route, setRoute] = useState(null)
  const [missing, setMissing] = useState(false)
  const [messPoint, setMessPoint] = useState(null)
  const [studentPoint, setStudentPoint] = useState(null)
  const [, setTick] = useState(0)

  useEffect(() => listenRoute(orderId, (r) => { setRoute(r); setMissing(!r) }), [orderId])
  useEffect(() => {
    if (!route?.messId) return undefined
    let cancelled = false
    ;(async () => {
      const [userProfile, publicProfile] = await Promise.all([
        getUserProfile(route.messId).catch(() => null),
        getMessProfile(route.messId).catch(() => null),
      ])
      const profile = { ...(publicProfile || {}), ...(userProfile || {}) }
      const point = await geocodeAddress(profile.fullAddress || profile.area || publicProfile?.area).catch(() => null)
      if (!cancelled) setMessPoint(point ? { ...point, label: profile.messName || publicProfile?.messName || 'Mess' } : null)
    })()
    return () => { cancelled = true }
  }, [route?.messId])
  useEffect(() => {
    const stop = route?.stops?.find((item) => item.studentId === currentUser.uid)
    if (!stop) { setStudentPoint(null); return undefined }
    if (stop.lat != null && stop.lng != null) {
      setStudentPoint(null)
      return undefined
    }
    if (profile?.lat != null && profile?.lng != null) {
      setStudentPoint({ lat: Number(profile.lat), lng: Number(profile.lng) })
      return undefined
    }
    let cancelled = false
    geocodeAddress(stop.address).then((point) => { if (!cancelled) setStudentPoint(point) }).catch(() => {})
    return () => { cancelled = true }
  }, [route?.stops, currentUser.uid, profile?.lat, profile?.lng])
  // keep the "x seconds ago" label fresh
  useEffect(() => { const t = setInterval(() => setTick((n) => n + 1), 10000); return () => clearInterval(t) }, [])

  if (missing) return <PageLayout><p className="text-charcoal-soft">This delivery route could not be found.</p></PageLayout>
  if (!route) return <PageLayout><Spinner /></PageLayout>

  const { stops, currentStopIndex, status, liveLocation } = route
  const myIndex = Math.max(0, stops.findIndex((s) => s.studentId === currentUser.uid))
  const mine = stops[myIndex]
  const stopsAway = myIndex - currentStopIndex
  const delivered = currentStopIndex > myIndex || mine?.status === 'delivered'
  const arriving = !delivered && status === 'in_progress' && stopsAway === 0

  const headline = delivered ? 'Delivered ✅' : status !== 'in_progress' ? 'Not started yet' : arriving ? 'Arriving now' : `${stopsAway} stop${stopsAway === 1 ? '' : 's'} away`
  const eta = Math.max(3, stopsAway * 4)

  return (
    <PageLayout title="Tiffin Tracking" subtitle="Live route status">
      <Card className="text-center py-9 animate-fadeUp">
        <Badge tone={status === 'in_progress' ? 'success' : 'neutral'}>{delivered ? 'Delivered' : status === 'in_progress' ? 'On the way' : 'Not started yet'}</Badge>
        <div className="font-mono text-[34px] font-bold text-masala mt-4">{headline}</div>
        {!delivered && status === 'in_progress' && !arriving && <p className="text-charcoal-soft text-sm mt-2">Estimated arrival: ~{eta} minutes</p>}
      </Card>

      <Card className="mt-6 animate-fadeUp" style={{ animationDelay: '.1s' }}>
        <div className="flex justify-between items-center gap-3 mb-3 flex-wrap">
          <h3 className="text-base font-bold">Live location</h3>
          {liveLocation && <span className="text-xs text-charcoal-soft">Updated {agoText(liveLocation.updatedAt)}</span>}
        </div>
        {liveLocation ? (
          <LiveMap
            rider={liveLocation}
            origin={messPoint}
            destination={mine && (mine.lat != null && mine.lng != null || studentPoint) ? { ...(studentPoint || {}), ...(mine.lat != null && mine.lng != null ? { lat: mine.lat, lng: mine.lng } : {}), label: mine.name || 'Your location' } : null}
          />
        ) : (
          <div className="py-10 text-center bg-dahi rounded-xl text-sm text-charcoal-soft">
            {delivered ? 'Your tiffin has been delivered.' : status === 'in_progress' ? "Waiting for the delivery partner to share their live location." : 'The map appears once the delivery partner starts the route.'}
          </div>
        )}
      </Card>

      <Card className="mt-6 animate-fadeUp" style={{ animationDelay: '.15s' }}>
        <h3 className="text-base font-bold mb-4">Route Progress</h3>
        <div className="flex items-center gap-1 mb-3">
          {stops.map((stop, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className={`w-3.5 h-3.5 rounded-full ring-2 ring-white shadow flex-shrink-0 ${
                i < currentStopIndex ? 'bg-success' : i === currentStopIndex ? 'bg-haldi animate-pulseDot' : 'bg-sooji'
              } ${i === myIndex ? 'ring-masala' : ''}`} title={i === myIndex ? 'Your stop' : `Stop ${i + 1}`} />
              {i < stops.length - 1 && <div className={`flex-1 h-[3px] ${i < currentStopIndex ? 'bg-success' : 'bg-sooji'}`} />}
            </div>
          ))}
        </div>
        <p className="text-xs text-charcoal-soft">You are stop {myIndex + 1} of {stops.length}. The delivery partner is at stop {Math.min(currentStopIndex + 1, stops.length)}.</p>
      </Card>
    </PageLayout>
  )
}
