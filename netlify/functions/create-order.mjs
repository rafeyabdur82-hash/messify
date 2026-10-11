// POST { subId }  ->  { orderId, amount, currency, keyId }
// The amount is recomputed here from the subscription + today's menu, never taken from the browser.
import { adminDb, json, requireUser, razorpayAuth } from './_shared.mjs'
import { priceBreakdown } from '../../src/utils/pricing.js'

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST only' })
  try {
    const uid = await requireUser(event)
    const { subId } = JSON.parse(event.body || '{}')
    if (!subId) return json(400, { error: 'subId required' })

    const subSnap = await adminDb.collection('subscriptions').doc(subId).get()
    if (!subSnap.exists) return json(404, { error: 'Subscription not found' })
    const sub = subSnap.data()
    if (sub.studentId !== uid) return json(403, { error: 'Not your subscription' })
    if (sub.status === 'active') return json(409, { error: 'Already paid' })

    const date = new Date().toISOString().slice(0, 10)
    const menuSnap = await adminDb.collection('menus').doc(`${sub.messId}_${date}`).get()
    const total = priceBreakdown(sub.plan, menuSnap.exists ? menuSnap.data() : null, sub.couponCode || '').total
    if (!(total > 0)) return json(400, { error: 'Could not compute amount' })

    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { Authorization: razorpayAuth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Math.round(total * 100), // paise
        currency: 'INR',
        receipt: subId.slice(0, 40),
        notes: { subId, studentId: uid, messId: sub.messId, plan: sub.plan },
      }),
    })
    const order = await res.json()
    if (!res.ok) return json(502, { error: order?.error?.description || 'Razorpay order failed' })

    return json(200, { orderId: order.id, amount: order.amount, currency: order.currency, keyId: process.env.RAZORPAY_KEY_ID })
  } catch (err) {
    console.error(err)
    return json(err.status || 500, { error: err.message || 'Server error' })
  }
}
