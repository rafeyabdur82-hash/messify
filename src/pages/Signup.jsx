import { useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Logo from '../components/common/Logo.jsx'
import Icon from '../components/common/Icon.jsx'
import HomeButton from '../components/common/HomeButton.jsx'

const ROLES = [
  { id: 'student', label: 'Student', emoji: '🎓' },
  { id: 'mess', label: 'Mess Owner', emoji: '👨‍🍳' },
  { id: 'delivery', label: 'Delivery', emoji: '🛵' },
]
const VEHICLES = ['Two Wheeler / Scooter (Activa / EV)', 'Bicycle', 'Motorcycle']
const ZONES = [
  'Hingna & MIDC Hub (Wadi Link Road)',
  'Wadi & Dattawadi Hub',
  'Nagpur City Center (Sitabuldi & Dharampeth)',
  'Nagpur University Campus Cluster',
]

const BADGES = [
  { emoji: '🌿', title: '100% Shuddh', sub: 'Pure Vegetarian' },
  { emoji: '✨', title: 'FSSAI Grade', sub: 'Steam Sanitised' },
  { emoji: '🏡', title: 'Home Chefs', sub: 'Maa ke haath ka' },
]

const fieldCls =
  'w-full px-3.5 py-2.5 lg:py-1.5 text-sm lg:text-[13px] rounded-xl border border-stone-300 bg-brand-creamLight/40 text-brand-charcoal placeholder:text-stone-400 focus:bg-white focus:border-brand-forest focus:ring-[3px] focus:ring-brand-gold/30 focus:outline-none transition-all'

function Field({ label, children, hint }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1 lg:mb-0.5">
        <label className="block text-xs font-semibold text-brand-charcoal">
          {label} <span className="text-brand-saffron">*</span>
        </label>
        {hint && <span className="text-[10px] text-stone-500">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function PhoneInput({ value, onChange, placeholder }) {
  return (
    <div className="flex">
      <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-stone-300 bg-stone-100 text-stone-600 text-xs font-semibold whitespace-nowrap">🇮🇳 +91</span>
      <input
        type="tel" required inputMode="numeric" maxLength={10} pattern="[0-9]{10}" title="10 digit mobile number"
        value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))} placeholder={placeholder}
        className={`${fieldCls} !rounded-l-none`}
      />
    </div>
  )
}

function strength(pw) {
  if (!pw) return { score: 0, label: 'Weak', cls: 'text-stone-400' }
  let score = 0
  if (pw.length >= 6) score++
  if (pw.length >= 8 && /[0-9]/.test(pw)) score++
  if (pw.length >= 10 && /[^A-Za-z0-9]/.test(pw)) score++
  if (pw.length < 6) score = 1
  if (score <= 1) return { score: 1, label: 'Weak', cls: 'text-brand-chili' }
  if (score === 2) return { score: 2, label: 'Good', cls: 'text-brand-gold' }
  return { score: 3, label: 'Strong', cls: 'text-emerald-600' }
}

