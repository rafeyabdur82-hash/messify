// Client side of the Razorpay (test mode) flow. The secret key lives only in Netlify functions.
import { auth } from './config.js'

const FN = '/.netlify/functions'

function loadCheckoutScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve()
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = resolve
    s.onerror = () => reject(new Error('Could not load Razorpay checkout'))
    document.body.appendChild(s)
  })
}

async function call(name, body) {
  const token = await auth.currentUser.getIdToken()
  const res = await fetch(`${FN}/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

// Resolves once the payment is verified and the subscription is active.
// Rejects with Error('cancelled') if the user closes the popup.
export async function payWithRazorpay({ subId, name, email, phone, description }) {
  await loadCheckoutScript()
  const order = await call('create-order', { subId })
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: 'Gharse',
      description,
      prefill: { name, email, contact: phone },
      theme: { color: '#0F4D3A' },
      handler: async (response) => {
        try { resolve(await call('verify-payment', response)) } catch (e) { reject(e) }
      },
      modal: { ondismiss: () => reject(new Error('cancelled')) },
    })
    rzp.on('payment.failed', (r) => reject(new Error(r.error?.description || 'Payment failed')))
    rzp.open()
  })
}
