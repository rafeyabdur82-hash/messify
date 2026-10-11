import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../firebase/config'
import { useAuth } from '../context/AuthContext.jsx'
import Icon from '../components/common/Icon.jsx'
import Logo from '../components/common/Logo.jsx'
import HomeButton from '../components/common/HomeButton.jsx'
import { mapAuthError, ROLE_HOME } from '../utils/authErrors.js'

const PORTALS = [
  { role: 'student', label: 'Student', badge: 'Student Portal', placeholder: 'student@university.edu' },
  { role: 'mess', label: 'Mess Owner', badge: 'Mess Owner Portal', placeholder: 'kitchen@yourmess.in' },
  { role: 'delivery', label: 'Delivery', badge: 'Delivery Partner Portal', placeholder: 'rider@messify.in' },
]
const ROLE_NAME = { student: 'student', mess: 'mess owner', delivery: 'delivery partner' }

const HERO_IMAGE = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCH_-rrRI8TDoY-H1sSlRs_k_KDEGXyd-uYPSss06vbEkdmDZ3dnjUjGefVSc4JoFSex4-4uXBpSx_t0-pEGjNMVIq216_ANQBmiIvK2XwlE-P3rUNTN9TC94fQ7lkhBcxmYM2cuxNRurYj_yfGBkkyj_tajg4r0loBghqabVfcei2s5BBGTX0HeOfW40_KmMtiECbAQklJG9OaOYdQ9NcvNzQ3k5YRbZl1FUzuUFk'

const TRUST = [
  { icon: null, title: '100% Pure Veg', sub: 'Certified Kitchens' },
  { icon: 'verified', title: 'Hygienic Messes', sub: 'Daily Audits' },
  { icon: 'favorite', title: 'Family Run', sub: 'Homely Taste' },
]

