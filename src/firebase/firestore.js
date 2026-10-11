// Centralized Firestore data-access helpers.
// Collections used:
//  users            -> { uid, name, email, role, phone, area, messName?, walletBalance? }
//  messProfiles     -> { ownerId, messName, area, rating, subscriberCount, description }
//  menus            -> { messId, date (YYYY-MM-DD), lunch: {items, price}, dinner: {items, price} }
//  subscriptions    -> { studentId, messId, plan: 'lunch'|'dinner'|'both', status: 'active'|'paused'|'cancelled', startDate }
//  skips            -> { subscriptionId, studentId, messId, date, meal: 'lunch'|'dinner', createdAt }
//  orders           -> { messId, date, meal, routeId, status, deliveredCount, totalCount }
//  routes           -> { messId, deliveryPersonId, date, meal, stops: [{studentId, address, lat, lng, status}], currentStopIndex }
//  ledger           -> { studentId, messId, month, entries: [{date, meal, amount, type: 'charge'|'skip'}] }
//  tiffinBoxes      -> { qrId, studentId, messId, status: 'with_student'|'with_mess'|'in_transit' }

import {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, onSnapshot, limit, arrayUnion, deleteField,
} from 'firebase/firestore'
import { db } from './config'

// ---------- Mess profiles ----------
export async function getAllMessProfiles() {
  const snap = await getDocs(collection(db, 'messProfiles'))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function getMessProfile(messId) {
  const snap = await getDoc(doc(db, 'messProfiles', messId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

// Backward-compatibility fix: accounts created before messProfiles auto-creation
// was added (or if a write ever failed mid-signup) won't have a public listing.
// This creates one on the fly from their users doc so they start showing up
// in Browse Mess without needing to re-signup or manually edit Firestore.
export async function ensureMessProfile(ownerId, userDoc) {
  const existing = await getMessProfile(ownerId)
  if (existing) return existing
  const newProfile = {
    ownerId,
    messName: userDoc?.messName || userDoc?.name || 'My Mess',
    area: userDoc?.area || '',
    rating: 0,
    subscriberCount: 0,
    description: '',
    createdAt: serverTimestamp(),
  }
  await setDoc(doc(db, 'messProfiles', ownerId), newProfile)
  return { id: ownerId, ...newProfile }
}

// Keeps the public messProfiles listing (what students see in Browse Mess)
// in sync when a mess owner edits their business details from their Profile page.
export async function updateMessProfile(ownerId, updates) {
  await setDoc(doc(db, 'messProfiles', ownerId), updates, { merge: true })
}

// ---------- Menus ----------
export async function setTodayMenu(messId, date, mealType, items, price) {
  const menuRef = doc(db, 'menus', `${messId}_${date}`)
  await setDoc(menuRef, {
    messId,
    date,
    [mealType]: { items, price, updatedAt: serverTimestamp() },
  }, { merge: true })
}

export async function getMenu(messId, date) {
  const snap = await getDoc(doc(db, 'menus', `${messId}_${date}`))
  return snap.exists() ? snap.data() : null
}

export function listenMenu(messId, date, callback) {
  return onSnapshot(doc(db, 'menus', `${messId}_${date}`), (snap) => {
    callback(snap.exists() ? snap.data() : null)
  })
}

// ---------- Subscriptions ----------
// `extra` carries checkout details (delivery address, slot, payment method, coupon, amount).
export async function createSubscription(studentId, messId, plan, status = 'active', extra = {}) {
  return addDoc(collection(db, 'subscriptions'), {
    studentId, messId, plan, status,
    paymentStatus: status === 'pending_payment' ? 'pending' : 'not_required',
    ...extra,
    startDate: new Date().toISOString().slice(0, 10),
    createdAt: serverTimestamp(),
  })
}

export async function getStudentSubscriptions(studentId) {
  const q = query(collection(db, 'subscriptions'), where('studentId', '==', studentId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function getMessSubscribers(messId) {
  const q = query(collection(db, 'subscriptions'), where('messId', '==', messId), where('status', '==', 'active'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function updateSubscriptionStatus(subId, status) {
  await updateDoc(doc(db, 'subscriptions', subId), { status })
}

// ---------- Skip meal ----------
export async function skipMeal(subscriptionId, studentId, messId, date, meal) {
  return addDoc(collection(db, 'skips'), {
    subscriptionId, studentId, messId, date, meal, createdAt: serverTimestamp(),
  })
}

export async function getSkipsForDate(studentId, date) {
  const q = query(collection(db, 'skips'), where('studentId', '==', studentId), where('date', '==', date))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function getMessSkipsForDate(messId, date) {
  const q = query(collection(db, 'skips'), where('messId', '==', messId), where('date', '==', date))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// ---------- Ledger / Billing ----------
export async function getLedger(studentId, messId, month) {
  const ref = doc(db, 'ledger', `${studentId}_${messId}_${month}`)
  const snap = await getDoc(ref)
  return snap.exists() ? snap.data() : { entries: [] }
}

// Atomic append (arrayUnion) so two writers in the same month never overwrite each other.
// `at` keeps otherwise identical entries distinct.
export async function addLedgerEntry(studentId, messId, month, entry) {
  const ref = doc(db, 'ledger', `${studentId}_${messId}_${month}`)
  await setDoc(ref, { studentId, messId, month, entries: arrayUnion({ ...entry, at: Date.now() }) }, { merge: true })
}

// ---------- Custom order requests ----------
export async function createCustomOrderRequest(studentId, messId, date, meal, requestText) {
  return addDoc(collection(db, 'customRequests'), {
    studentId, messId, date, meal, requestText, status: 'pending', createdAt: serverTimestamp(),
  })
}

export async function getMessCustomRequests(messId) {
  const q = query(collection(db, 'customRequests'), where('messId', '==', messId), where('status', '==', 'pending'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function getStudentCustomRequests(studentId) {
  const q = query(collection(db, 'customRequests'), where('studentId', '==', studentId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    .sort((x, y) => (y.createdAt?.seconds || 0) - (x.createdAt?.seconds || 0))
}

export async function respondToCustomRequest(requestId, status) {
  const ref = doc(db, 'customRequests', requestId)
  const snap = await getDoc(ref)
  await updateDoc(ref, { status, respondedAt: serverTimestamp() })
  if (snap.exists()) {
    const r = snap.data()
    await createNotification(r.studentId, {
      title: status === 'accepted' ? 'Request accepted' : 'Request declined',
      message: `Your ${r.meal} request "${(r.requestText || '').slice(0, 60)}" was ${status}.`,
      type: 'custom_request',
      link: '/student',
    })
  }
}

// ---------- Routes / Delivery tracking (lightweight) ----------
export async function createRoute(messId, deliveryPersonId, date, meal, stops) {
  return addDoc(collection(db, 'routes'), {
    messId, deliveryPersonId, date, meal, stops,
    studentIds: [...new Set(stops.map((st) => st.studentId))], // lets each student read only their own routes
    currentStopIndex: 0,
    status: 'not_started', createdAt: serverTimestamp(),
  })
}

export function listenRoute(routeId, callback) {
  return onSnapshot(doc(db, 'routes', routeId), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null)
  })
}

export async function startRoute(routeId) {
  await updateDoc(doc(db, 'routes', routeId), { status: 'in_progress', startedAt: serverTimestamp() })
}

// Marks one stop delivered: moves the route forward, charges the student's ledger
// for that meal at today's menu price, and notifies the student.
export async function completeStop(route, index) {
  const stops = route.stops.map((st, i) => (i === index ? { ...st, status: 'delivered', deliveredAt: Date.now() } : st))
  const finished = index + 1 >= stops.length
  await updateDoc(doc(db, 'routes', route.id), {
    stops,
    currentStopIndex: index + 1,
    status: finished ? 'completed' : 'in_progress',
    ...(finished ? { completedAt: serverTimestamp(), liveLocation: deleteField() } : {}),
  })
  const stop = route.stops[index]
  if (!stop?.studentId) return
  try {
    const menu = await getMenu(route.messId, route.date)
    const price = menu?.[route.meal]?.price || 0
    if (price > 0) await addLedgerEntry(stop.studentId, route.messId, route.date.slice(0, 7), { date: route.date, meal: route.meal, amount: price, type: 'charge' })
  } catch (err) { console.error('Ledger write failed', err) }
  createNotification(stop.studentId, {
    title: 'Tiffin delivered',
    message: `Your ${route.meal} tiffin has been delivered. Enjoy your meal!`,
    type: 'delivered',
    link: '/student/billing',
  }).catch(() => {})
}

// Live GPS position of the delivery partner (from the browser Geolocation API).
export async function updateRouteLocation(routeId, { lat, lng, accuracy, heading }) {
  await updateDoc(doc(db, 'routes', routeId), {
    liveLocation: { lat, lng, accuracy: accuracy ?? null, heading: heading ?? null, updatedAt: serverTimestamp() },
  })
}

// Finds today's route (if any) that includes this student, so the dashboard can
// show live tracking. Filtered client-side to avoid needing a composite index.
export async function getStudentRouteForDate(messId, date, studentId) {
  const q = query(collection(db, 'routes'), where('studentIds', 'array-contains', studentId))
  const snap = await getDocs(q)
  const routes = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((r) => r.messId === messId && r.date === date)
  for (const route of routes) {
    const stopIndex = (route.stops || []).findIndex((st) => st.studentId === studentId)
    if (stopIndex >= 0) return { ...route, stopIndex }
  }
  return null
}

export async function getDeliveryRoutes(deliveryPersonId, date) {
  const q = query(collection(db, 'routes'), where('deliveryPersonId', '==', deliveryPersonId), where('date', '==', date))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// All routes ever assigned to this delivery partner (newest first) — for the completed-orders history.
export async function getDeliveryHistory(deliveryPersonId) {
  const q = query(collection(db, 'routes'), where('deliveryPersonId', '==', deliveryPersonId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.date || '').localeCompare(a.date || ''))
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? snap.data() : null
}

// ---------- Tiffin box QR tracking ----------
export async function recordBoxScan(qrId, studentId, messId, status, scannedBy = '') {
  const ref = doc(db, 'tiffinBoxes', qrId)
  await setDoc(ref, {
    qrId, studentId, messId, status, scannedBy, lastScannedAt: serverTimestamp(),
  }, { merge: true })
}

export async function getBoxStatus(qrId) {
  const snap = await getDoc(doc(db, 'tiffinBoxes', qrId))
  return snap.exists() ? snap.data() : null
}

// ==========================================================================
// PAYMENTS — manual UPI-QR verification flow.
// A student pays the mess owner directly via UPI using the QR the mess owner
// uploaded, then submits proof (screenshot + name + UTR number). The mess
// owner reviews the screenshot and approves or rejects it. Only on approval
// does the subscription become active and the platform commission is recorded.
// ==========================================================================
import { splitPayment } from '../constants.js'

export async function submitPayment({ studentId, messId, subscriptionId, plan, amount, payerName, upiId, utrNumber, screenshotUrl }) {
  const { commission, messEarning } = splitPayment(amount)
  const paymentRef = await addDoc(collection(db, 'payments'), {
    studentId, messId, subscriptionId, plan,
    amount, commission, messEarning,
    payerName, upiId, utrNumber, screenshotUrl,
    method: 'upi_qr',
    status: 'pending',
    createdAt: serverTimestamp(),
  })
  await createNotification(messId, {
    title: 'New payment awaiting approval',
    message: `${payerName} submitted a payment of ₹${amount} for ${plan} plan. Review and approve to activate their subscription.`,
    type: 'payment_pending',
    link: '/mess/payments',
  })
  return paymentRef
}

// Newest first. Sorted in the browser so these queries need no composite index.
const newestFirst = (a, b) => (b.createdAt?.seconds ?? Infinity) - (a.createdAt?.seconds ?? Infinity)

export function listenMessPayments(messId, callback) {
  const q = query(collection(db, 'payments'), where('messId', '==', messId))
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(newestFirst).slice(0, 100)))
}

export async function getStudentPayments(studentId) {
  const q = query(collection(db, 'payments'), where('studentId', '==', studentId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(newestFirst).slice(0, 50)
}

export async function approvePayment(payment) {
  await updateDoc(doc(db, 'payments', payment.id), { status: 'approved', reviewedAt: serverTimestamp() })
  await updateDoc(doc(db, 'subscriptions', payment.subscriptionId), { status: 'active', paymentStatus: 'paid' })
  // Bump the mess's subscriber count now that a paid, active subscriber exists.
  const messSnap = await getDoc(doc(db, 'messProfiles', payment.messId))
  if (messSnap.exists()) {
    await updateDoc(doc(db, 'messProfiles', payment.messId), {
      subscriberCount: (messSnap.data().subscriberCount || 0) + 1,
    })
  }
  await createNotification(payment.studentId, {
    title: 'Payment approved!',
    message: `Your payment of ₹${payment.amount} was approved. Your subscription is now active.`,
    type: 'payment_approved',
    link: '/student/subscriptions',
  })
}

export async function rejectPayment(payment, reason) {
  await updateDoc(doc(db, 'payments', payment.id), { status: 'rejected', rejectionReason: reason || '', reviewedAt: serverTimestamp() })
  await updateDoc(doc(db, 'subscriptions', payment.subscriptionId), { status: 'payment_rejected', paymentStatus: 'rejected' })
  await createNotification(payment.studentId, {
    title: 'Payment could not be verified',
    message: reason ? `Your payment was rejected: ${reason}` : 'Your payment could not be verified. Please try again or contact the mess owner.',
    type: 'payment_rejected',
    link: '/student/subscriptions',
  })
}

export async function getAllPayments() {
  const q = query(collection(db, 'payments'), orderBy('createdAt', 'desc'), limit(200))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// ==========================================================================
// NOTIFICATIONS — simple in-app bell notifications for all roles.
// ==========================================================================
export async function createNotification(userId, { title, message, type, link }) {
  return addDoc(collection(db, 'notifications'), {
    userId, title, message, type: type || 'info', link: link || '',
    read: false, createdAt: serverTimestamp(),
  })
}

export function listenNotifications(userId, callback) {
  const q = query(collection(db, 'notifications'), where('userId', '==', userId))
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(newestFirst).slice(0, 30)))
}

export async function markNotificationRead(id) {
  await updateDoc(doc(db, 'notifications', id), { read: true })
}

export async function markAllNotificationsRead(notifications) {
  await Promise.all(notifications.filter((n) => !n.read).map((n) => updateDoc(doc(db, 'notifications', n.id), { read: true })))
}

// ==========================================================================
// DELIVERY PARTNERS — mess owner links delivery-role accounts to their mess
// so they can be assigned to routes. Linking is by the partner's email.
// ==========================================================================
export async function linkDeliveryPartner(messId, email) {
  const q = query(collection(db, 'users'), where('email', '==', email.trim().toLowerCase()), where('role', '==', 'delivery'))
  const snap = await getDocs(q)
  if (snap.empty) return { success: false, reason: 'No delivery partner account found with that email.' }
  const partnerDoc = snap.docs[0]
  await setDoc(doc(db, 'messDeliveryPartners', `${messId}_${partnerDoc.id}`), {
    messId, partnerId: partnerDoc.id, name: partnerDoc.data().name, email: partnerDoc.data().email, phone: partnerDoc.data().phone || '',
    linkedAt: serverTimestamp(),
  })
  return { success: true }
}

export async function getMessDeliveryPartners(messId) {
  const q = query(collection(db, 'messDeliveryPartners'), where('messId', '==', messId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function unlinkDeliveryPartner(linkId) {
  await deleteDoc(doc(db, 'messDeliveryPartners', linkId))
}

// Realtime listener over a whole collection (used by the admin reports; rules require role=admin).
export function listenCollection(name, onData, onError) {
  return onSnapshot(collection(db, name), (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), onError)
}

// One-off read of a collection filtered by equality conditions, e.g. getWhere('subscriptions', [['studentId', uid]]).
export async function getWhere(name, conditions = []) {
  const q = query(collection(db, name), ...conditions.map(([f, v]) => where(f, '==', v)))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// Realtime listener over a collection filtered by equality conditions, e.g.
// listenWhere('skips', [['studentId', uid]], cb). Equality-only filters need no composite index.
export function listenWhere(name, conditions, onData, onError) {
  const q = query(collection(db, name), ...conditions.map(([f, v]) => where(f, '==', v)))
  return onSnapshot(q, (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), (err) => { console.error(`listen ${name}`, err); onError?.(err) })
}

// ==========================================================================
// ADMIN — platform-wide aggregate stats (users, mess owners, income, commission).
// ==========================================================================
export async function getAdminOverview() {
  const [usersSnap, messSnap, subsSnap, paymentsSnap] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'messProfiles')),
    getDocs(collection(db, 'subscriptions')),
    getDocs(collection(db, 'payments')),
  ])

  const users = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
  const students = users.filter((u) => u.role === 'student')
  const messOwners = users.filter((u) => u.role === 'mess')
  const deliveryPartners = users.filter((u) => u.role === 'delivery')

  const payments = paymentsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
  const approvedPayments = payments.filter((p) => p.status === 'approved')
  const pendingPayments = payments.filter((p) => p.status === 'pending')

  const totalRevenue = approvedPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
  const totalCommission = approvedPayments.reduce((sum, p) => sum + (p.commission || 0), 0)
  const totalMessEarnings = approvedPayments.reduce((sum, p) => sum + (p.messEarning || 0), 0)

  return {
    totalUsers: users.length,
    totalStudents: students.length,
    totalMessOwners: messOwners.length,
    totalDeliveryPartners: deliveryPartners.length,
    totalMesses: messSnap.size,
    activeSubscriptions: subsSnap.docs.filter((d) => d.data().status === 'active').length,
    totalRevenue,
    totalCommission,
    totalMessEarnings,
    pendingPaymentsCount: pendingPayments.length,
    students,
    messOwners,
    deliveryPartners,
    payments,
  }
}
