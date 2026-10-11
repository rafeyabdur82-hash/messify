import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import PageLayout from '../../components/common/DeliveryPage.jsx'
import { Card, Badge, Button, EmptyState, Spinner } from '../../components/common/UI.jsx'
import { getDeliveryRoutes } from '../../firebase/firestore.js'

const todayStr = () => new Date().toISOString().slice(0, 10)
const timestamp = (value) => (value?.toMillis ? value.toMillis() : value?.seconds ? value.seconds * 1000 : 0)

function sortRoutes(routes) {
  return [...routes].sort((a, b) => {
    const aCompleted = a.status === 'completed' ? 1 : 0
    const bCompleted = b.status === 'completed' ? 1 : 0
    if (aCompleted !== bCompleted) return aCompleted - bCompleted
    return timestamp(b.createdAt) - timestamp(a.createdAt)
  })
}

function statusLabel(status) {
  if (status === 'not_started') return 'Pending'
  return (status || 'pending').replace(/_/g, ' ')
}

function statusTone(status) {
  if (status === 'completed') return 'success'
  if (status === 'in_progress') return 'info'
  return 'warn'
}

export default function DeliveryDashboard() {
  const { currentUser } = useAuth()
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDeliveryRoutes(currentUser.uid, todayStr()).then((data) => { setRoutes(data); setLoading(false) })
  }, [currentUser])

  if (loading) return <PageLayout><Spinner /></PageLayout>

  return (
    <PageLayout title="Today's Routes" subtitle="View your assigned delivery routes">
      {routes.length === 0 ? (
        <EmptyState icon="🛵" title="Koi route assign nahi hua" message="Jab mess owner aapko route assign karega, wo yahan dikhega." />
      ) : (
        <div className="flex flex-col gap-4">
          {sortRoutes(routes).map((r, i) => (
            <Card key={r.id} className="flex justify-between items-center animate-fadeUp" style={{ animationDelay: `${i * 0.08}s` }}>
              <div>
                <h3 className="text-lg capitalize">{r.meal} Route</h3>
                <p className="text-charcoal-soft text-sm">{(r.stops || []).length} {(r.stops || []).length === 1 ? 'stop' : 'stops'}</p>
              </div>
              <div className="flex gap-3 items-center">
                <Badge tone={statusTone(r.status)}>{statusLabel(r.status)}</Badge>
                <Link to={`/delivery/route/${r.id}`}><Button size="sm">Open Route</Button></Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageLayout>
  )
}