export default function Login() {
  const { login, logout } = useAuth()
  const navigate = useNavigate()
  const routerLocation = useLocation()
  const from = routerLocation.state?.from?.pathname
  const [portal, setPortal] = useState(PORTALS[0])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState({ title: '', text: '' })
  const [info, setInfo] = useState('')
  const [demoLogins, setDemoLogins] = useState([]) // dev only; the dynamic import is removed from production builds
  useEffect(() => { if (import.meta.env.DEV) import('../data/demoAccounts.js').then((m) => setDemoLogins(m.QUICK_LOGINS)) }, [])
  const [loading, setLoading] = useState(false)

  const showError = (title, text) => setError({ title, text })
  const clearError = () => setError({ title: '', text: '' })

  function selectPortal(p) {
    setPortal(p)
    clearError()
    setInfo('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    clearError()
    setInfo('')
    setLoading(true)
    try {
      const { profile } = await login(email.trim(), password, remember)
      if (!profile) {
        await logout()
        showError('Account details missing', 'We found your login, but could not find your account details. Please contact support or try signing up again.')
      } else if (profile.role === 'admin') {
        await logout()
        showError('Admin account', 'Admins sign in through the Admin Access page.')
      } else if (profile.role !== portal.role) {
        await logout()
        const actual = ROLE_NAME[profile.role] || profile.role
        showError('Wrong portal', `This account is registered as a ${actual}. Please switch to the ${actual} tab and try again.`)
      } else {
        // Send them back to the page they were trying to open (e.g. checkout) when it belongs to their role.
        const home = ROLE_HOME[profile.role] || '/'
        navigate(from && from.startsWith(home) ? from + (routerLocation.state.from.search || '') : home)
      }
    } catch (err) {
      showError('Login failed', mapAuthError(err.code))
    } finally {
      setLoading(false)
    }
  }

  async function handleForgot(e) {
    e.preventDefault()
    clearError()
    setInfo('')
    if (!email.trim()) {
      showError('Enter your email', 'Type your email above first, then tap "Forgot password?" again.')
      return
    }
    try {
      await sendPasswordResetEmail(auth, email.trim())
      setInfo(`Password reset link sent to ${email.trim()}. Check your inbox.`)
    } catch (err) {
      showError('Could not send reset email', mapAuthError(err.code))
    }
  }

  const inputCls = 'w-full bg-surface-container-low text-on-surface font-body-md text-body-md pl-10 py-2.5 rounded-lg focus:outline-none focus:bg-surface-bright focus:shadow-md transition-all placeholder:text-outline'

  return (
    <div className="portal-theme min-h-screen xl:h-screen xl:min-h-0 xl:overflow-hidden flex items-center justify-center py-6 md:py-10 xl:py-4 px-4 md:px-8">
      <div className="w-full max-w-7xl mx-auto rounded-xl overflow-hidden shadow-xl bg-surface-container-lowest flex flex-col xl:flex-row xl:h-full xl:max-h-[880px] relative">
        {/* LEFT: forest green brand panel */}
        <div className="hidden xl:flex xl:w-1/2 w-full bg-primary-container text-surface-bright p-space-lg md:p-space-xl lg:p-space-lg flex-col justify-between relative overflow-hidden gap-space-lg lg:gap-space-sm">
          <div className="absolute inset-0 pointer-events-none opacity-10 flex items-center justify-center">
            <svg className="w-[680px] h-[680px] max-w-none text-surface-bright stroke-current fill-none" viewBox="0 0 400 400">
              <circle cx="200" cy="200" r="180" strokeDasharray="6,6" strokeWidth="1.5" />
              <circle cx="200" cy="200" r="140" strokeWidth="1" />
              <circle cx="200" cy="200" r="100" strokeWidth="1.5" />
              <circle cx="200" cy="200" r="60" strokeWidth="1" />
              <path d="M 200,20 Q 220,100 200,200 Q 180,100 200,20 Z" strokeWidth="1" />
              <path d="M 200,380 Q 220,300 200,200 Q 180,300 200,380 Z" strokeWidth="1" />
              <path d="M 20,200 Q 100,220 200,200 Q 100,180 20,200 Z" strokeWidth="1" />
              <path d="M 380,200 Q 300,220 200,200 Q 300,180 380,200 Z" strokeWidth="1" />
              <path d="M 72,72 Q 130,130 200,200 Q 130,130 72,72 Z" strokeWidth="1" />
              <path d="M 328,328 Q 270,270 200,200 Q 270,270 328,328 Z" strokeWidth="1" />
              <path d="M 72,328 Q 130,270 200,200 Q 130,270 72,328 Z" strokeWidth="1" />
              <path d="M 328,72 Q 270,130 200,200 Q 270,130 328,72 Z" strokeWidth="1" />
            </svg>
          </div>

          <div className="relative z-10 flex flex-col gap-space-xs">
            <div className="flex items-center justify-between gap-3">
            <Link to="/" className="flex items-center gap-space-sm w-fit">
              <Logo className="w-12 h-12" />
              <div>
                <span className="font-headline-sm text-headline-sm text-surface-bright tracking-tight block">Messify</span>
                <span className="font-label-xs text-label-xs text-on-primary-container tracking-widest uppercase">Fresh mess food, one tap away</span>
              </div>
            </Link>
            <HomeButton />
            </div>
            <div className="mt-space-md lg:mt-space-sm">
              <span className="font-script-accent text-script-accent text-secondary-container italic block mb-space-xs">Fresh Daily, Cooked with Love</span>
              <h1 className="font-headline-lg text-headline-lg md:text-[40px] md:leading-[48px] lg:text-[34px] lg:leading-[40px] text-surface-bright max-w-md">Home-style meals, delivered fresh daily.</h1>
              <p className="font-body-md text-body-md text-on-primary-container mt-space-xs max-w-sm">
                Nourishing hostel students and professionals with wholesome thalis, genuine ghee aromas, and comforting home flavours.
              </p>
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-center py-space-md lg:py-0 lg:flex-1 lg:min-h-0">
            <div className="relative w-56 h-56 md:w-64 md:h-64 lg:w-[clamp(9rem,30vh,17rem)] lg:h-[clamp(9rem,30vh,17rem)]">
              <div className="w-full h-full rounded-full overflow-hidden shadow-2xl p-2 bg-gradient-to-tr from-tertiary-fixed-dim/20 to-surface-bright/10 flex items-center justify-center">
                <img className="w-full h-full object-cover rounded-full" alt="Traditional Gujarati thali with phulkas, dal, paneer curry, rice and sweets" src={HERO_IMAGE} />
              </div>
              <div className="absolute -top-2 -left-2 md:-left-4 bg-surface-bright text-primary px-space-md py-space-xs rounded-full shadow-lg flex items-center gap-space-xs transition-transform hover:scale-105">
                <span className="w-2.5 h-2.5 rounded-full bg-secondary-container" />
                <span className="font-label-xs text-label-xs tracking-wide whitespace-nowrap">Pure Groundnut Oil</span>
              </div>
              <div className="absolute -bottom-2 -right-2 md:-right-4 bg-surface-bright text-primary px-space-md py-space-xs rounded-full shadow-lg flex items-center gap-space-xs transition-transform hover:scale-105">
                <Icon name="local_fire_department" className="text-sm text-secondary" />
                <span className="font-label-xs text-label-xs tracking-wide whitespace-nowrap">Unlimited Hot Phulkas</span>
              </div>
            </div>
          </div>

          <div className="relative z-10">
            <div className="grid grid-cols-3 gap-space-xs text-center py-space-sm bg-primary/40 rounded-lg">
              {TRUST.map((t) => (
                <div key={t.title} className="flex flex-col items-center px-1">
                  <div className="flex items-center gap-1 text-tertiary-fixed-dim">
                    {t.icon ? <Icon name={t.icon} className="text-xs" /> : <span className="w-2 h-2 rounded-full bg-primary-fixed" />}
                    <span className="font-label-xs text-label-xs text-surface-bright">{t.title}</span>
                  </div>
                  <span className="font-body-sm text-body-sm text-on-primary-container">{t.sub}</span>
                </div>
              ))}
            </div>
            <div className="mt-space-sm flex flex-wrap items-center justify-between gap-2 text-body-sm text-on-primary-container">
              <span className="flex items-center gap-space-xs">
                <Icon name="support_agent" className="text-sm text-tertiary-fixed-dim" />
                Student Helpline: <strong className="text-surface-bright font-label-md text-label-md">+91 82386 92705</strong>
              </span>
              <span className="font-label-xs text-label-xs text-tertiary-fixed-dim bg-tertiary-container/60 px-2 py-0.5 rounded">7 AM - 11 PM</span>
            </div>
          </div>
        </div>

        {/* RIGHT: login card */}
        <div className="w-full xl:w-1/2 bg-surface-container-low p-space-md sm:p-space-lg lg:p-space-md flex flex-col justify-center items-center relative xl:overflow-y-auto">
          <div className="w-full max-w-md mb-space-md lg:mb-space-sm flex justify-between items-center bg-surface-container rounded-full p-1 shadow-sm" role="tablist" aria-label="Choose portal">
            {PORTALS.map((p) => (
              <button
                key={p.role}
                type="button"
                role="tab"
                aria-selected={portal.role === p.role}
                onClick={() => selectPortal(p)}
                className={`flex-1 py-1.5 px-3 rounded-full font-label-xs text-label-xs text-center transition-all ${
                  portal.role === p.role ? 'bg-surface-container-lowest text-primary shadow-sm font-bold' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="w-full max-w-md bg-surface-container-lowest rounded-xl p-space-lg sm:p-space-xl lg:p-space-lg shadow-xl flex flex-col relative overflow-hidden">
            <div className="mb-space-lg lg:mb-space-sm">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight">Welcome back</h2>
                <span className="inline-flex items-center gap-1 font-label-xs text-label-xs bg-surface-container-high px-2 py-1 rounded text-primary font-bold whitespace-nowrap">
                  <Icon name="local_dining" className="text-xs" />
                  Today's Tiffin
                </span>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">Log in to check today's menu and your active tiffin status.</p>
            </div>

            {error.title && (
              <div className="mb-space-md bg-error-container text-on-error-container p-space-sm rounded-lg flex items-start gap-space-sm" role="alert">
                <Icon name="error" className="text-error text-lg mt-0.5" />
                <div className="flex-1">
                  <p className="font-label-md text-label-md text-error leading-snug">{error.title}</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{error.text}</p>
                </div>
                <button type="button" className="text-on-surface-variant hover:text-on-surface" onClick={clearError} aria-label="Dismiss">
                  <Icon name="close" className="text-sm" />
                </button>
              </div>
            )}
            {info && (
              <div className="mb-space-md bg-primary-fixed text-primary p-space-sm rounded-lg flex items-start gap-space-sm" role="status">
                <Icon name="mark_email_read" className="text-lg mt-0.5" />
                <p className="font-body-sm text-body-sm flex-1">{info}</p>
              </div>
            )}

            <form className="flex flex-col gap-space-md lg:gap-space-sm" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-1">
                <label className="font-label-md text-label-md text-on-surface flex items-center justify-between" htmlFor="email">
                  <span>Email</span>
                  <span className="font-label-xs text-label-xs text-secondary font-semibold">{portal.badge}</span>
                </label>
                <div className="relative flex items-center">
                  <Icon name="mail" className="absolute left-3 text-outline text-lg pointer-events-none" />
                  <input id="email" name="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder={portal.placeholder} className={`${inputCls} pr-4`} />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <label className="font-label-md text-label-md text-on-surface" htmlFor="password">Password</label>
                  <button type="button" onClick={handleForgot} className="font-label-md text-label-md text-secondary hover:text-secondary-container transition-colors">Forgot password?</button>
                </div>
                <div className="relative flex items-center">
                  <Icon name="lock" className="absolute left-3 text-outline text-lg pointer-events-none" />
                  <input id="password" name="password" required autoComplete="current-password" type={showPassword ? 'text' : 'password'} value={password}
                    onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className={`${inputCls} pr-10`} />
                  <button type="button" aria-label="Toggle password visibility" onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 text-outline hover:text-on-surface flex items-center focus:outline-none">
                    <Icon name={showPassword ? 'visibility_off' : 'visibility'} className="text-lg" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between py-1">
                <label className="flex items-center gap-space-xs cursor-pointer">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="w-4 h-4 rounded accent-primary cursor-pointer" />
                  <span className="font-body-sm text-body-sm text-on-surface-variant select-none">Remember this device</span>
                </label>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-3 lg:py-2.5 px-space-md rounded-full bg-primary-container text-surface-bright font-label-lg text-label-lg flex items-center justify-center gap-space-sm hover:bg-secondary transition-all shadow-md active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed">
                <span>{loading ? 'Checking Mess Ledger...' : 'Log In'}</span>
                {loading ? <Icon name="progress_activity" className="text-lg animate-spin" /> : <Icon name="arrow_forward" className="text-lg" />}
              </button>
            </form>

            {import.meta.env.DEV && demoLogins.length > 0 && (
              <div className="mt-space-lg lg:mt-space-sm p-space-sm rounded-lg bg-surface-container border border-dashed border-outline-variant">
                <p className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider mb-2">Demo accounts (dev only) — run <code>npm run seed</code> first</p>
                <div className="flex flex-wrap gap-2">
                  {demoLogins.filter((a) => a.role !== 'admin').map((a) => (
                    <button key={a.key} type="button"
                      onClick={() => { setPortal(PORTALS.find((p) => p.role === a.role)); setEmail(a.email); setPassword(a.password); clearError() }}
                      className="px-3 py-1.5 rounded-full bg-surface-container-lowest text-primary font-label-md text-label-md shadow-sm hover:bg-primary-container hover:text-surface-bright transition-colors capitalize">
                      {a.role === 'mess' ? 'Mess owner' : a.role}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-space-lg lg:mt-space-sm text-center font-body-md text-body-md text-on-surface-variant">
              <span>Need a new account? </span>
              <Link to="/signup" state={routerLocation.state} className="font-label-md text-label-md text-secondary hover:underline transition-colors font-bold">Sign up</Link>
            </div>
          </div>

          <div className="mt-space-md lg:mt-space-xs text-center max-w-sm">
            <p className="font-label-xs text-label-xs text-outline">Breakfast orders lock at 7:30 AM • Lunch orders lock at 11:30 AM • Dinner at 7:00 PM</p>
            <Link to="/admin/login" className="inline-block mt-2 font-label-xs text-label-xs text-on-surface-variant hover:text-primary underline">Admin access</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
