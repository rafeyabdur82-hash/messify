import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import PageLayout from '../../components/common/DeliveryPage.jsx'
import StatCard from '../../components/common/StatCard.jsx'
import { Card, Badge, EmptyState, Spinner } from '../../components/common/UI.jsx'
import { getDeliveryHistory, getMessProfile } from '../../firebase/firestore.js'

const delivered = (r) => (r.stops || []).filter((s) => s.status === 'delivered').length

export default function DeliveryHistory() {
  const { currentUser } = useAuth()
  const [routes, setRoutes] = useState(null)
  const [messNames, setMessNames] = useState({})

  useEffect(() => {
    async function load() {
      const list = await getDeliveryHistory(currentUser.uid)
      setRoutes(list)
      const ids = [...new Set(list.map((r) => r.messId))]
      const profiles = await Promise.all(ids.map((id) => getMessProfile(id).catch(() => null)))
      setMessNames(Object.fromEntries(ids.map((id, i) => [id, profiles[i]?.messName || 'Mess'])))
    }
    load()
  }, [currentUser])

  if (routes === null) return <PageLayout><Spinner /></PageLayout>

  const today = new Date().toISOString().slice(0, 10)
  const totalDelivered = routes.reduce((n, r) => n + delivered(r), 0)
  const todayDelivered = routes.filter((r) => r.date === today).reduce((n, r) => n + delivered(r), 0)
  const completedRoutes = routes.filter((r) => r.status === 'completed').length

  return (
    <PageLayout title="Completed Orders" subtitle="Your delivery history">
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard icon="📦" label="Orders delivered" value={totalDelivered} />
        <StatCard icon="📅" label="Delivered today" value={todayDelivered} color="haldi" />
        <StatCard icon="🛵" label="Routes completed" value={completedRoutes} />
      </div>

      {routes.length === 0 ? (
        <EmptyState icon="📦" title="No deliveries yet" message="Completed routes will show up here." />
      ) : (
        <div className="flex flex-col gap-3">
          {routes.map((r) => (
            <Card key={r.id} className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <strong className="text-sm capitalize">{r.meal} · {r.date}</strong>
                <p className="text-xs text-charcoal-soft">{messNames[r.messId] || 'Mess'}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-bold">{delivered(r)}/{(r.stops || []).length} delivered</span>
                <Badge tone={r.status === 'completed' ? 'success' : r.status === 'in_progress' ? 'warn' : 'neutral'}>{(r.status || '').replace('_', ' ')}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageLayout>
  )
}
