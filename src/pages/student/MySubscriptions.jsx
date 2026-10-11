import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import PageLayout from '../../components/common/StudentPage.jsx'
import { Card, Badge, Button, EmptyState, Spinner } from '../../components/common/UI.jsx'
import { getStudentSubscriptions, updateSubscriptionStatus } from '../../firebase/firestore.js'
import { resolveMessProfile, resolveMessMenu, planIncludesMeal } from '../../utils/messResolver.js'

const todayStr = () => new Date().toISOString().slice(0, 10)

const STATUS_LABEL = {
  active: { tone: 'success', label: 'Active' },
  pending_payment: { tone: 'warn', label: 'Awaiting Approval' },
  payment_rejected: { tone: 'danger', label: 'Payment Rejected' },
  paused: { tone: 'warn', label: 'Paused' },
}

export default function MySubscriptions() {
  const { currentUser } = useAuth()
  const [subs, setSubs] = useState([])
  const [messInfo, setMessInfo] = useState({})
  const [menus, setMenus] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [currentUser])

  async function load() {
    setLoading(true)
    const data = await getStudentSubscriptions(currentUser.uid)
    setSubs(data)
    const infoMap = {}, menuMap = {}
    for (const s of data) {
      const [mess, menu] = await Promise.all([resolveMessProfile(s.messId), resolveMessMenu(s.messId, todayStr())])
      infoMap[s.messId] = mess
      menuMap[s.messId] = menu
    }
    setMessInfo(infoMap)
    setMenus(menuMap)
    setLoading(false)
  }

  async function toggleStatus(sub) {
    await updateSubscriptionStatus(sub.id, sub.status === 'active' ? 'paused' : 'active')
    load()
  }

  if (loading) return <PageLayout><Spinner /></PageLayout>

  return (
    <PageLayout title="My Subscriptions" subtitle="Manage your active tiffin subscriptions"
      actions={<Link to="/student/browse"><Button variant="outline">+ Subscribe to a new mess</Button></Link>}>
      {subs.length === 0 ? (
        <EmptyState icon="🍱" title="No subscriptions yet" message="Browse a mess and subscribe to your first tiffin." action={<Link to="/student/browse"><Button>Browse Mess</Button></Link>} />
      ) : (
        <div className="flex flex-col gap-4">
          {subs.map((sub, i) => {
            const mess = messInfo[sub.messId]
            const menu = menus[sub.messId]
            return (
              <Card key={sub.id} className="animate-fadeUp" style={{ animationDelay: `${i * 0.08}s` }}>
                <div className="flex justify-between items-start mb-1 flex-wrap gap-2">
                  <div>
                    <h3 className="text-xl">{mess?.messName || 'Mess'}</h3>
                    <p className="text-charcoal-soft text-xs mt-0.5">{mess?.area || ''} {mess?.rating ? `· ${mess.rating.toFixed(1)} ★` : ''}</p>
                  </div>
                  <Badge tone={(STATUS_LABEL[sub.status] || { tone: 'neutral' }).tone}>{(STATUS_LABEL[sub.status] || {}).label || sub.status}</Badge>
                </div>
                <p className="text-charcoal-soft text-sm mt-3 mb-3">Plan: {sub.plan === 'both' ? 'Lunch + Dinner' : sub.plan === 'weekly' ? 'Weekly' : sub.plan === 'monthly' ? 'Monthly' : sub.plan === 'monthly_lunch' ? 'Monthly (Lunch Only)' : sub.plan} · Since {sub.startDate}</p>

                {sub.status === 'active' && (
                  <div className="border-t border-sooji pt-3 flex flex-col gap-2">
                    {planIncludesMeal(sub.plan, 'lunch') && (
                      <div className="flex justify-between text-sm">
                        <span className="font-bold">Lunch</span>
                        <span className="text-charcoal-soft text-right">{menu?.lunch?.items || 'Menu not updated yet'}{menu?.lunch?.price ? ` · ₹${menu.lunch.price}` : ''}</span>
                      </div>
                    )}
                    {planIncludesMeal(sub.plan, 'dinner') && (
                      <div className="flex justify-between text-sm">
                        <span className="font-bold">Dinner</span>
                        <span className="text-charcoal-soft text-right">{menu?.dinner?.items || 'Menu not updated yet'}{menu?.dinner?.price ? ` · ₹${menu.dinner.price}` : ''}</span>
                      </div>
                    )}
                  </div>
                )}
                {sub.status === 'pending_payment' && (
                  <p className="text-sm text-charcoal-soft border-t border-sooji pt-3">Your payment is under review by {mess?.messName || 'the mess owner'}. You'll be notified once it's approved.</p>
                )}
                {sub.status === 'payment_rejected' && (
                  <p className="text-sm text-charcoal-soft border-t border-sooji pt-3">Your payment couldn't be verified. You can try subscribing again from the mess page.</p>
                )}

                {(sub.status === 'active' || sub.status === 'paused') && (
                  <div className="mt-4">
                    <Button variant={sub.status === 'active' ? 'outline' : 'primary'} onClick={() => toggleStatus(sub)}>
                      {sub.status === 'active' ? 'Pause Subscription' : 'Resume Subscription'}
                    </Button>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </PageLayout>
  )
}
