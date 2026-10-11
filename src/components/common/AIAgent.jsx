import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { getWhere } from '../../firebase/firestore.js'
import { formatINR } from '../../constants.js'
import { matchIntent, GENERAL_FALLBACK, suggestionsFor } from '../../utils/assistantKnowledge.js'

// In-app assistant trained on this project's own rules (see utils/assistantKnowledge.js).
// It answers from that knowledge base and, for signed-in users, looks up their live Firestore data
// (their subscriptions, today's menus, mess stats). No external AI API or key is involved.

const todayStr = () => new Date().toISOString().slice(0, 10)
const planName = { weekly: 'Weekly', monthly: 'Monthly', monthly_lunch: 'Monthly (Lunch only)' }

async function runLive(kind, { currentUser, role }) {
  if (kind === 'menus' || kind === 'messes') {
    const [profiles, menus] = await Promise.all([getWhere('messProfiles'), getWhere('menus', [['date', todayStr()]])])
    if (!profiles.length) return { text: 'No messes have joined Messify yet, so there are no menus to show.' }
    const byMess = Object.fromEntries(menus.map((m) => [m.messId, m]))
    if (kind === 'messes') {
      return { text: `${profiles.length} mess${profiles.length === 1 ? '' : 'es'} listed right now:\n` + profiles.slice(0, 8).map((m) => `• ${m.messName}${m.area ? ` — ${m.area}` : ''}${m.rating ? ` (★ ${Number(m.rating).toFixed(1)})` : ''}`).join('\n'), link: '/student/browse', linkLabel: 'Browse messes' }
    }
    const lines = profiles.slice(0, 6).map((m) => {
      const menu = byMess[m.id]
      const part = (label, slot) => (slot?.items ? `${label}: ${slot.items}${slot.price ? ` (${formatINR(slot.price)})` : ''}` : `${label}: not posted yet`)
      return `• ${m.messName}\n   ${part('Lunch', menu?.lunch)}\n   ${part('Dinner', menu?.dinner)}`
    })
    return { text: `Today's menus (live):\n${lines.join('\n')}`, link: role === 'student' ? '/student/browse' : '/login', linkLabel: role === 'student' ? 'Browse messes' : 'Log in to order' }
  }
  if (!currentUser) return { text: 'Please log in first and I can look that up for you.', link: '/login', linkLabel: 'Log in' }
  if (kind === 'mySubs') {
    const [subs, profiles] = await Promise.all([getWhere('subscriptions', [['studentId', currentUser.uid]]), getWhere('messProfiles')])
    const live = subs.filter((s) => s.status !== 'cancelled')
    if (!live.length) return { text: "You don't have a subscription yet. Browse messes, pick a plan and check out. Cash on delivery activates immediately.", link: '/student/browse', linkLabel: 'Browse messes' }
    const names = Object.fromEntries(profiles.map((p) => [p.id, p.messName]))
    const status = { active: 'Active', pending_payment: 'Waiting for payment approval', payment_rejected: 'Payment rejected — pay again', paused: 'Paused' }
    return {
      text: 'Your subscriptions:\n' + live.map((s) => `• ${names[s.messId] || 'Mess'} — ${planName[s.plan] || s.plan}: ${status[s.status] || s.status}${s.paymentMethod === 'cod' ? ' (cash on delivery)' : ''}`).join('\n'),
      link: '/student/subscriptions', linkLabel: 'My subscriptions',
    }
  }
  if (kind === 'messStats') {
    const [subs, pay, reqs] = await Promise.all([
      getWhere('subscriptions', [['messId', currentUser.uid], ['status', 'active']]),
      getWhere('payments', [['messId', currentUser.uid], ['status', 'pending']]),
      getWhere('customRequests', [['messId', currentUser.uid], ['status', 'pending']]),
    ])
    return {
      text: `Right now: ${subs.length} active subscriber${subs.length === 1 ? '' : 's'}, ${pay.length} payment${pay.length === 1 ? '' : 's'} waiting for your approval (${formatINR(pay.reduce((t, p) => t + (p.amount || 0), 0))}), and ${reqs.length} custom request${reqs.length === 1 ? '' : 's'} pending.`,
      link: pay.length ? '/mess/payments' : '/mess', linkLabel: pay.length ? 'Review payments' : 'Open dashboard',
    }
  }
  return { text: GENERAL_FALLBACK }
}

