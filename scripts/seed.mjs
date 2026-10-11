// Creates demo accounts + demo data in EVERY Firestore collection, so each role's panel and the
// admin reports have something to show.
//
//   npm run seed
//
// Needs a service-account key (Firebase console -> Project settings -> Service accounts ->
// "Generate new private key"), saved as scripts/serviceAccountKey.json.
// Safe to run again: documents use fixed ids, so it updates the demo data instead of duplicating it.
// It only touches the demo accounts/ids listed below — nothing else in the project.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { DEMO_ACCOUNTS } from '../src/data/demoAccounts.js'
import { calculatePlanPrice } from '../src/utils/pricing.js'
import { splitPayment } from '../src/constants.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(here, 'serviceAccountKey.json')

if (!fs.existsSync(keyPath)) {
  console.error(`
Service-account key not found at:
  ${keyPath}

1. Firebase console -> Project settings (gear icon) -> Service accounts
2. Click "Generate new private key" and save the file as  scripts/serviceAccountKey.json
3. Run  npm run seed  again.  (Never commit or share that file.)
`)
  process.exit(1)
}

const key = JSON.parse(fs.readFileSync(keyPath, 'utf8'))
initializeApp({ credential: cert(key) })
const auth = getAuth()
const db = getFirestore()
db.settings({ ignoreUndefinedProperties: true })
console.log(`Seeding project: ${key.project_id}\n`)

