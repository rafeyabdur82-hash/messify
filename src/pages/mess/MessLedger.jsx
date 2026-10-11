import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import PageLayout from '../../components/common/MessPage.jsx'
import { Card } from '../../components/common/UI.jsx'
import { getMessSubscribers, getMenu, listenMessPayments } from '../../firebase/firestore.js'
import { planIncludesMeal } from '../../utils/messResolver.js'

const todayStr = () => new Date().toISOString().slice(0, 10)

function fmtDate(ts) {
  if (!ts?.toDate) return ''
  return ts.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export default function MessLedger() {
  const { currentUser } = useAuth()
  const [subs, setSubs] = useState([])
  const [menu, setMenu] = useState(null)
  const [payments, setPayments] = useState([])

  useEffect(() => {
    async function load() {
      const [subData, menuData] = await Promise.all([getMessSubscribers(currentUser.uid), getMenu(currentUser.uid, todayStr())])
      setSubs(subData); setMenu(menuData)
    }
    load()
  }, [currentUser])

  useEffect(() => {
    if (!currentUser) return
    const unsub = listenMessPayments(currentUser.uid, setPayments)
    return unsub
  }, [currentUser])

  const lunchPrice = menu?.lunch?.price || 0
  const dinnerPrice = menu?.dinner?.price || 0
  const lunchSubs = subs.filter((s) => planIncludesMeal(s.plan, 'lunch')).length
  const dinnerSubs = subs.filter((s) => planIncludesMeal(s.plan, 'dinner')).length
  const estimatedDaily = lunchSubs * lunchPrice + dinnerSubs * dinnerPrice
  const estimatedMonthly = estimatedDaily * 30

  const approvedPayments = payments.filter((p) => p.status === 'approved')
  const totalRevenue = approvedPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
  const totalCommission = approvedPayments.reduce((sum, p) => sum + (p.commission || 0), 0)
  const totalEarnings = approvedPayments.reduce((sum, p) => sum + (p.messEarning || 0), 0)

  return (
    <PageLayout title="Ledger & Earnings" subtitle="Confirmed payments and projected revenue">
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <Card className="flex flex-col gap-1.5 animate-fadeUp">
          <span className="text-xs text-charcoal-soft font-semibold">Confirmed earnings (all time)</span>
          <span className="font-mono text-[26px] font-bold text-masala">₹{totalEarnings}</span>
        </Card>
        <Card className="flex flex-col gap-1.5 animate-fadeUp" style={{ animationDelay: '.06s' }}>
          <span className="text-xs text-charcoal-soft font-semibold">Total revenue processed</span>
          <span className="font-mono text-[26px] font-bold text-masala">₹{totalRevenue}</span>
        </Card>
        <Card className="flex flex-col gap-1.5 animate-fadeUp" style={{ animationDelay: '.12s' }}>
          <span className="text-xs text-charcoal-soft font-semibold">Platform fee paid (3%)</span>
          <span className="font-mono text-[26px] font-bold text-charcoal-soft">₹{totalCommission}</span>
        </Card>
      </div>

      <Card className="mb-6 animate-fadeUp" style={{ animationDelay: '.18s' }}>
        <h3 className="text-base font-bold mb-3">Confirmed Payments</h3>
        {approvedPayments.length === 0 ? (
          <p className="text-charcoal-soft text-sm">No approved payments yet. Once you approve a student's payment, it'll show up here.</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-charcoal-soft">
                <th className="text-left py-2 border-b-2 border-sooji">Date</th>
                <th className="text-left py-2 border-b-2 border-sooji">Student</th>
                <th className="text-left py-2 border-b-2 border-sooji">Plan</th>
                <th className="text-right py-2 border-b-2 border-sooji">You Received</th>
              </tr>
            </thead>
            <tbody>
              {approvedPayments.map((p) => (
                <tr key={p.id} className="text-sm">
                  <td className="py-2.5 border-b border-sooji">{fmtDate(p.createdAt)}</td>
                  <td className="py-2.5 border-b border-sooji">{p.payerName}</td>
                  <td className="py-2.5 border-b border-sooji capitalize">{p.plan}</td>
                  <td className="py-2.5 border-b border-sooji text-right font-mono">₹{p.messEarning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card className="animate-fadeUp" style={{ animationDelay: '.24s' }}>
        <h3 className="text-base font-bold mb-3">Projected Revenue (based on today's menu prices)</h3>
        <div className="flex justify-between py-2.5 border-t border-sooji text-sm"><span>Today's estimate</span><span className="font-mono">₹{estimatedDaily}</span></div>
        <div className="flex justify-between py-2.5 border-t border-sooji text-sm"><span>Monthly estimate (30 days)</span><span className="font-mono">₹{estimatedMonthly}</span></div>
        <div className="flex justify-between py-2.5 border-t border-sooji text-sm"><span>Lunch subscribers × price</span><span className="font-mono">{lunchSubs} × ₹{lunchPrice}</span></div>
        <div className="flex justify-between py-2.5 border-t border-sooji text-sm"><span>Dinner subscribers × price</span><span className="font-mono">{dinnerSubs} × ₹{dinnerPrice}</span></div>
        <p className="text-xs text-charcoal-soft mt-4">This is a projection based on active subscriptions and today's menu price — not actual confirmed income. See "Confirmed Payments" above for real earnings.</p>
      </Card>
    </PageLayout>
  )
}
