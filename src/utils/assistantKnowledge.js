// Knowledge base + matcher for the in-app Messify assistant.
// Everything here describes how THIS project really works (checkout, plans, coupons, roles, pages).
// No external AI/API is used: questions are scored against keyword groups and the best intent answers.
// Update the facts below whenever the product changes.

import { BUSINESS, COUPONS, COMMISSION_RATE, formatINR } from '../constants.js'
import { PLANS } from './pricing.js'

const HOME = { student: '/student', mess: '/mess', delivery: '/delivery', admin: '/admin' }
const LABEL = { student: 'student', mess: 'mess owner', delivery: 'delivery partner', admin: 'admin' }

const planLines = PLANS.map((p) => `• ${p.label}: ${p.desc}`).join('\n')
const couponLines = Object.entries(COUPONS)
  .map(([code, c]) => `• ${code} — ${formatINR(c.flat)} off${c.min ? ` plans of ${formatINR(c.min)} or more` : ' any plan'}`)
  .join('\n')

// keys: [phrase, weight]. A trailing * means "word starts with" (so "subscri*" hits subscribe/subscription).
// live: name of a data lookup the UI runs for signed-in users (see AIAgent.jsx).
export const INTENTS = [
  {
    id: 'greeting', keys: [['hi', 3], ['hello', 3], ['hey', 3], ['namaste', 3], ['good morning', 3], ['good evening', 3]],
    answer: ({ name }) => ({ text: `Hi${name ? ` ${name}` : ''}! I'm the Messify assistant. I can explain plans, checkout and payments, skipping meals, delivery tracking, or help you as a mess owner or delivery partner. What do you need?` }),
  },
  {
    id: 'thanks', keys: [['thanks', 3], ['thank you', 3], ['thx', 3]],
    answer: () => ({ text: "You're welcome! Ask me anything else about Messify." }),
  },
  {
    id: 'what', keys: [['what is messify', 4], ['about messify', 4], ['what is this', 3], ['what does messify', 3], ['how does messify work', 4], ['how it works', 3], ['how does it work', 3]],
    answer: () => ({
      text: `Messify connects students and working professionals in Nagpur with verified home-style mess and tiffin kitchens. You pick a mess, choose a plan, pay by UPI QR or cash on delivery, and get lunch/dinner delivered. You can skip meals, track the delivery live, and see your bill. Mess owners manage menus, payments and delivery; delivery partners run the routes.`,
      link: '/student/browse', linkLabel: 'Browse messes',
    }),
  },
  {
    id: 'subscribe', keys: [['subscri*', 3], ['join a mess', 3], ['book', 2], ['order', 2], ['buy', 2], ['get started', 2], ['start meals', 2], ['how to eat', 2]],
    answer: ({ role }) => ({
      text: `To order a meal plan:\n1. Open Browse Messes and pick a mess.\n2. Choose a plan:\n${planLines}\n3. Continue to checkout: you need an account first. Add your delivery address, landmark, slot (lunch/dinner) and any dietary note.\n4. Choose Pay Online (UPI QR) or Cash on Delivery.\nCash on Delivery confirms immediately; UPI QR activates once the mess owner approves your payment.`,
      link: role === 'student' ? '/student/browse' : '/login', linkLabel: role === 'student' ? 'Browse messes' : 'Log in to order',
    }),
  },
  {
    id: 'plans', keys: [['plan*', 3], ['price*', 3], ['cost', 3], ['how much', 3], ['rate', 2], ['weekly', 3], ['monthly', 3], ['lunch only', 3], ['pass', 2], ['charges', 2]],
    answer: ({ role }) => ({
      text: `Plans:\n${planLines}\nThe price is built from the mess's lunch and dinner prices for those days, with a bundled ~8% discount compared with paying daily. If a mess hasn't set prices yet, defaults of ₹70 (lunch) and ₹85 (dinner) are used. Each mess sets its own prices on its menu, so see the exact amount on the mess page.`,
      link: role === 'student' ? '/student/browse' : undefined, linkLabel: 'Browse messes',
    }),
  },
  {
    id: 'cod', keys: [['cash', 4], ['cod', 4], ['cash on delivery', 5], ['pay on delivery', 5], ['pay later', 3], ['pay at door', 3]],
    answer: () => ({ text: 'Yes, Cash on Delivery is available at checkout. Choose "Cash on Delivery" and your order is confirmed immediately; you pay the delivery partner when the tiffin arrives. Cash-on-delivery orders are not part of the 3% platform commission totals.' }),
  },
  {
    id: 'payment', keys: [['pay*', 2], ['upi', 4], ['qr', 2], ['utr', 4], ['screenshot', 3], ['proof', 3], ['online payment', 4], ['gpay', 3], ['phonepe', 3], ['paytm', 3], ['payment', 3]],
    answer: ({ role }) => ({
      text: `Online payment is a manual UPI flow:\n1. At checkout choose Pay Online.\n2. Scan the mess owner's UPI QR and pay from any UPI app (GPay, PhonePe, Paytm…).\n3. Submit your name, the UTR/transaction number and a screenshot.\n4. The mess owner reviews and approves it; your plan then activates and you get a notification.\nIf it's rejected you'll see the reason and can pay again. Prefer no UPI? Use Cash on Delivery.`,
      link: role === 'student' ? '/student/subscriptions' : undefined, linkLabel: 'My subscriptions',
    }),
  },
  {
    id: 'pending', keys: [['pending', 3], ['not approved', 4], ['payment not', 3], ['waiting', 2], ['approval', 3], ['not active', 3], ['still pending', 4]],
    answer: () => ({ text: 'A UPI payment stays "pending" until the mess owner approves it (they get a notification). If it has been a while, call the mess or the Messify helpline. Make sure the UTR number and screenshot you submitted were correct. Cash on Delivery orders are active immediately.', link: '/student/subscriptions', linkLabel: 'Check my subscriptions' }),
  },
  {
    id: 'coupon', keys: [['coupon*', 4], ['promo*', 4], ['discount*', 3], ['offer*', 3], ['code', 2], ['messify50', 5], ['messify100', 5], ['voucher', 3]],
    answer: () => ({ text: `Coupon codes you can apply at checkout:\n${couponLines}\nEnter the code in the coupon box on the checkout page and the discount is applied to the total.` }),
  },
  {
    id: 'skip', keys: [['skip*', 5], ['not eating', 4], ["won't eat", 4], ['pause', 3], ['leave', 2], ['travel', 2], ['holiday', 2], ['not need', 2], ['cancel meal', 4]],
    answer: ({ role }) => ({
      text: 'Open your Home dashboard and tap Skip Lunch or Skip Dinner for today. The skipped meal amount is credited in your monthly ledger so your bill adjusts automatically, and the mess owner sees it so they cook less. Skip before the meal is prepared (guideline: lunch before 9 AM, dinner before 5 PM).',
      link: role === 'student' ? '/student' : undefined, linkLabel: 'Open dashboard',
    }),
  },
  {
    id: 'custom', keys: [['custom*', 4], ['special request', 4], ['less spicy', 3], ['no onion', 3], ['jain', 3], ['diet*', 3], ['allerg*', 3], ['extra roti', 3], ['change menu', 3]],
    answer: () => ({ text: 'Use the Custom Request card on your Home dashboard: choose lunch or dinner and describe what you want (for example "less spicy, no onion"). The mess owner gets it and can accept or reject; you will see the status on the card. You can also add a dietary note at checkout.', link: '/student', linkLabel: 'Open dashboard' }),
  },
  {
    id: 'billing', keys: [['bill*', 4], ['ledger', 4], ['invoice', 3], ['statement', 3], ['history', 2], ['balance', 2], ['refund', 3], ['credit', 2]],
    answer: ({ role }) => ({
      text: role === 'mess'
        ? 'The Ledger page shows confirmed payments, your 3% platform fee and what you receive (97%).'
        : 'The Billing page lists every meal charged or skipped this month, your payment history and the monthly total. Skipped meals show as credits. Refunds are handled by the mess owner directly; contact them or the helpline.',
      link: role === 'mess' ? '/mess/ledger' : '/student/billing', linkLabel: role === 'mess' ? 'Open ledger' : 'View billing',
    }),
  },
  {
    id: 'track', keys: [['track*', 5], ['where is my', 5], ['eta', 3], ['live location', 4], ['delivery status', 4], ['rider', 3], ['not delivered', 3], ['late', 2], ['map', 3]],
    answer: ({ role }) => ({
      text: 'When the delivery partner starts today\'s route, your Home dashboard shows a live tracking card (stops away, then "arriving"), and the Track page shows the rider on a map. Location updates while the rider keeps the route page open. If the route has not started yet you will see "Preparing" or "Not started".',
      link: role === 'student' ? '/student' : undefined, linkLabel: 'Open dashboard',
    }),
  },
  {
    id: 'tiffin_qr', keys: [['tiffin box', 4], ['box qr', 4], ['tiffin qr', 4], ['scan*', 3], ['box return', 3], ['dabba', 3]],
    answer: ({ role }) => ({
      text: role === 'delivery'
        ? 'Use Scan Tiffin QR in the sidebar: pick Deliver or Return mode and scan the QR printed on the student\'s box. That updates the box status for the student and mess owner.'
        : 'Each active subscription has a tiffin box QR on your dashboard. The delivery partner scans it when delivering and when collecting the empty box, so the box status is always tracked.',
      link: role === 'delivery' ? '/delivery/scan' : '/student', linkLabel: role === 'delivery' ? 'Open scanner' : 'Open dashboard',
    }),
  },
  {
    id: 'login', keys: [['login*', 4], ['log in', 4], ['sign in', 4], ['cant login', 5], ["can't login", 5], ['unable to login', 5], ['wrong portal', 5], ['portal', 3], ['admin login', 4]],
    answer: () => ({ text: 'Log in at /login and pick your tab: Student, Mess Owner or Delivery. If you choose the wrong tab you will see "Wrong portal" with the right one. Admins use the separate Admin Access page. Use the same email and password you signed up with; if that fails, use Forgot password.', link: '/login', linkLabel: 'Go to login' }),
  },
  {
    id: 'signup', keys: [['sign up', 4], ['signup', 4], ['register*', 4], ['create account', 4], ['new account', 4], ['account', 2]],
    answer: () => ({ text: 'Sign up at /signup and pick your role:\n• Student: name, email, mobile, hostel/campus area.\n• Mess Owner: business phone, kitchen name and address.\n• Delivery: WhatsApp phone, vehicle type and preferred hub.\nPassword must be at least 6 characters. You must accept the terms to continue.', link: '/signup', linkLabel: 'Create account' }),
  },
  {
    id: 'password', keys: [['password', 4], ['forgot', 4], ['reset', 3], ['change password', 5]],
    answer: () => ({ text: 'Forgot it? On the login page type your email and tap "Forgot password?"; a reset link is sent to your inbox. If you are logged in, change your password from your Profile page.', link: '/login', linkLabel: 'Go to login' }),
  },
  {
    id: 'owner_start', keys: [['become a mess', 5], ['list my mess', 5], ['start a mess', 5], ['sell tiffin', 5], ['register my mess', 5], ['mess owner', 3], ['partner', 3], ['join as mess', 5]],
    answer: ({ role }) => ({
      text: 'Listing a mess is free. Sign up as a Mess Owner, then: (1) add today\'s lunch and dinner on the Meals page, (2) upload your UPI QR on the UPI QR page, (3) approve student payments on the Payments page, (4) link delivery partners by their email and create routes. Messify keeps a 3% fee on approved online payments.',
      link: role === 'mess' ? '/mess' : '/signup?role=mess', linkLabel: role === 'mess' ? 'Open my dashboard' : 'Register my mess',
    }),
  },
  {
    id: 'menu', keys: [["add today's menu", 9], ['add todays menu', 9], ["update today's menu", 9], ['update todays menu', 9], ['add menu', 5], ['update menu', 5], ['post menu', 5], ['set menu', 5], ['add meal', 5], ['change price', 4], ['edit menu', 5], ['menu price', 3]],
    roles: ['mess'],
    answer: () => ({ text: 'Open Meals in the sidebar, enter the lunch and dinner items plus the price per meal, and Save Menu. Students see it instantly on their dashboard, Browse Messes and the landing page. Menus are per day, so update it daily.', link: '/mess/menu', linkLabel: 'Open Meals' }),
  },
  {
    id: 'approve', keys: [['approve payment', 8], ['approve a payment', 8], ['approve', 4], ['reject', 3], ['verify payment', 4], ['payment request', 3], ['receipt', 3]],
    roles: ['mess'],
    answer: () => ({ text: 'Open Payments (or the Needs Attention card on Home). Check the student\'s UTR and screenshot against your bank/UPI app, then Approve to activate their plan, or Reject with a reason. Approving notifies the student.', link: '/mess/payments', linkLabel: 'Open payments' }),
  },
  {
    id: 'upiqr_setup', keys: [['upload qr', 5], ['my qr', 4], ['payment qr', 4], ['upi qr', 4], ['qr code', 3]],
    roles: ['mess'],
    answer: () => ({ text: 'Upload your UPI payment QR on the UPI QR page. Students scan it at checkout when they choose Pay Online. You can also download your mess\'s shareable QR from the same page.', link: '/mess/qr', linkLabel: 'Open UPI QR' }),
  },
  {
    id: 'partners', keys: [['delivery partner*', 4], ['add rider', 4], ['link delivery', 5], ['create route', 5], ['assign', 3], ['route', 3]],
    roles: ['mess'],
    answer: () => ({ text: 'On the Delivery page, link a delivery partner using the email they signed up with (they need a Delivery account first). Then create a route for lunch or dinner with the students\' stops and assign the partner. Students on that route can then track the delivery live.', link: '/mess/delivery-partners', linkLabel: 'Open Delivery' }),
  },
  {
    id: 'delivery_work', keys: [['start a route', 7], ['start route', 6], ['start my route', 7], ['mark delivered', 5], ['my route', 4], ['deliver', 3], ['delivery partner', 3], ['rider', 2], ['gps', 3], ['share location', 4]],
    roles: ['delivery'],
    answer: () => ({ text: 'Open My Routes, choose today\'s route and tap Start Route. Keep that page open: it shares your live GPS so students can track you. Mark each stop Delivered as you go, and use Scan Tiffin QR to deliver/return boxes. If a route is missing, ask the mess owner to assign you to it.', link: '/delivery', linkLabel: 'Open my routes' }),
  },
  {
    id: 'commission', keys: [['commission', 5], ['platform fee', 5], ['platform charge', 5], ['service fee', 4], ['fee', 2], ['payout', 3]],
    answer: () => ({ text: `Messify keeps a ${Math.round(COMMISSION_RATE * 100)}% platform commission on each approved online (UPI) payment; the mess owner receives the remaining ${100 - Math.round(COMMISSION_RATE * 100)}%. Cash-on-delivery orders are not counted in these totals. Students never pay extra.` }),
  },
  {
    id: 'contact', keys: [['contact', 4], ['support', 4], ['help line', 4], ['helpline', 4], ['phone', 3], ['call', 3], ['whatsapp', 3], ['human', 3], ['customer care', 4], ['complain*', 3]],
    answer: () => ({ text: `Messify helpline: ${BUSINESS.phone} (7 AM – 11 PM).\nOffice: ${BUSINESS.address}.`, link: BUSINESS.phoneHref, linkLabel: 'Call helpline', external: true }),
  },
  {
    id: 'address', keys: [['address', 4], ['where are you', 4], ['location', 3], ['office', 3], ['hq', 3], ['nagpur', 2], ['area', 2], ['hingna', 3]],
    answer: () => ({ text: `Messify is based at ${BUSINESS.address}. We serve Hingna, MIDC, Wadi and nearby Nagpur areas. The landing page detects your location to show what's near you.` }),
  },
  {
    id: 'timings', keys: [['timing*', 4], ['time', 2], ['when', 2], ['lunch time', 4], ['dinner time', 4], ['hours', 3], ['cutoff', 4], ['deadline', 3]],
    answer: () => ({ text: 'Lunch is served about 12 PM – 3 PM and dinner about 7:30 PM – 10:30 PM. Skip lunch before 9 AM and dinner before 5 PM so the kitchen can plan. The helpline is open 7 AM – 11 PM.' }),
  },
  {
    id: 'notifications', keys: [['notification*', 4], ['bell', 3], ['alert*', 3]],
    answer: () => ({ text: 'The bell icon at the top right shows your notifications: payment approvals/rejections, custom request replies, new orders for mess owners, and so on. A red badge shows unread ones.' }),
  },
  {
    id: 'admin', keys: [['admin', 4], ['report*', 3], ['dashboard data', 3]],
    answer: ({ role }) => ({ text: 'The admin console at /admin shows live reports of every table (users, messes, menus, orders, payments, deliveries, skips, requests, ledger, boxes, notifications) with search and CSV export. Admins sign in at /admin/login.', link: role === 'admin' ? '/admin' : '/admin/login', linkLabel: 'Admin access' }),
  },
  {
    id: 'veg', keys: [['veg', 3], ['non veg', 3], ['vegetarian', 3], ['oil', 3], ['hygien*', 3], ['fssai', 3], ['quality', 2], ['jain', 2]],
    answer: () => ({ text: 'Messify partner kitchens are listed as pure vegetarian home-style messes using groundnut/sunflower oil. Each mess posts its own daily menu, so check the mess page for exact dishes, and use Custom Request for Jain or no-onion needs.' }),
  },
  // ---- live data intents (need a signed-in user; the UI fetches the data) ----
  {
    id: 'live_menu', keys: [["today's menu", 6], ['todays menu', 6], ['menu today', 6], ['what is for lunch', 6], ['whats for lunch', 6], ['whats for dinner', 6], ['what is for dinner', 6], ['menu', 2], ['lunch', 1], ['dinner', 1]],
    live: 'menus',
  },
  {
    id: 'live_mine', keys: [['my subscription', 7], ['my plan', 7], ['my order', 6], ['my pass', 6], ['plan status', 6], ['my status', 5], ['active plan', 6], ['do i have', 4]],
    roles: ['student'], live: 'mySubs',
  },
  {
    id: 'live_mess_stats', keys: [['how many subscribers', 7], ['pending payments', 7], ['my subscribers', 7], ['my earnings', 6], ['pending requests', 5], ['status of my mess', 6], ['how is my mess', 6]],
    roles: ['mess'], live: 'messStats',
  },
  {
    id: 'live_messes', keys: [['which messes', 6], ['list of messes', 6], ['available messes', 6], ['messes near', 5], ['best mess', 5], ['recommend*', 4], ['how many messes', 6]],
    live: 'messes',
  },
]

