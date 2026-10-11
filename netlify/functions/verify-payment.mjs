// POST { razorpay_order_id, razorpay_payment_id, razorpay_signature }
// Verifies the signature, then activates the subscription and records the payment.
import crypto from 'node:crypto'
import { FieldValue } from 'firebase-admin/firestore'
import { adminDb, json, requireUser, razorpayAuth } from './_shared.mjs'
import { splitPayment } from '../../src/constants.js'

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST only' })
  try {
    const uid = await requireUser(event)
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = JSON.parse(event.body || '{}')
    if (!orderId || !paymentId || !signature) return json(400, { error: 'Missing payment fields' })

    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex')
    const ok = expected.length === signature.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
    if (!ok) return json(400, { error: 'Payment signature mismatch' })

    // Trust the order stored at Razorpay (amount + notes), not anything the browser sends.
    const res = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, { headers: { Authorization: razorpayAuth() } })
    const order = await res.json()
    if (!res.ok) return json(502, { error: 'Could not fetch order' })
    const { subId, studentId, messId, plan } = order.notes || {}
    if (studentId !== uid) return json(403, { error: 'Not your order' })
    const amount = order.amount / 100

    const [studentDoc, messDoc, pay] = await Promise.all([
      adminDb.collection('users').doc(studentId).get(),
      adminDb.collection('messProfiles').doc(messId).get(),
      fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, { headers: { Authorization: razorpayAuth() } }).then((r) => r.json()),
    ])
    const payerName = studentDoc.data()?.name || ''
    const messName = messDoc.data()?.messName || ''

    const payRef = adminDb.collection('payments').doc(paymentId) // paymentId as doc id => safe to retry
    const subRef = adminDb.collection('subscriptions').doc(subId)
    const messRef = adminDb.collection('messProfiles').doc(messId)

    await adminDb.runTransaction(async (tx) => {
      const [paySnap, messSnap] = await Promise.all([tx.get(payRef), tx.get(messRef)])
      if (paySnap.exists) return // already processed
      tx.set(payRef, {
        studentId, messId, subscriptionId: subId, plan, amount, ...splitPayment(amount),
        payerName, studentEmail: studentDoc.data()?.email || '', messName, currency: order.currency || 'INR',
        method: 'razorpay', paymentMethod: pay.method || '', utrNumber: paymentId,
        razorpayOrderId: orderId, razorpayPaymentId: paymentId,
        status: 'approved', createdAt: FieldValue.serverTimestamp(), reviewedAt: FieldValue.serverTimestamp(),
      })
      tx.update(subRef, { status: 'active', paymentStatus: 'paid', paymentMethod: 'razorpay' })
      if (messSnap.exists) tx.update(messRef, { subscriberCount: (messSnap.data().subscriberCount || 0) + 1 })
      const note = (userId, title, message, type, link) =>
        tx.set(adminDb.collection('notifications').doc(), { userId, title, message, type, link, read: false, createdAt: FieldValue.serverTimestamp() })
      note(studentId, 'Payment successful!', `Your payment of ₹${amount} was received. Your subscription is now active.`, 'payment_approved', '/student/subscriptions')
      note(messId, 'New paid subscriber', `A student paid ₹${amount} online (Razorpay) for the ${plan} plan.`, 'info', '/mess/subscribers')
    })

    return json(200, { ok: true })
  } catch (err) {
    console.error(err)
    return json(err.status || 500, { error: err.message || 'Server error' })
  }
}
