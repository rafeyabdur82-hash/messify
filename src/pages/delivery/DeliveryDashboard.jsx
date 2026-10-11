import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import PageLayout from '../../components/common/DeliveryPage.jsx'
import { Card, Badge, Button, EmptyState, Spinner } from '../../components/common/UI.jsx'
import { getDeliveryRoutes } from '../../firebase/firestore.js'

const todayStr = () => new Date().toISOString().slice(0, 10)

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
          {routes.map((r, i) => (
            <Card key={r.id} className="flex justify-between items-center animate-fadeUp" style={{ animationDelay: `${i * 0.08}s` }}>
              <div>
                <h3 className="text-lg capitalize">{r.meal} Route</h3>
                <p className="text-charcoal-soft text-sm">{r.stops.length} stops</p>
              </div>
              <div className="flex gap-3 items-center">
                <Badge tone={r.status === 'in_progress' ? 'success' : 'neutral'}>{r.status.replace('_', ' ')}</Badge>
                <Link to={`/delivery/route/${r.id}`}><Button size="sm">Open Route</Button></Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageLayout>
  )
}