export default function AIAgent() {
  const { currentUser, profile } = useAuth()
  const navigate = useNavigate()
  const role = profile?.role || 'guest'
  const firstName = profile?.name?.split(' ')[0] || ''
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [messages, setMessages] = useState([
    { from: 'bot', text: "Hi! I'm the Messify assistant. Ask me about plans, payments, skipping meals, delivery tracking, or your account." },
  ])
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, open, busy])

  async function ask(text) {
    const q = text.trim()
    if (!q || busy) return
    setMessages((prev) => [...prev, { from: 'user', text: q }])
    setInput('')
    setBusy(true)
    let reply
    try {
      const match = matchIntent(q, role)
      if (!match) reply = { text: GENERAL_FALLBACK }
      else if (match.intent.live) reply = await runLive(match.intent.live, { currentUser, role })
      else reply = match.intent.answer({ role, name: firstName })
    } catch (err) {
      console.error('Assistant lookup failed', err)
      reply = { text: "I couldn't load live data right now. Please check your connection and try again." }
    }
    setMessages((prev) => [...prev, { from: 'bot', ...reply }])
    setBusy(false)
  }

  function openLink(m) {
    if (m.external) window.location.href = m.link
    else { navigate(m.link); setOpen(false) }
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="!fixed bottom-20 right-4 sm:right-5 z-40 w-14 h-14 rounded-full bg-brand-forest text-white shadow-lg grid place-items-center text-2xl hover:-translate-y-1 transition-transform btn-glow"
        aria-label="Open Messify assistant"
      >
        {open ? '✕' : '🤖'}
      </button>

      {open && (
        <div className="fixed bottom-36 right-4 sm:right-5 z-40 w-[360px] max-w-[92vw] h-[520px] max-h-[70vh] bg-white border border-brand-gold/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fadeUp">
          <div className="bg-brand-forest text-white px-4 py-3 flex items-center gap-2">
            <span className="text-lg">🤖</span>
            <div>
              <div className="font-bold text-sm">Messify Assistant</div>
              <div className="text-[11px] opacity-80">{currentUser ? `Signed in as ${LABEL_OF[role] || 'user'}` : 'Ask anything about Messify'}</div>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 bg-brand-creamLight">
            {messages.map((m, i) => (
              <div key={i} className={`max-w-[88%] ${m.from === 'user' ? 'self-end' : 'self-start'}`}>
                <div className={`px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed whitespace-pre-line ${m.from === 'user' ? 'bg-brand-forest text-white rounded-br-sm' : 'bg-white border border-brand-gold/30 text-brand-charcoal rounded-bl-sm'}`}>
                  {m.text}
                </div>
                {m.link && (
                  <button onClick={() => openLink(m)} className="mt-1.5 text-xs font-bold text-brand-saffron hover:underline">
                    {m.linkLabel || 'Open'} →
                  </button>
                )}
              </div>
            ))}
            {busy && <div className="self-start px-3.5 py-2.5 rounded-2xl bg-white border border-brand-gold/30 text-sm text-stone-500">Checking…</div>}
            {messages.length <= 2 && !busy && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {suggestionsFor(role).map((s) => (
                  <button key={s} type="button" onClick={() => ask(s)} className="px-3 py-1.5 rounded-full bg-white border border-brand-gold/50 text-[12px] text-brand-forest font-semibold hover:bg-brand-forest hover:text-white transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); ask(input) }} className="border-t border-brand-gold/30 p-2.5 flex gap-2 bg-white">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              className="flex-1 px-3.5 py-2.5 border border-stone-300 rounded-full text-sm focus:outline-none focus:border-brand-forest"
            />
            <button type="submit" disabled={busy} className="w-10 h-10 bg-brand-saffron text-white rounded-full grid place-items-center flex-shrink-0 disabled:opacity-60" aria-label="Send">→</button>
          </form>
        </div>
      )}
    </>
  )
}

const LABEL_OF = { student: 'a student', mess: 'a mess owner', delivery: 'a delivery partner', admin: 'admin' }
