import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import PageLayout from '../../components/common/StudentPage.jsx'
import { Card, Badge, Button, Spinner } from '../../components/common/UI.jsx'
import { getMessProfile, getMenu, createSubscription } from '../../firebase/firestore.js'
import { getDummyMessById } from '../../data/dummyMesses.js'
import { PLANS, calculatePlanPrice } from '../../utils/pricing.js'

const todayStr = () => new Date().toISOString().slice(0, 10)

export default function MessDetail() {
  const { messId } = useParams()
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [mess, setMess] = useState(null)
  const [menu, setMenu] = useState(null)
  const [plan, setPlan] = useState('monthly')
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState(false)

  useEffect(() => {
    async function load() {
      if (messId.startsWith('dummy-')) {
        const dummy = getDummyMessById(messId)
        setMess(dummy)
        setMenu(dummy?.todayMenu || null)
        setLoading(false)
        return
      }
      const [m, menuData] = await Promise.all([getMessProfile(messId), getMenu(messId, todayStr())])
      setMess(m); setMenu(menuData); setLoading(false)
    }
    load()
  }, [messId])

  const lunchPrice = menu?.lunch?.price || 70
  const dinnerPrice = menu?.dinner?.price || 85

  function planPrice(planId) {
    return calculatePlanPrice(planId, menu)
  }

  async function handleSubscribe() {
    setSubscribing(true)
    if (messId.startsWith('dummy-')) {
      // Demo listings have no real owner to receive payment or approve it,
      // so subscribing to one activates immediately (for exploring the app).
      await createSubscription(currentUser.uid, messId, plan, 'active')
      setSubscribing(false)
      navigate('/student/subscriptions')
      return
    }
    // Real messes go through checkout: delivery details, then UPI QR payment or cash on delivery.
    setSubscribing(false)
    navigate(`/student/mess/${messId}/checkout?plan=${plan}`)
  }

  if (loading) return <PageLayout><Spinner /></PageLayout>
  if (!mess) return <PageLayout><p>Mess not found.</p></PageLayout>

  return (
    <PageLayout>
      <div className="flex justify-between items-start flex-wrap gap-4 mb-6 animate-fadeUp">
        <div>
          <h1 className="text-2xl md:text-[32px]">{mess.messName}</h1>
          <p className="text-charcoal-soft text-sm mt-2">{mess.area} · {mess.rating?.toFixed(1) || 'New'} ★</p>
        </div>
        <Badge tone="success">{mess.subscriberCount || 0} active subscribers</Badge>
      </div>

      <Card className="animate-fadeUp" style={{ animationDelay: '.1s' }}>
        <h3 className="text-lg mb-3">Today's menu</h3>
        <div className="mb-5">
          <div className="flex justify-between py-3 border-t border-sooji text-sm"><span>Lunch</span><span>{menu?.lunch?.items || 'Not updated yet'} {menu?.lunch?.price ? `· ₹${menu.lunch.price}` : ''}</span></div>
          <div className="flex justify-between py-3 border-t border-sooji text-sm"><span>Dinner</span><span>{menu?.dinner?.items || 'Not updated yet'} {menu?.dinner?.price ? `· ₹${menu.dinner.price}` : ''}</span></div>
        </div>

        <h3 className="text-lg mb-3">Choose a subscription plan</h3>
        <div className="grid sm:grid-cols-3 gap-3 mb-5">
          {PLANS.map((p) => (
            <button key={p.id} type="button" onClick={() => setPlan(p.id)}
              className={`text-center p-4 border-[1.5px] rounded-xl transition-all hover:-translate-y-0.5 ${plan === p.id ? 'border-masala bg-masala/5' : 'border-sooji'}`}>
              <strong className="block text-[15px] mb-1">{p.label}</strong>
              <span className="text-[13px] text-charcoal-soft block mb-2">{p.desc}</span>
              <span className="font-mono font-bold text-masala text-lg">₹{planPrice(p.id)}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-charcoal-soft mb-5">Prices include a bundled discount compared to paying per day. Billing stays skip-adjusted — see your Billing page for details.</p>

        <Button full disabled={subscribing} onClick={handleSubscribe}>{subscribing ? 'Setting up...' : `Continue to Checkout — ₹${planPrice(plan)}`}</Button>
        {!messId.startsWith('dummy-') && (
          <p className="text-xs text-charcoal-soft mt-3">You'll pay the mess owner directly via UPI QR code on the next step. Your subscription activates once they approve your payment.</p>
        )}
      </Card>
    </PageLayout>
  )
}