export default function Signup() {
  const [params] = useSearchParams()
  const { signup } = useAuth()
  const navigate = useNavigate()
  const routerLocation = useLocation()
  const from = routerLocation.state?.from

  const initialRole = ROLES.some((r) => r.id === params.get('role')) ? params.get('role') : 'student'
  const [role, setRole] = useState(initialRole)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [messName, setMessName] = useState('')
  const [area, setArea] = useState('')
  const [vehicle, setVehicle] = useState(VEHICLES[0])
  const [zone, setZone] = useState(ZONES[0])
  const [agree, setAgree] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const pw = strength(password)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!agree) { setError('Please accept the Terms of Service and Privacy Policy.'); return }
    setLoading(true)
    try {
      const extra = { phone }
      if (role === 'mess') { extra.messName = messName; extra.area = area; extra.rating = 0; extra.subscriberCount = 0 }
      if (role === 'student') { extra.area = area; extra.walletBalance = 0 }
      if (role === 'delivery') { extra.vehicle = vehicle; extra.zone = zone }
      await signup(email.trim(), password, name.trim(), role, extra)
      const home = role === 'student' ? '/student' : role === 'mess' ? '/mess' : '/delivery'
      navigate(from?.pathname?.startsWith(home) ? from.pathname + (from.search || '') : home)
    } catch (err) {
      setError(mapAuthError(err.code))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen lg:h-screen lg:min-h-0 lg:overflow-hidden bg-brand-cream flex items-center justify-center py-6 md:py-10 lg:py-4 px-4 md:px-8"
      style={{ backgroundImage: 'radial-gradient(#0F4D3A22 0.8px, transparent 0.8px)', backgroundSize: '24px 24px' }}
    >
      <div className="w-full max-w-7xl rounded-3xl overflow-hidden shadow-2xl border-2 border-brand-gold/40 bg-white grid grid-cols-1 lg:grid-cols-12 lg:h-full lg:max-h-[900px]">
        {/* LEFT: brand panel */}
        <div
          className="lg:col-span-5 bg-brand-forest p-7 sm:p-10 lg:p-8 text-white flex flex-col justify-between gap-8 lg:gap-3 relative overflow-hidden lg:min-h-0"
          style={{ backgroundImage: 'radial-gradient(rgba(224,165,38,0.16) 0.8px, transparent 0.8px)', backgroundSize: '28px 28px' }}
        >
          <div className="absolute -top-16 -left-16 w-80 h-80 rounded-full bg-brand-gold/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-10 right-0 w-64 h-64 rounded-full bg-brand-saffron/15 blur-2xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center justify-between gap-3 mb-6 lg:mb-3">
            <Link to="/" className="flex items-center gap-3 w-fit">
              <Logo className="w-12 h-12" />
              <div>
                <h1 className="font-heading font-bold text-2xl tracking-wide text-brand-cream leading-tight">Messify</h1>
                <p className="text-[11px] uppercase tracking-widest text-brand-gold font-semibold">Tiffin &amp; Mess Network</p>
              </div>
            </Link>
            <HomeButton />
            </div>
            <h2 className="font-heading font-bold text-3xl sm:text-4xl lg:text-[32px] text-brand-cream leading-snug mb-3 lg:mb-1">Home-style meals, delivered fresh daily.</h2>
            <p className="text-sm text-brand-cream/80 max-w-sm leading-relaxed font-light">
              Join students and verified homestyle kitchens across Hingna, Wadi &amp; Nagpur campuses.
            </p>
          </div>

          <div className="relative z-10 flex flex-col items-center lg:flex-1 lg:min-h-0 lg:justify-center">
            <div className="relative group">
              <div className="absolute -inset-2 rounded-full border border-dashed border-brand-gold/60 animate-[spin_40s_linear_infinite]" />
              <div className="w-52 h-52 sm:w-60 sm:h-60 lg:w-[clamp(8rem,26vh,15rem)] lg:h-[clamp(8rem,26vh,15rem)] rounded-full overflow-hidden shadow-2xl border-4 border-brand-cream/90 bg-brand-forestLight">
                <img src="/meal-image.png" alt="Messify thali meal" className="w-full h-full object-cover transition duration-500 group-hover:scale-105" />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-brand-saffron text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-lg border-2 border-white flex items-center gap-1">
                <span>🔥</span> Daily Fresh
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-7 lg:mt-4 w-full text-center">
              {BADGES.map((b) => (
                <div key={b.title} className="bg-black/25 backdrop-blur-sm border border-brand-gold/40 rounded-xl p-2">
                  <div className="text-sm mb-0.5">{b.emoji}</div>
                  <div className="font-bold text-[11px] text-brand-gold">{b.title}</div>
                  <div className="text-[9px] text-white/70">{b.sub}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 pt-4 border-t border-brand-gold/20">
            <blockquote className="text-xs italic text-brand-cream/90 mb-1 leading-relaxed">
              "Saved 40 mins daily finding pure ghar ka khana near the MIDC hostels. Unlimited phulka delivery is a game changer!"
            </blockquote>
            <p className="text-[11px] font-semibold text-brand-gold tracking-wide">— Aarav T., 2nd Year B.Tech • Hingna Hostel</p>
          </div>
        </div>

        {/* RIGHT: signup form */}
        <div className="lg:col-span-7 bg-brand-cream/60 p-5 sm:p-10 lg:p-4 flex flex-col justify-center lg:overflow-y-auto">
          <div className="max-w-xl mx-auto w-full bg-white rounded-2xl p-6 sm:p-8 lg:p-5 shadow-xl border border-brand-gold/35">
            <div className="mb-6 lg:mb-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-heading font-bold text-2xl sm:text-3xl text-brand-charcoal">Create your account</h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-brand-forest border border-emerald-200 whitespace-nowrap">⚡ 60s Signup</span>
              </div>
              <p className="text-xs text-stone-500 mt-1 lg:mt-0.5 [@media(max-height:700px)]:hidden">Takes less than a minute. Choose your profile role below to get started.</p>
            </div>

            <div className="mb-6 lg:mb-2">
              <span className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2 lg:mb-1">I am joining as:</span>
              <div className="grid grid-cols-3 gap-2 p-1.5 bg-brand-creamLight rounded-xl border border-brand-gold/30" role="tablist">
                {ROLES.map((r) => (
                  <button
                    key={r.id} type="button" role="tab" aria-selected={role === r.id} onClick={() => { setRole(r.id); setError('') }}
                    className={`flex items-center justify-center gap-1.5 py-2.5 lg:py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                      role === r.id ? 'bg-brand-forest text-white shadow-sm ring-1 ring-brand-gold/50' : 'text-brand-charcoal hover:bg-white'
                    }`}
                  >
                    <span className="text-sm">{r.emoji}</span>
                    <span>{r.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <form className="space-y-4 lg:space-y-2" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 lg:gap-2.5">
                <Field label="Full Name">
                  <input className={fieldCls} required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Priyank Patel" autoComplete="name" />
                </Field>
                <Field label="Email Address">
                  <input className={fieldCls} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@campus.edu.in" autoComplete="email" />
                </Field>
              </div>

              {role === 'student' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 lg:gap-2.5">
                    <Field label="Mobile Number"><PhoneInput value={phone} onChange={setPhone} placeholder="98765 43210" /></Field>
                    <Field label="Hostel / Campus Area">
                      <input className={fieldCls} required value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. RK Boys Hostel, Hingna" />
                    </Field>
                  </div>
                  <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-2.5 lg:p-1.5 text-[11px] text-amber-900 flex items-center gap-2 [@media(max-height:760px)]:hidden">
                    <span>💡</span>
                    <span><strong>Student perk:</strong> Free unlimited phulka refills on daily lunch &amp; dinner plans.</span>
                  </div>
                </>
              )}

              {role === 'mess' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 lg:gap-2.5">
                    <Field label="Business Phone"><PhoneInput value={phone} onChange={setPhone} placeholder="82386 92705" /></Field>
                    <Field label="Mess / Kitchen Name">
                      <input className={fieldCls} required value={messName} onChange={(e) => setMessName(e.target.value)} placeholder="e.g. Annapurna Kitchens" />
                    </Field>
                  </div>
                  <Field label="Kitchen Address & Landmark">
                    <input className={fieldCls} required value={area} onChange={(e) => setArea(e.target.value)} placeholder="Shradha Park, Wadi Link Road, MIDC, Hingna, Nagpur" />
                  </Field>
                </>
              )}

              {role === 'delivery' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 lg:gap-2.5">
                    <Field label="WhatsApp Phone"><PhoneInput value={phone} onChange={setPhone} placeholder="94081 22345" /></Field>
                    <Field label="Vehicle Type">
                      <select className={fieldCls} value={vehicle} onChange={(e) => setVehicle(e.target.value)}>
                        {VEHICLES.map((v) => <option key={v}>{v}</option>)}
                      </select>
                    </Field>
                  </div>
                  <Field label="Preferred Delivery Hub">
                    <select className={fieldCls} value={zone} onChange={(e) => setZone(e.target.value)}>
                      {ZONES.map((z) => <option key={z}>{z}</option>)}
                    </select>
                  </Field>
                </>
              )}

              <Field label="Create Password" hint="Min. 6 characters">
                <div className="relative">
                  <input
                    className={`${fieldCls} !pr-10`} type={showPw ? 'text' : 'password'} required minLength={6} value={password}
                    onChange={(e) => setPassword(e.target.value)} placeholder="Choose a strong password" autoComplete="new-password"
                  />
                  <button type="button" aria-label="Toggle password visibility" onClick={() => setShowPw((s) => !s)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-700">
                    <Icon name={showPw ? 'visibility_off' : 'visibility'} className="text-lg" />
                  </button>
                </div>
                <div className="mt-2 lg:mt-1 flex items-center gap-1.5">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="h-1 flex-1 rounded-full bg-stone-200 overflow-hidden">
                      <div className={`h-full transition-all duration-300 ${n <= pw.score ? 'w-full' : 'w-0'} ${n === 1 ? 'bg-brand-chili' : n === 2 ? 'bg-brand-gold' : 'bg-emerald-600'}`} />
                    </div>
                  ))}
                  <span className={`text-[10px] font-semibold w-12 text-right ${pw.cls}`}>{pw.label}</span>
                </div>
              </Field>

              <label className="flex items-start gap-2 pt-1 lg:pt-0 cursor-pointer">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 rounded accent-brand-forest" />
                <span className="text-[11px] text-stone-500 leading-normal">
                  I agree to Messify's <span className="text-brand-saffron font-medium">Terms of Service</span>,{' '}
                  <span className="text-brand-saffron font-medium">Privacy Policy</span>, and daily tiffin delivery guidelines.
                </span>
              </label>

              {error && (
                <p role="alert" className="text-brand-chili text-[13px] bg-red-50 border border-red-100 px-3.5 py-2.5 lg:py-1.5 rounded-xl flex items-start gap-2">
                  <Icon name="error" className="text-base mt-px" /> <span>{error}</span>
                </p>
              )}

              <button
                type="submit" disabled={loading}
                className="w-full py-3 lg:py-2 px-6 rounded-xl bg-brand-saffron hover:bg-brand-saffronHover text-white font-semibold text-sm tracking-wide shadow-lg shadow-brand-saffron/30 transition-all flex items-center justify-center gap-2 group disabled:opacity-80 disabled:cursor-wait"
              >
                <span>{loading ? 'Creating your account...' : 'Create Account'}</span>
                {loading
                  ? <Icon name="progress_activity" className="text-lg animate-spin" />
                  : <Icon name="arrow_forward" className="text-lg transition-transform group-hover:translate-x-1" />}
              </button>

              <div className="text-center pt-3 lg:pt-1.5 text-xs text-stone-500 border-t border-stone-100">
                Already have a Messify account?{' '}
                <Link to="/login" state={routerLocation.state} className="text-brand-saffron font-bold hover:underline">Log in here</Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

function mapAuthError(code) {
  const map = {
    'auth/email-already-in-use': 'This email is already registered. Try logging in instead.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/configuration-not-found': 'Sign-up is not enabled yet: turn on Authentication → Email/Password in Firebase console.',
    'auth/operation-not-allowed': 'Email/Password sign-in is disabled in Firebase console → Authentication.',
    'auth/network-request-failed': 'Network error. Check your internet connection and try again.',
    'permission-denied': 'Account created but saving your profile was blocked. Publish firestore.rules in Firebase console.',
  }
  return map[code] || `Something went wrong${code ? ` (${code})` : ''}. Please try again.`
}
