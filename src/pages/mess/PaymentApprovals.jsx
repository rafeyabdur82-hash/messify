import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import PageLayout from '../../components/common/MessPage.jsx'
import { Card, Badge, Button, EmptyState, Spinner } from '../../components/common/UI.jsx'
import { listenMessPayments, approvePayment, rejectPayment } from '../../firebase/firestore.js'

function fmtDate(ts) {
  if (!ts?.toDate) return ''
  return ts.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function PaymentApprovals() {
  const { currentUser } = useAuth()
  const [payments, setPayments] = useState(null)
  const [zoomedImage, setZoomedImage] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [filter, setFilter] = useState('pending')

  useEffect(() => {
    const unsub = listenMessPayments(currentUser.uid, setPayments)
    return unsub
  }, [currentUser])

  async function handleApprove(p) {
    setBusyId(p.id)
    await approvePayment(p)
    setBusyId(null)
  }

  async function handleReject(p) {
    const reason = window.prompt('Reason for rejecting this payment (optional):') || ''
    setBusyId(p.id)
    await rejectPayment(p, reason)
    setBusyId(null)
  }

  if (payments === null) return <PageLayout><Spinner /></PageLayout>

  const filtered = payments.filter((p) => filter === 'all' || p.status === filter)
  const pendingCount = payments.filter((p) => p.status === 'pending').length

  return (
    <PageLayout title="Payment Approvals" subtitle={`${pendingCount} payment${pendingCount === 1 ? '' : 's'} awaiting your review`}>
      <div className="flex gap-2 mb-6">
        {['pending', 'approved', 'rejected', 'all'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-semibold capitalize transition-colors ${filter === f ? 'bg-masala text-white' : 'bg-white border border-sooji text-charcoal-soft hover:bg-sooji'}`}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="🧾" title="Nothing here" message="No payments match this filter yet." />
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((p, i) => (
            <Card key={p.id} className="animate-fadeUp" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="flex flex-col sm:flex-row gap-4">
                {p.screenshotUrl ? (
                  <img
                    src={p.screenshotUrl}
                    alt="Payment screenshot"
                    className="w-full sm:w-28 h-28 object-cover rounded-lg border border-sooji cursor-pointer flex-shrink-0"
                    onClick={() => setZoomedImage(p.screenshotUrl)}
                  />
                ) : (
                  <div className="w-full sm:w-28 h-28 rounded-lg border border-sooji bg-dahi grid place-items-center text-xs text-charcoal-soft text-center flex-shrink-0">💳 Paid online<br />(Razorpay)</div>
                )}
                <div className="flex-1">
                  <div className="flex justify-between items-start flex-wrap gap-2 mb-2">
                    <div>
                      <strong className="text-sm">{p.payerName}</strong>
                      <p className="text-xs text-charcoal-soft">{fmtDate(p.createdAt)} · {p.plan} plan</p>
                    </div>
                    <Badge tone={p.status === 'approved' ? 'success' : p.status === 'rejected' ? 'danger' : 'warn'}>{p.status}</Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-3">
                    <div><span className="text-charcoal-soft block">Amount</span><span className="font-mono font-bold">₹{p.amount}</span></div>
                    <div><span className="text-charcoal-soft block">Platform fee (3%)</span><span className="font-mono">₹{p.commission}</span></div>
                    <div><span className="text-charcoal-soft block">You receive</span><span className="font-mono font-bold text-success">₹{p.messEarning}</span></div>
                    <div><span className="text-charcoal-soft block">UTR number</span><span className="font-mono">{p.utrNumber}</span></div>
                  </div>
                  {p.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button size="sm" disabled={busyId === p.id} onClick={() => handleApprove(p)}>{busyId === p.id ? 'Working...' : 'Approve'}</Button>
                      <Button size="sm" variant="outline" disabled={busyId === p.id} onClick={() => handleReject(p)}>Reject</Button>
                    </div>
                  )}
                  {p.status === 'rejected' && p.rejectionReason && (
                    <p className="text-xs text-danger">Reason: {p.rejectionReason}</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {zoomedImage && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6" onClick={() => setZoomedImage(null)}>
          <img src={zoomedImage} alt="Payment screenshot full size" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}
    </PageLayout>
  )
}
