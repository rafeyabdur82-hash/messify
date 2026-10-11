import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import PageLayout from '../../components/common/MessPage.jsx'
import StatCard from '../../components/common/StatCard.jsx'
import { Card, Badge, EmptyState, Spinner } from '../../components/common/UI.jsx'
import { listenMessPayments } from '../../firebase/firestore.js'
import { formatINR } from '../../constants.js'

const fmtDate = (ts) => (ts?.toDate ? ts.toDate().toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—')
const methodLabel = (p) => (p.method === 'razorpay' ? `Razorpay${p.paymentMethod ? ` (${p.paymentMethod})` : ''}` : 'UPI QR')

export default function PaymentHistory() {
  const { currentUser } = useAuth()
  const [payments, setPayments] = useState(null)

  useEffect(() => listenMessPayments(currentUser.uid, setPayments), [currentUser])

  if (payments === null) return <PageLayout><Spinner /></PageLayout>

  const paid = payments.filter((p) => p.status === 'approved')
  const total = paid.reduce((n, p) => n + (p.amount || 0), 0)
  const earned = paid.reduce((n, p) => n + (p.messEarning || 0), 0)
  const students = new Set(paid.map((p) => p.studentId)).size

  return (
    <PageLayout title="Payment History" subtitle="Every payment students have made to your mess">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon="🧾" label="Paid payments" value={paid.length} />
        <StatCard icon="🎓" label="Paying students" value={students} color="haldi" />
        <StatCard icon="💰" label="Total collected" value={formatINR(total)} />
        <StatCard icon="✅" label="You receive" value={formatINR(earned)} color="haldi" />
      </div>

      {payments.length === 0 ? (
        <EmptyState icon="🧾" title="No payments yet" message="Payments will appear here as students subscribe." />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-charcoal-soft border-b border-sooji">
                {['Student', 'Plan', 'Amount', 'You receive', 'Method', 'Reference', 'Status', 'Date'].map((h) => <th key={h} className="px-4 py-3 font-bold whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-sooji/60 last:border-0">
                  <td className="px-4 py-3"><strong>{p.payerName || '—'}</strong>{p.studentEmail && <div className="text-xs text-charcoal-soft">{p.studentEmail}</div>}</td>
                  <td className="px-4 py-3 capitalize whitespace-nowrap">{(p.plan || '').replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 font-mono font-bold">{formatINR(p.amount)}</td>
                  <td className="px-4 py-3 font-mono text-success">{formatINR(p.messEarning)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{methodLabel(p)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{p.razorpayPaymentId || p.utrNumber || '—'}</td>
                  <td className="px-4 py-3"><Badge tone={p.status === 'approved' ? 'success' : p.status === 'rejected' ? 'danger' : 'warn'}>{p.status}</Badge></td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs">{fmtDate(p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </PageLayout>
  )
}
