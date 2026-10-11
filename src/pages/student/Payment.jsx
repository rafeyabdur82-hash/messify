import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import PageLayout from '../../components/common/StudentPage.jsx'
import { Card, Input, Button, Badge, Spinner } from '../../components/common/UI.jsx'
import { getMessProfile, getMenu, submitPayment } from '../../firebase/firestore.js'
import { uploadImage } from '../../firebase/storage.js'
import { payWithRazorpay } from '../../firebase/razorpay.js'
import { priceBreakdown } from '../../utils/pricing.js'

export default function Payment() {
  const { messId } = useParams()
  const [params] = useSearchParams()
  const { currentUser, profile } = useAuth()
  const navigate = useNavigate()

  const subId = params.get('subId')
  const plan = params.get('plan')
  const coupon = params.get('coupon') || ''

  const [mess, setMess] = useState(null)
  const [amount, setAmount] = useState(Number(params.get('amount')) || 0)
  const [loading, setLoading] = useState(true)
  const [payerName, setPayerName] = useState(profile?.name || '')
  const [upiId, setUpiId] = useState('')
  const [utrNumber, setUtrNumber] = useState('')
  const [screenshot, setScreenshot] = useState(null)
  const [screenshotPreview, setScreenshotPreview] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    // Recompute the price from the mess's actual current menu rather than
    // trusting the amount in the URL — this is what keeps the amount honest
    // even if someone edits the query string before this page loads.
    async function load() {
      const [m, todayMenu] = await Promise.all([getMessProfile(messId), getMenu(messId, new Date().toISOString().slice(0, 10))])
      setMess(m)
      setAmount(priceBreakdown(plan, todayMenu, coupon).total)
      setLoading(false)
    }
    load()
  }, [messId, plan, coupon])

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setScreenshot(file)
    setScreenshotPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!screenshot) { setError('Please upload a screenshot of your payment.'); return }
    if (!utrNumber.trim()) { setError('Please enter the UTR / transaction reference number.'); return }

    setSubmitting(true)
    try {
      const path = `payment-screenshots/${currentUser.uid}_${Date.now()}.jpg`
      const screenshotUrl = await uploadImage(path, screenshot)
      await submitPayment({
        studentId: currentUser.uid, messId, subscriptionId: subId, plan, amount,
        payerName, upiId, utrNumber, screenshotUrl,
      })
      setDone(true)
    } catch (err) {
      console.error(err)
      setError('Something went wrong submitting your payment. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRazorpay() {
    setError('')
    setPaying(true)
    try {
      await payWithRazorpay({
        subId, name: payerName || profile?.name, email: currentUser.email, phone: profile?.phone,
        description: `${mess?.messName || 'Mess'} — ${plan} plan`,
      })
      navigate('/student/subscriptions')
    } catch (err) {
      if (err.message !== 'cancelled') setError(err.message || 'Payment failed. Please try again.')
    } finally {
      setPaying(false)
    }
  }

  if (loading) return <PageLayout><Spinner /></PageLayout>

  if (done) {
    return (
      <PageLayout title="Payment Submitted" subtitle="Waiting for the mess owner to approve">
        <Card className="text-center py-10 animate-fadeUp">
          <div className="text-5xl mb-4">✅</div>
          <h3 className="text-xl mb-2">Payment proof submitted</h3>
          <p className="text-charcoal-soft text-sm mb-6 max-w-md mx-auto">
            {mess?.messName} has been notified. Your subscription will activate automatically as soon as they approve your payment — you'll get a notification when that happens.
          </p>
          <Button onClick={() => navigate('/student/subscriptions')}>Go to My Subscriptions</Button>
        </Card>
      </PageLayout>
    )
  }

  return (
    <PageLayout title="Complete Your Payment" subtitle={`Subscribing to ${mess?.messName || 'this mess'}`}>
      <Card className="animate-fadeUp mb-5">
        <h3 className="text-base font-bold mb-1">Pay online (instant)</h3>
        <p className="text-xs text-charcoal-soft mb-3">Cards, UPI, netbanking and wallets via Razorpay. Your subscription activates immediately. <b>Test mode</b> — no real money is charged.</p>
        {error && <p className="text-danger text-[13px] bg-[#F7E3E0] px-3.5 py-2.5 rounded-xl mb-3">{error}</p>}
        <Button full disabled={paying || !subId} onClick={handleRazorpay}>{paying ? 'Processing...' : `Pay ₹${amount} with Razorpay`}</Button>
      </Card>
      <p className="text-center text-xs text-charcoal-soft mb-3">— or pay the mess directly and upload proof —</p>

      <div className="grid md:grid-cols-2 gap-5">
        <Card className="animate-fadeUp">
          <h3 className="text-base font-bold mb-3">Step 1 — Pay via UPI</h3>
          {mess?.paymentQrUrl ? (
            <div className="text-center">
              <img src={mess.paymentQrUrl} alt="Payment QR code" className="w-56 h-56 object-contain mx-auto border border-sooji rounded-xl p-2" />
              <p className="text-xs text-charcoal-soft mt-3">Scan this code with any UPI app (GPay, PhonePe, Paytm) and pay the amount below.</p>
            </div>
          ) : (
            <div className="text-center py-8 bg-dahi rounded-xl">
              <p className="text-sm text-charcoal-soft">This mess hasn't uploaded a payment QR code yet. Please contact them directly, or try again later.</p>
            </div>
          )}
          <div className="mt-5 bg-masala text-white rounded-xl p-4 text-center">
            <div className="text-xs opacity-85">Amount to pay</div>
            <div className="font-mono text-3xl font-bold">₹{amount}</div>
          </div>
        </Card>

        <Card className="animate-fadeUp" style={{ animationDelay: '.1s' }}>
          <h3 className="text-base font-bold mb-3">Step 2 — Submit payment proof</h3>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input label="Your name" required value={payerName} onChange={(e) => setPayerName(e.target.value)} />
            <Input label="Your UPI ID (optional)" value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="yourname@upi" />
            <Input label="UTR / Transaction reference number" required value={utrNumber} onChange={(e) => setUtrNumber(e.target.value)} placeholder="e.g. 402312345678" />

            <label className="flex flex-col gap-2">
              <span className="text-[13px] font-bold text-charcoal-soft">Payment screenshot</span>
              <input type="file" accept="image/*" required onChange={handleFileChange} className="text-sm" />
            </label>
            {screenshotPreview && <img src={screenshotPreview} alt="Preview" className="w-32 rounded-lg border border-sooji" />}

            {error && <p className="text-danger text-[13px] bg-[#F7E3E0] px-3.5 py-2.5 rounded-xl">{error}</p>}

            <Button type="submit" full disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Payment Proof'}</Button>
            <p className="text-xs text-charcoal-soft">Your subscription stays pending until the mess owner verifies this payment.</p>
          </form>
        </Card>
      </div>
    </PageLayout>
  )
}
