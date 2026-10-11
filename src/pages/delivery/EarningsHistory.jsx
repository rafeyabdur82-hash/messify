import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import PageLayout from '../../components/common/DeliveryPage.jsx'
import StatCard from '../../components/common/StatCard.jsx'
import { Badge, Button, Card, EmptyState, Spinner } from '../../components/common/UI.jsx'
import { getDeliveryPayments } from '../../firebase/firestore.js'
import { formatINR } from '../../constants.js'

function paidDate(payment) {
  const date = payment.paidAt?.toDate?.()
  if (date) return date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
  return payment.date || 'Date unavailable'
}

function paidDateKey(payment) {
  const date = payment.paidAt?.toDate?.()
  return date ? date.toISOString().slice(0, 10) : payment.date || ''
}

export default function EarningsHistory() {
  const { currentUser } = useAuth()
  const [payments, setPayments] = useState(null)

  useEffect(() => {
    let cancelled = false
    getDeliveryPayments(currentUser.uid)
      .then((items) => { if (!cancelled) setPayments(items) })
      .catch((error) => {
        console.error('Could not load delivery earnings:', error)
        if (!cancelled) setPayments([])
      })
    return () => { cancelled = true }
  }, [currentUser])

  const summary = useMemo(() => {
    if (!payments) return { total: 0, today: 0, month: 0 }
    const today = new Date().toISOString().slice(0, 10)
    const month = today.slice(0, 7)
    return payments.reduce((totals, payment) => {
      const amount = Number(payment.amount) || 0
      const key = paidDateKey(payment)
      totals.total += amount
      if (key === today) totals.today += amount
      if (key.startsWith(month)) totals.month += amount
      return totals
    }, { total: 0, today: 0, month: 0 })
  }, [payments])

  if (payments === null) return <PageLayout><Spinner /></PageLayout>

  return (
    <PageLayout title="Tip & Payment History" subtitle="Tips credited to your in-app delivery earnings">
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard icon="💰" label="Total tips" value={formatINR(summary.total)} />
        <StatCard icon="📅" label="Credited today" value={formatINR(summary.today)} color="haldi" />
        <StatCard icon="🗓️" label="Credited this month" value={formatINR(summary.month)} />
      </div>

      <div className="rounded-xl bg-dahi px-4 py-3 text-sm text-charcoal-soft">
        These entries are tips added to your Messify delivery earnings when a mess owner creates a route. They are not bank transfers or cash-out records.
      </div>

      {payments.length === 0 ? (
        <EmptyState icon="payments" title="No tips credited yet" message="Tips from routes assigned to you will appear here with their date and route details." />
      ) : (
        <div className="flex flex-col gap-3">
          {payments.map((payment) => (
            <Card key={payment.id} className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-sm capitalize">{payment.meal || 'Delivery'} route tip</strong>
                  <Badge tone="success">Credited</Badge>
                </div>
                <p className="text-xs text-charcoal-soft mt-1">{payment.messName || 'Mess'} · {paidDate(payment)}</p>
                <p className="text-xs text-charcoal-soft mt-1">{payment.stopCount || 0} {(payment.stopCount || 0) === 1 ? 'order' : 'orders'} · Route date: {payment.date || '—'}</p>
              </div>
              <div className="flex items-center gap-3">
                <strong className="font-mono text-lg text-success">+{formatINR(payment.amount)}</strong>
                {payment.routeId && <Link to={`/delivery/route/${payment.routeId}`}><Button size="sm" variant="outline">View route</Button></Link>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageLayout>
  )
}