const FALLBACK = "I'm not sure about that one. I can help with plans and prices, checkout, UPI and cash on delivery, coupons, skipping meals, custom requests, billing, delivery tracking, logging in and signing up, and mess owner or delivery partner tasks."

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const norm = (t) => t.toLowerCase().replace(/[’`]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim()

function score(text, intent, role) {
  if (intent.roles && !intent.roles.includes(role)) return 0
  let total = 0
  for (const [phrase, weight] of intent.keys) {
    const prefix = phrase.endsWith('*')
    const p = escape(norm(prefix ? phrase.slice(0, -1) : phrase))
    const re = new RegExp(`(^| )${p}${prefix ? '' : '( |$)'}`)
    if (re.test(text)) total += weight
  }
  return total
}

// Returns { intent, score } for the best match, or null when nothing is convincing.
export function matchIntent(question, role = 'guest') {
  const text = norm(question)
  if (!text) return null
  let best = null
  for (const intent of INTENTS) {
    const s = score(text, intent, role)
    if (s > 0 && (!best || s > best.score)) best = { intent, score: s }
  }
  // Role-specific intents win ties with the generic ones.
  return best && best.score >= 3 ? best : null
}

export const GENERAL_FALLBACK = FALLBACK

export function suggestionsFor(role) {
  if (role === 'mess') return ['How do I add today\'s menu?', 'How do I approve a payment?', 'How many subscribers do I have?', 'What is the platform fee?']
  if (role === 'delivery') return ['How do I start a route?', 'How do I scan a tiffin QR?', 'Why can\'t students track me?', 'Contact support']
  if (role === 'student') return ['What is my subscription status?', 'How do I skip a meal?', 'Is cash on delivery available?', "Today's menu"]
  return ['How does Messify work?', 'What are the plans and prices?', 'Is cash on delivery available?', 'How do I list my mess?']
}

export { HOME, LABEL }