// ---------- helpers ----------
const isoDate = (offsetDays = 0) => new Date(Date.now() + offsetDays * 864e5).toISOString().slice(0, 10) // same UTC dates the app uses
const today = isoDate(0)
const month = today.slice(0, 7)
const minutesAgo = (m) => Timestamp.fromMillis(Date.now() - m * 60000)
const svgUrl = (label, sub) => 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><rect width="240" height="240" fill="#fff"/>` +
  `<g fill="#111">${[...Array(7)].map((_, r) => [...Array(7)].map((_, c) => ((r * 7 + c * 3) % 4 === 0 || (r + c) % 5 === 0) ? `<rect x="${20 + c * 28}" y="${20 + r * 28}" width="22" height="22"/>` : '').join('')).join('')}</g>` +
  `<rect x="0" y="206" width="240" height="34" fill="#0F4D3A"/><text x="120" y="228" font-size="14" font-family="Arial" fill="#fff" text-anchor="middle">${label}</text></svg>`)

async function ensureUser(acc) {
  try {
    const existing = await auth.getUserByEmail(acc.email)
    await auth.updateUser(existing.uid, { password: acc.password, displayName: acc.name, disabled: false })
    return existing.uid
  } catch (err) {
    if (err.code !== 'auth/user-not-found') throw err
    const created = await auth.createUser({ email: acc.email, password: acc.password, displayName: acc.name, emailVerified: true })
    return created.uid
  }
}

// ---------- 1. Auth users + users collection ----------
const uid = {}
try {
  for (const acc of DEMO_ACCOUNTS) uid[acc.key] = await ensureUser(acc)
} catch (err) {
  if (String(err.message).includes('CONFIGURATION_NOT_FOUND') || err.code === 'auth/configuration-not-found') {
    console.error('Authentication is not set up yet. Firebase console -> Build -> Authentication -> "Get started" -> enable Email/Password, then run again.')
  } else console.error(err)
  process.exit(1)
}

const batch = db.batch()
const put = (col, id, data) => batch.set(db.collection(col).doc(id), data)
const acc = (k) => DEMO_ACCOUNTS.find((a) => a.key === k)

for (const a of DEMO_ACCOUNTS) {
  put('users', uid[a.key], {
    uid: uid[a.key], name: a.name, email: a.email, role: a.role, phone: a.phone,
    ...(a.area ? { area: a.area } : {}), ...(a.messName ? { messName: a.messName } : {}),
    ...(a.vehicleNumber ? { vehicleNumber: a.vehicleNumber } : {}),
    ...(a.role === 'student' ? { walletBalance: a.key === 'student1' ? 120 : 0 } : {}),
    createdAt: minutesAgo(60 * 24 * 10),
  })
}

// ---------- 2. mess listings + menus ----------
const menuOf = (k) => ({ lunch: { price: acc(k).lunch[1] }, dinner: { price: acc(k).dinner[1] } })
const subscriberCount = { mess1: 2, mess2: 1 }
for (const k of ['mess1', 'mess2']) {
  const a = acc(k)
  put('messProfiles', uid[k], {
    ownerId: uid[k], messName: a.messName, area: a.area, rating: a.rating, subscriberCount: subscriberCount[k],
    description: 'Pure vegetarian home-style meals cooked fresh daily in groundnut oil.',
    paymentQrUrl: svgUrl('DEMO UPI QR'), createdAt: minutesAgo(60 * 24 * 10),
  })
  for (const offset of [0, 1, 2]) {
    const date = isoDate(offset)
    put('menus', `${uid[k]}_${date}`, {
      messId: uid[k], date,
      lunch: { items: a.lunch[0], price: a.lunch[1], updatedAt: minutesAgo(180) },
      dinner: { items: a.dinner[0], price: a.dinner[1], updatedAt: minutesAgo(180) },
    })
  }
}

// ---------- 3. subscriptions (orders) ----------
const sub = (id, studentKey, messKey, plan, status, extra) => {
  const s = acc(studentKey)
  const subtotal = calculatePlanPrice(plan, menuOf(messKey))
  put('subscriptions', id, {
    studentId: uid[studentKey], messId: uid[messKey], plan, status,
    deliveryName: s.name, deliveryPhone: s.phone, deliveryAddress: s.area, deliveryLandmark: 'Near main gate',
    deliverySlot: 'lunch', dietaryNote: '',
    subtotal, discount: 0, amount: subtotal, couponCode: '', createdAt: minutesAgo(60 * 24 * 5),
    ...extra,
  })
  return subtotal
}
const a1 = sub('demo-sub-1', 'student1', 'mess1', 'monthly', 'active', { paymentStatus: 'paid', paymentMethod: 'upi_qr', startDate: isoDate(-8) })
sub('demo-sub-2', 'student2', 'mess1', 'weekly', 'active', { paymentStatus: 'cod_pending', paymentMethod: 'cod', startDate: isoDate(-2) })
const a3 = sub('demo-sub-3', 'student3', 'mess1', 'monthly_lunch', 'pending_payment', { paymentStatus: 'pending', paymentMethod: 'upi_qr', startDate: today })
const a4 = sub('demo-sub-4', 'student2', 'mess2', 'monthly', 'active', { paymentStatus: 'paid', paymentMethod: 'upi_qr', startDate: isoDate(-5) })
const a5 = sub('demo-sub-5', 'student3', 'mess2', 'weekly', 'payment_rejected', { paymentStatus: 'rejected', paymentMethod: 'upi_qr', startDate: isoDate(-1) })

// ---------- 4. payments ----------
const pay = (id, subId, studentKey, messKey, plan, amount, status, extra = {}) => put('payments', id, {
  studentId: uid[studentKey], messId: uid[messKey], subscriptionId: subId, plan, amount, ...splitPayment(amount),
  payerName: acc(studentKey).name, upiId: `${studentKey}@upi`, utrNumber: String(402312340000 + Math.floor(Math.random() * 9999)),
  screenshotUrl: svgUrl('DEMO PAYMENT PROOF'), method: 'upi_qr', status, createdAt: minutesAgo(60 * 24 * 4), ...extra,
})
pay('demo-pay-1', 'demo-sub-1', 'student1', 'mess1', 'monthly', a1, 'approved', { reviewedAt: minutesAgo(60 * 24 * 4 - 30) })
pay('demo-pay-2', 'demo-sub-3', 'student3', 'mess1', 'monthly_lunch', a3, 'pending', { createdAt: minutesAgo(25) })
pay('demo-pay-3', 'demo-sub-4', 'student2', 'mess2', 'monthly', a4, 'approved', { reviewedAt: minutesAgo(60 * 24 * 4 - 45) })
pay('demo-pay-4', 'demo-sub-5', 'student3', 'mess2', 'weekly', a5, 'rejected', { rejectionReason: 'UTR could not be verified', reviewedAt: minutesAgo(60 * 20) })

// ---------- 5. skips + ledger (monthly bill) ----------
put('skips', 'demo-skip-1', { subscriptionId: 'demo-sub-1', studentId: uid.student1, messId: uid.mess1, date: today, meal: 'dinner', createdAt: minutesAgo(90) })
put('skips', 'demo-skip-2', { subscriptionId: 'demo-sub-2', studentId: uid.student2, messId: uid.mess1, date: isoDate(-1), meal: 'lunch', createdAt: minutesAgo(60 * 24) })

const ledgerEntries = (messKey) => {
  const e = []
  for (let i = 1; i <= 4; i++) {
    const date = isoDate(-i)
    if (!date.startsWith(month)) continue
    for (const meal of ['lunch', 'dinner']) e.push({ date, meal, amount: acc(messKey)[meal][1], type: 'charge', at: Date.now() - i * 864e5 + (meal === 'dinner' ? 1 : 0) })
  }
  return e
}
put('ledger', `${uid.student1}_${uid.mess1}_${month}`, {
  studentId: uid.student1, messId: uid.mess1, month,
  entries: [...ledgerEntries('mess1'), { date: today, meal: 'dinner', amount: acc('mess1').dinner[1], type: 'skip', at: Date.now() }],
})
put('ledger', `${uid.student2}_${uid.mess2}_${month}`, { studentId: uid.student2, messId: uid.mess2, month, entries: ledgerEntries('mess2') })

// ---------- 6. custom requests ----------
put('customRequests', 'demo-req-1', { studentId: uid.student1, messId: uid.mess1, date: today, meal: 'dinner', requestText: 'Less spicy and no onion please', status: 'pending', createdAt: minutesAgo(40) })
put('customRequests', 'demo-req-2', { studentId: uid.student2, messId: uid.mess1, date: today, meal: 'lunch', requestText: 'Extra soft rotis please', status: 'accepted', respondedAt: minutesAgo(15), createdAt: minutesAgo(120) })

// ---------- 7. delivery routes + live location, partner links, tiffin boxes ----------
const stop = (studentKey, extra = {}) => ({
  studentId: uid[studentKey], name: acc(studentKey).name, phone: acc(studentKey).phone, address: acc(studentKey).area,
  landmark: 'Near main gate', dietaryNote: '', lat: null, lng: null, status: 'pending', ...extra,
})
put('routes', 'demo-route-1', {
  messId: uid.mess1, deliveryPersonId: uid.delivery1, date: today, meal: 'lunch', status: 'in_progress', currentStopIndex: 1,
  stops: [stop('student2', { status: 'delivered', deliveredAt: Date.now() - 10 * 60000 }), stop('student1', { lat: 21.0985, lng: 78.9875 })],
  studentIds: [uid.student2, uid.student1],
  liveLocation: { lat: 21.0962, lng: 78.9842, accuracy: 12, heading: 40, updatedAt: minutesAgo(0) },
  startedAt: minutesAgo(35), createdAt: minutesAgo(90),
})
put('routes', 'demo-route-2', {
  messId: uid.mess1, deliveryPersonId: uid.delivery1, date: today, meal: 'dinner', status: 'not_started', currentStopIndex: 0,
  stops: [stop('student2')], studentIds: [uid.student2], createdAt: minutesAgo(30),
})
for (const [m, d] of [['mess1', 'delivery1'], ['mess1', 'delivery2'], ['mess2', 'delivery2']]) {
  put('messDeliveryPartners', `${uid[m]}_${uid[d]}`, { messId: uid[m], partnerId: uid[d], name: acc(d).name, email: acc(d).email, phone: acc(d).phone, linkedAt: minutesAgo(60 * 24 * 6) })
}
put('tiffinBoxes', 'demo-sub-1', { qrId: 'demo-sub-1', studentId: uid.student1, messId: uid.mess1, status: 'with_student', scannedBy: uid.delivery1, lastScannedAt: minutesAgo(200) })
put('tiffinBoxes', 'demo-sub-2', { qrId: 'demo-sub-2', studentId: uid.student2, messId: uid.mess1, status: 'with_mess', scannedBy: uid.delivery1, lastScannedAt: minutesAgo(60 * 20) })

// ---------- 8. notifications ----------
const note = (id, userKey, title, message, type, link, read, ago) =>
  put('notifications', id, { userId: uid[userKey], title, message, type, link, read, createdAt: minutesAgo(ago) })
note('demo-n1', 'student1', 'Payment approved!', 'Your payment was approved. Your subscription is now active.', 'payment_approved', '/student/subscriptions', true, 60 * 24 * 4)
note('demo-n2', 'student1', 'Request update', 'Annapurna Kitchens is reviewing your dinner request.', 'custom_request', '/student', false, 30)
note('demo-n3', 'mess1', 'New payment awaiting approval', 'Karan Dave submitted a payment for the monthly_lunch plan. Review and approve it.', 'payment_pending', '/mess/payments', false, 25)
note('demo-n4', 'mess1', 'New Cash on Delivery order', 'Riddhi Patel ordered the weekly plan (cash on delivery).', 'cod_order', '/mess/subscribers', false, 60 * 24 * 2)
note('demo-n5', 'delivery1', 'Route assigned', 'You have a new lunch route with 2 stops.', 'info', '/delivery', false, 90)
note('demo-n6', 'admin', 'Demo data loaded', 'Demo accounts and sample data were created for testing.', 'info', '/admin', false, 1)

await batch.commit()

// ---------- done ----------
const names = { 'users': DEMO_ACCOUNTS.length, messProfiles: 2, menus: 6, subscriptions: 5, payments: 4, skips: 2, ledger: 2, customRequests: 2, routes: 2, messDeliveryPartners: 3, tiffinBoxes: 2, notifications: 6 }
console.log('Collections written:', Object.entries(names).map(([k, v]) => `${k} (${v})`).join(', '), '\n')
console.log('Demo logins')
console.log('-----------------------------------------------------------')
for (const a of DEMO_ACCOUNTS) console.log(`${a.role.padEnd(9)} ${a.email.padEnd(24)} ${a.password}`)
console.log('-----------------------------------------------------------')
console.log('Admin signs in at /admin/login; everyone else at /login (pick the matching tab).')
