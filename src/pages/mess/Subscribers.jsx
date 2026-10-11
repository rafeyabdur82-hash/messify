import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import PageLayout from '../../components/common/MessPage.jsx'
import { Card, Badge, EmptyState, Spinner } from '../../components/common/UI.jsx'
import { getMessSubscribers, getUserProfile } from '../../firebase/firestore.js'
import { formatINR } from '../../constants.js'

const PLAN_LABEL = { both: 'Lunch + Dinner', weekly: 'Weekly', monthly: 'Monthly', monthly_lunch: 'Monthly (Lunch only)', lunch: 'Lunch', dinner: 'Dinner' }

export default function Subscribers() {
  const { currentUser } = useAuth()
  const [subs, setSubs] = useState([])
  const [students, setStudents] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const data = await getMessSubscribers(currentUser.uid)
      setSubs(data)
      const map = {}
      await Promise.all(data.map(async (s) => { map[s.studentId] = await getUserProfile(s.studentId).catch(() => null) }))
      setStudents(map)
      setLoading(false)
    }
    load()
  }, [currentUser])

  if (loading) return <PageLayout><Spinner /></PageLayout>

  return (
    <PageLayout title="Subscribers" subtitle={`${subs.length} active students`}>
      {subs.length === 0 ? (
        <EmptyState icon="👥" title="No subscribers yet" message="When students subscribe to your mess, they'll show up here." />
      ) : (
        <Card className="animate-fadeUp">
          {subs.map((s) => {
            const st = students[s.studentId]
            const cod = s.paymentMethod === 'cod'
            return (
              <div key={s.id} className="flex justify-between items-start gap-4 py-3.5 border-t border-sooji first:border-t-0">
                <div className="min-w-0">
                  <strong className="text-sm">{s.deliveryName || st?.name || 'Student'}</strong>
                  <p className="text-xs text-charcoal-soft mt-0.5">{s.deliveryPhone || st?.phone} · {s.deliveryAddress || st?.area}</p>
                  {s.deliveryLandmark && <p className="text-xs text-charcoal-soft">Drop: {s.deliveryLandmark}</p>}
                  {s.dietaryNote && <p className="text-xs text-masala mt-0.5">Diet note: {s.dietaryNote}</p>}
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <Badge tone="info">{PLAN_LABEL[s.plan] || s.plan}</Badge>
                  {cod
                    ? <Badge tone="warn">Cash on delivery{s.amount ? ` · ${formatINR(s.amount)}` : ''}</Badge>
                    : s.paymentStatus === 'paid' ? <Badge tone="success">Paid (UPI)</Badge> : null}
                </div>
              </div>
            )
          })}
        </Card>
      )}
    </PageLayout>
  )
}
