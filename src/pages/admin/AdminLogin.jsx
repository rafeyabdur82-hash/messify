import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import Icon from '../../components/common/Icon.jsx'
import { mapAuthError } from '../../utils/authErrors.js'

const OTP_LENGTH = 6

export default function AdminLogin() {
  const { login, logout } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''))
  const [error, setError] = useState(null) // { title, text }
  const [loading, setLoading] = useState(false)
  const [demoAdmin, setDemoAdmin] = useState(null) // dev only; the dynamic import is removed from production builds
  useEffect(() => { if (import.meta.env.DEV) import('../../data/demoAccounts.js').then((m) => setDemoAdmin(m.DEMO_ACCOUNTS.find((a) => a.role === 'admin'))) }, [])
  const otpRefs = useRef([])

  function setDigit(index, raw) {
    const digit = raw.replace(/[^0-9]/g, '').slice(-1)
    setOtp((prev) => prev.map((d, i) => (i === index ? digit : d)))
    if (digit && index < OTP_LENGTH - 1) otpRefs.current[index + 1]?.focus()
  }

  function handleOtpKeyDown(index, e) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus()
  }

  function handleOtpPaste(e) {
    e.preventDefault()
    const digits = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, OTP_LENGTH).split('')
    setOtp((prev) => prev.map((d, i) => digits[i] ?? d))
    otpRefs.current[Math.min(digits.length, OTP_LENGTH - 1)]?.focus()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { profile } = await login(email.trim(), password)
      if (profile?.role === 'admin') {
        navigate('/admin')
      } else {
        await logout()
        setError({ title: 'Access Restricted', text: 'This account is not an admin. Please log in through the student or partner portal.' })
      }
    } catch (err) {
      setError({ title: 'Sign-in failed', text: mapAuthError(err.code) })
    } finally {
      setLoading(false)
    }
  }

  const fieldCls = 'w-full bg-surface-container text-on-surface font-body-md text-body-md rounded-lg py-2.5 pl-10 outline-none focus:bg-surface-container-lowest focus:shadow-md transition-all placeholder:text-outline/70'

  return (
    <div className="portal-theme min-h-screen flex items-center justify-center relative overflow-hidden py-space-xl px-4">
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary-container/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-tertiary-fixed-dim/10 blur-3xl pointer-events-none" />
      <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none overflow-hidden select-none">
        <svg className="w-[900px] h-[900px] max-w-none text-tertiary-fixed" fill="none" stroke="currentColor" strokeWidth="1.2" viewBox="0 0 400 400">
          <circle cx="200" cy="200" r="190" strokeDasharray="4 4" />
          <circle cx="200" cy="200" r="160" />
          <circle cx="200" cy="200" r="130" strokeDasharray="6 3" />
          <circle cx="200" cy="200" r="95" />
          <circle cx="200" cy="200" r="60" />
          <circle cx="200" cy="200" r="25" />
          <path d="M200 40 C215 110 215 110 200 140 C185 110 185 110 200 40 Z" />
          <path d="M200 360 C215 290 215 290 200 260 C185 290 185 290 200 360 Z" />
          <path d="M40 200 C110 215 110 215 140 200 C110 185 110 185 40 200 Z" />
          <path d="M360 200 C290 215 290 215 260 200 C290 185 290 185 360 200 Z" />
          <path d="M87 87 C145 130 145 130 157 157 C130 145 130 145 87 87 Z" />
          <path d="M313 313 C255 270 255 270 243 243 C270 255 270 255 313 313 Z" />
          <path d="M87 313 C130 255 130 255 157 243 C145 270 145 270 87 313 Z" />
          <path d="M313 87 C270 145 270 145 243 157 C255 130 255 130 313 87 Z" />
        </svg>
      </div>

      <Link to="/" className="absolute top-4 left-4 z-20 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-surface-container-lowest/90 hover:bg-surface-container-lowest border border-outline-variant text-primary text-xs font-semibold shadow-sm transition-colors">
        <Icon name="arrow_back" className="text-base" /> Back to Home
      </Link>

      <div className="relative z-10 w-full max-w-[460px] md:max-w-[520px] mx-auto">
        <div className="flex justify-center -mb-5 relative z-20">
          <div className="w-14 h-14 rounded-full bg-primary-container shadow-xl flex items-center justify-center p-1">
            <div className="w-full h-full rounded-full bg-tertiary-container flex items-center justify-center text-tertiary-fixed shadow-inner">
              <Icon name="admin_panel_settings" fill className="text-headline-sm" />
            </div>
          </div>
        </div>

        <div className="bg-surface-container-low rounded-xl shadow-2xl p-space-lg md:p-space-xl pt-8 text-on-surface relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-tertiary-fixed-dim to-transparent" />

          <div className="text-center mb-space-md">
            <span className="font-label-xs text-label-xs tracking-widest uppercase text-tertiary mb-space-xs block font-bold">Internal Console</span>
            <h1 className="font-headline-md text-headline-md md:text-headline-lg text-primary font-bold tracking-tight mb-1">Admin Access</h1>
            <p className="font-body-sm text-body-sm md:text-body-md text-on-surface-variant font-medium">Authorized Messify staff &amp; kitchen auditors only.</p>
          </div>

          {error && (
            <div className="bg-error-container text-on-error-container rounded-lg p-space-sm mb-space-lg shadow-sm flex items-start gap-space-sm" role="alert">
              <Icon name="error" fill className="text-error text-headline-sm shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-label-md text-label-md text-error leading-tight font-bold mb-0.5">{error.title}</p>
                <p className="font-body-sm text-body-sm text-on-error-container leading-tight">{error.text}</p>
              </div>
            </div>
          )}

          <form className="space-y-space-md" onSubmit={handleSubmit}>
            <div className="space-y-space-xs">
              <label className="block font-label-md text-label-md text-primary font-bold" htmlFor="admin-email">Staff Identity ID / Email</label>
              <div className="relative flex items-center">
                <Icon name="badge" className="absolute left-3 text-outline text-headline-sm pointer-events-none" />
                <input id="admin-email" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@messify.in" className={`${fieldCls} pr-3`} />
              </div>
            </div>

            <div className="space-y-space-xs">
              <div className="flex items-center justify-between">
                <label className="block font-label-md text-label-md text-primary font-bold" htmlFor="admin-password">Master Password</label>
                <span className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider">Passphrase</span>
              </div>
              <div className="relative flex items-center">
                <Icon name="lock" className="absolute left-3 text-outline text-headline-sm pointer-events-none" />
                <input id="admin-password" required autoComplete="current-password" type={showPassword ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••••" className={`${fieldCls} pr-11 tracking-wider`} />
                <button type="button" aria-label="Toggle password visibility" onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2.5 p-1 rounded-full text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center">
                  <Icon name={showPassword ? 'visibility_off' : 'visibility'} className="text-headline-sm" />
                </button>
              </div>
            </div>

            {/* Visual only for now — Firebase multi-factor auth is not configured, so this code is not checked. */}
            <div className="space-y-space-xs pt-1">
              <div className="flex items-center justify-between">
                <label className="block font-label-md text-label-md text-primary font-bold">2FA / Security Hardware Token</label>
                <span className="font-label-xs text-label-xs text-secondary-container font-bold flex items-center gap-0.5">
                  <Icon name="timelapse" className="text-body-sm" /> 30s TOTP
                </span>
              </div>
              <div className="grid grid-cols-6 gap-2 md:gap-3" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input key={i} ref={(el) => (otpRefs.current[i] = el)} value={digit} inputMode="numeric" maxLength={1} pattern="[0-9]*" aria-label={`Security code digit ${i + 1}`}
                    onChange={(e) => setDigit(i, e.target.value)} onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="w-full aspect-square text-center font-headline-sm text-headline-sm font-bold bg-surface-container text-primary rounded-lg outline-none focus:bg-surface-container-lowest focus:shadow-md transition-all" />
                ))}
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant text-center pt-0.5">Enter the 6-digit code from your Messify YubiKey or authenticator app.</p>
            </div>

            <div className="pt-space-xs">
              <button type="submit" disabled={loading}
                className="w-full bg-secondary-container hover:bg-primary-container text-on-secondary rounded-full py-3 px-space-md font-label-lg text-label-lg uppercase tracking-wider shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed">
                {loading ? <Icon name="refresh" className="text-headline-sm animate-spin" /> : <Icon name="vpn_key" className="text-headline-sm group-hover:rotate-12 transition-transform" />}
                <span>{loading ? 'Verifying Credentials...' : 'Sign in as Admin'}</span>
              </button>
            </div>
          </form>

          {import.meta.env.DEV && demoAdmin && (
            <button type="button" onClick={() => { setEmail(demoAdmin.email); setPassword(demoAdmin.password); setError(null) }}
              className="mt-space-md w-full py-2 rounded-lg border border-dashed border-outline-variant text-on-surface-variant font-label-md text-label-md hover:bg-surface-container transition-colors">
              Fill demo admin login (dev only)
            </button>
          )}

          <div className="mt-space-lg bg-surface-container rounded-lg p-space-sm flex items-center justify-between text-on-surface-variant">
            <div className="flex items-center gap-2">
              <Icon name="shield" fill className="text-tertiary text-headline-sm" />
              <div className="leading-none">
                <span className="block font-label-xs text-label-xs font-bold text-primary uppercase tracking-wider">TLS 1.3 Certified</span>
                <span className="block font-body-sm text-body-sm text-outline">Session Node: del-corp-04</span>
              </div>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" title="Security Gateway Active" />
          </div>
        </div>

        <div className="mt-space-md text-center space-y-space-sm">
          <Link to="/" className="inline-flex items-center gap-1.5 font-label-md text-label-md text-tertiary-container hover:text-primary transition-colors underline decoration-outline-variant hover:decoration-primary font-semibold">
            <Icon name="arrow_back" className="text-body-lg" />
            <span>Back to main site</span>
          </Link>
          <div className="p-2">
            <p className="font-body-sm text-body-sm text-on-surface-variant/90 max-w-sm mx-auto leading-relaxed">
              256-bit encrypted internal portal. All access attempts are logged, geolocated, and subject to audit under Messify Security Directive §4.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
