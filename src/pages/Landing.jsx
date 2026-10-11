import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  SUPPORT_PHONE, SUPPORT_PHONE_HREF, HQ_ADDRESS, DIET_TYPES, HERO_IMAGE,
  TRUST_ITEMS, PLANS, STEPS, COUPONS, OWNER_FEATURES, FAQS,
  FOOTER_LINKS, QUALITY_PROMISES,
} from '../data/landingContent.js'
import { BUSINESS } from '../constants.js'
import { useBrowserLocation } from '../utils/location.js'
import LocationPill from '../components/common/LocationPill.jsx'
import Logo from '../components/common/Logo.jsx'
import { usePublicMesses } from '../utils/usePublicMesses.js'
import { formatINR } from '../constants.js'

/* ---------- small inline icons ---------- */
const Svg = ({ className, children, fill = 'none', stroke = 'currentColor', viewBox = '0 0 24 24', strokeWidth = 2 }) => (
  <svg className={className} fill={fill} stroke={fill === 'none' ? stroke : undefined} viewBox={viewBox}
    strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}>{children}</svg>
)
const ArrowIcon = ({ className }) => <Svg className={className}><path d="M14 5l7 7m0 0l-7 7m7-7H3" /></Svg>
const SearchIcon = ({ className }) => <Svg className={className}><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></Svg>
const PinIcon = ({ className }) => (
  <Svg className={className}>
    <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </Svg>
)
const BuildingIcon = ({ className }) => (
  <Svg className={className}><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></Svg>
)
const PhoneIcon = ({ className }) => (
  <Svg className={className} fill="currentColor"><path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" /></Svg>
)
const CircleCheckIcon = ({ className }) => <Svg className={className} strokeWidth={2.5}><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></Svg>
const CheckIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path clipRule="evenodd" fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
  </svg>
)
const HomeIcon = ({ className }) => <Svg className={className}><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></Svg>
const TicketIcon = ({ className }) => <Svg className={className}><path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></Svg>
const CoinIcon = ({ className }) => <Svg className={className}><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></Svg>

const CONTAINER = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'

/* ---------- sections ---------- */
function AnnouncementBar({ onClose }) {
  return (
    <div className="bg-brand-gold text-brand-forestDark px-4 py-2 text-xs sm:text-sm font-semibold flex items-center justify-between border-b border-brand-gold/40 relative">
      <div className="flex-1 text-center">
        <span>🎟 Special Pass: ₹50 OFF on your first tiffin plan.</span>
        <a href="#coupon-banner" className="ml-1.5 underline font-bold hover:text-black transition-colors">Claim now →</a>
      </div>
      <button type="button" onClick={onClose} aria-label="Close announcement" className="text-brand-forestDark hover:text-black font-bold text-base px-2 leading-none transition-colors">✕</button>
    </div>
  )
}

function Header({ location, status, onDetect }) {
  const [showBar, setShowBar] = useState(true)
  return (
    <header className="sticky top-0 z-50 w-full shadow-lg">
      {showBar && <AnnouncementBar onClose={() => setShowBar(false)} />}
      <nav className="bg-brand-forest text-white border-b border-brand-gold/30 py-3.5">
        <div className={`${CONTAINER} flex items-center justify-between`}>
          <a className="flex items-center space-x-3 group" href="#top">
            <Logo className="w-12 h-12 shadow-md" />
            <div className="flex flex-col">
              <span className="text-2xl font-extrabold tracking-wider text-brand-gold uppercase font-heading leading-tight">MESSIFY</span>
              <span className="text-[9px] tracking-widest text-amber-200/90 font-medium uppercase">Fresh mess food, one tap away</span>
            </div>
          </a>

          <div className="flex items-center space-x-3 sm:space-x-5">
            <LocationPill location={location} status={status} onDetect={onDetect} />
            <Link to="/login" className="text-sm font-semibold text-amber-100 hover:text-white transition-colors px-2 py-1">Login</Link>
            <Link to="/student/browse" className="bg-brand-saffron hover:bg-brand-saffronHover text-white px-5 py-2.5 rounded-full font-bold text-sm shadow-md transition-all transform hover:-translate-y-0.5 inline-flex items-center">
              Find My Mess
            </Link>
          </div>
        </div>
      </nav>
    </header>
  )
}

function Hero({ detected }) {
  const [locality, setLocality] = useState(BUSINESS.addressLine2)
  useEffect(() => { if (detected?.full) setLocality(detected.full.split(',').slice(0, 3).join(',').trim()) }, [detected])
  const [diet, setDiet] = useState(DIET_TYPES[0])
  return (
    <section className="relative pt-8 pb-16 lg:pt-14 lg:pb-20 overflow-hidden">
      <div className={CONTAINER}>
        <div className="text-center mb-4">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-saffron/15 text-brand-saffron font-script text-2xl font-bold tracking-wide">
            ✨ Super Delicious Indian Meals Fresh Daily
          </span>
        </div>

        <div className="text-center max-w-4xl mx-auto mb-8">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-brand-forest font-heading leading-tight sm:leading-tight">
            Delicious Indian Meals <br className="hidden sm:inline" />
            <span className="text-brand-forest underline decoration-brand-gold decoration-wavy decoration-2">Delivered Fresh Daily</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-brand-charcoal/80 max-w-2xl mx-auto leading-relaxed">
            Subscribe to verified, hygienic local messes. Pay seamlessly via UPI.
            Enjoy pure Gujarati &amp; North Indian food with unlimited refills and zero palm oil.
          </p>
          <div className="mt-6 flex flex-wrap justify-center items-center gap-4">
            <Link to="/student/browse" className="px-7 py-3.5 rounded-full bg-brand-saffron hover:bg-brand-saffronHover text-white font-bold text-base shadow-lg shadow-orange-700/20 transition-all transform hover:-translate-y-0.5 flex items-center gap-2">
              <span>Find a Mess Near Me</span>
              <ArrowIcon className="w-5 h-5" />
            </Link>
            <a href="#for-owners" className="px-7 py-3.5 rounded-full border-2 border-brand-forest text-brand-forest hover:bg-brand-forest hover:text-white font-bold text-base transition-colors">
              Become a Mess Partner
            </a>
          </div>
        </div>

        {/* Search & locality filter */}
        <form onSubmit={(e) => e.preventDefault()} className="max-w-4xl mx-auto bg-white/90 backdrop-blur-sm p-4 sm:p-5 rounded-2xl shadow-xl border-2 border-brand-gold/40 mb-12">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            <div className="sm:col-span-5 relative">
              <label className="block text-xs font-bold text-brand-forest uppercase tracking-wider mb-1">Locality / College Campus</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-brand-forest/60"><BuildingIcon className="w-4 h-4" /></span>
                <input type="text" value={locality} onChange={(e) => setLocality(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-brand-forest focus:ring-1 focus:ring-brand-forest focus:outline-none font-medium text-brand-charcoal" />
              </div>
            </div>
            <div className="sm:col-span-4">
              <label className="block text-xs font-bold text-brand-forest uppercase tracking-wider mb-1">Cuisine / Diet Type</label>
              <select aria-label="Cuisine or Diet Preference" value={diet} onChange={(e) => setDiet(e.target.value)}
                className="w-full py-2 px-3 text-sm rounded-lg border border-gray-300 focus:border-brand-forest focus:ring-1 focus:ring-brand-forest focus:outline-none font-medium text-brand-charcoal bg-white">
                {DIET_TYPES.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="sm:col-span-3 sm:mt-5">
              <a href="#messes" className="w-full py-2.5 px-4 bg-brand-forest hover:bg-brand-forestDark text-brand-gold font-bold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 shadow">
                <SearchIcon className="w-4 h-4" />
                <span>Explore Menus</span>
              </a>
            </div>
          </div>
        </form>

        {/* Thali banner — /meal-image.png already has the callouts baked in. The wrapper crops the
            bottom strip (cut-off address text); the empty orange pill in the artwork is covered by a
            real call button. Overlay percentages are relative to the cropped wrapper. */}
        <div className="relative max-w-5xl mx-auto mt-6">
          <div className="relative mx-auto w-full rounded-3xl overflow-hidden shadow-2xl border-4 border-brand-gold/60 bg-brand-cream aspect-[2820/1435]">
            <img alt="Gujarati unlimited thali with rotli, shaak, dal, rice, farsan and sweets — no palm oil, pure vegetarian, unlimited refills"
              className="absolute inset-x-0 -top-[0.5%] w-full h-auto" width="2820" height="1472" src={HERO_IMAGE} fetchpriority="high" />
            <a href={SUPPORT_PHONE_HREF} aria-label={`Call ${SUPPORT_PHONE}`}
              className="absolute flex items-center gap-[3%] pl-[2.5%] rounded-full bg-brand-saffron hover:bg-brand-saffronHover text-white font-bold whitespace-nowrap shadow-md transition-colors text-[clamp(6px,1.3vw,15px)]"
              style={{ left: '66.5%', top: '91.2%', width: '27.5%', height: '9.2%' }}>
              <PhoneIcon className="w-[1.3em] h-[1.3em] shrink-0" />
              <span>{SUPPORT_PHONE}</span>
            </a>
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-brand-forest/90 backdrop-blur-md px-6 py-2 rounded-full border border-brand-gold text-white text-xs sm:text-sm font-semibold shadow-lg flex items-center gap-2 whitespace-nowrap">
              <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-ping" />
              <span>Serving Hot &amp; Fresh in Nagpur Today</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4 md:hidden text-center text-xs font-semibold">
            <div className="bg-white/70 p-2 rounded-lg border border-brand-gold/30">🌿 100% Groundnut Oil</div>
            <div className="bg-white/70 p-2 rounded-lg border border-brand-gold/30">✨ Unlimited Rotli Refills</div>
          </div>
        </div>
      </div>
    </section>
  )
}

function TrustBar({ live }) {
  return (
    <section className="bg-brand-forest text-white py-6 border-y-2 border-brand-gold shadow-md">
      <div className={CONTAINER}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center items-center divide-y md:divide-y-0 md:divide-x divide-brand-gold/30">
          {TRUST_ITEMS.map((t) => (t.kind === 'big' ? { ...t, title: live.loading ? '…' : `${live.messes.length} ${live.messes.length === 1 ? 'Mess' : 'Messes'}`, sub: 'Listed on Messify Live' } : t)).map((t) => (
            <div key={t.title} className="pt-2 md:pt-0 flex flex-col items-center">
              {t.kind === 'phone' && (
                <div className="flex items-center gap-2 text-brand-gold font-bold text-lg sm:text-xl">
                  <PhoneIcon className="w-6 h-6 text-brand-saffron" /><span>{t.title}</span>
                </div>
              )}
              {t.kind === 'big' && <div className="text-2xl sm:text-3xl font-extrabold text-brand-gold font-heading">{t.title}</div>}
              {t.kind === 'check' && (
                <div className="flex items-center gap-1.5 text-green-300 font-bold text-lg sm:text-xl">
                  <CircleCheckIcon className="w-6 h-6 text-green-400" /><span>{t.title}</span>
                </div>
              )}
              {t.kind === 'plain' && <div className="text-xl sm:text-2xl font-bold text-amber-100 font-heading">{t.title}</div>}
              <span className="text-xs text-amber-100/80 mt-1 uppercase tracking-wider">{t.sub}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function SectionHeading({ script, title, sub, className = 'text-center max-w-3xl mx-auto mb-12', h2 = 'text-3xl sm:text-4xl' }) {
  return (
    <div className={className}>
      {script && <span className="text-brand-saffron font-script text-2xl font-bold">{script}</span>}
      <h2 className={`${h2} font-extrabold text-brand-forest font-heading`}>{title}</h2>
      {sub && <p className="text-sm text-gray-600 mt-2">{sub}</p>}
    </div>
  )
}

function MessMenus({ live }) {
  const [meal, setMeal] = useState('lunch')
  const tab = (id) => `px-5 py-2 rounded-lg font-semibold text-xs uppercase tracking-wider transition-colors ${meal === id ? 'bg-brand-forest text-brand-gold font-bold shadow' : 'text-brand-forest hover:bg-white/60'}`
  return (
    <section id="messes" className={`py-16 scroll-mt-28 ${CONTAINER}`}>
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 pb-4 border-b border-brand-forest/20">
        <div>
          <span className="text-brand-saffron font-script text-2xl font-bold">Live from our partner kitchens</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-brand-forest font-heading">Today's Fresh Mess Menus</h2>
        </div>
        <div className="mt-4 md:mt-0 inline-flex p-1 bg-brand-forest/10 rounded-xl border border-brand-forest/20">
          <button type="button" className={tab('lunch')} onClick={() => setMeal('lunch')}>☀️ Lunch Thali (12 PM - 3 PM)</button>
          <button type="button" className={tab('dinner')} onClick={() => setMeal('dinner')}>🌙 Dinner Thali (7:30 PM - 10:30 PM)</button>
        </div>
      </div>

      {live.loading && <p className="text-center text-sm text-gray-500 py-10">Loading live menus…</p>}
      {!live.loading && live.messes.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-brand-gold/60">
          <p className="font-heading text-xl text-brand-forest font-bold">No messes have joined yet</p>
          <p className="text-sm text-gray-600 mt-1">Run a kitchen? Be the first to list it and reach students nearby.</p>
          <Link to="/signup?role=mess" className="inline-block mt-4 px-6 py-2.5 rounded-full bg-brand-saffron text-white font-bold text-xs uppercase tracking-wider">Register My Mess</Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {live.messes.map((m, i) => {
          const slot = m.todayMenu?.[meal]
          return (
            <div key={m.id} className={`bg-white rounded-2xl overflow-hidden ${i === 0 ? 'border-2 border-brand-gold/60' : 'border border-brand-gold/40'} shadow-lg hover:shadow-2xl transition-all group flex flex-col`}>
              <div className={`${i % 2 ? 'bg-brand-forestDark' : 'bg-brand-forest'} p-4 text-white relative`}>
                <span className="absolute top-3 right-3 bg-brand-gold text-brand-forestDark text-[11px] font-extrabold px-2.5 py-0.5 rounded-full">★ {m.rating ? Number(m.rating).toFixed(1) : 'New'}</span>
                <h3 className="text-xl font-bold font-heading text-amber-200 pr-16">{m.messName}</h3>
                <p className="text-xs text-amber-100/80 mt-0.5">{m.area || 'Nagpur'}</p>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded ${slot?.items ? 'text-green-700 bg-green-100' : 'text-gray-500 bg-gray-100'}`}>{slot?.items ? 'Menu live' : 'Menu pending'}</span>
                    {slot?.price > 0 && <span className="text-lg font-extrabold text-brand-forest">{formatINR(slot.price)} <span className="text-xs font-normal text-gray-500">/ meal</span></span>}
                  </div>
                  <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                    <strong>Today's {meal}:</strong> {slot?.items || 'The mess has not posted this meal yet.'}
                  </p>
                </div>
                <Link to={`/student/mess/${m.id}`} className="w-full text-center py-2.5 rounded-xl bg-brand-forest hover:bg-brand-forestDark text-brand-gold font-bold text-xs uppercase tracking-wider transition-colors shadow">
                  Book {meal === 'lunch' ? 'Lunch' : 'Dinner'} / Subscribe Pass
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function Plans() {
  return (
    <section id="plans" className="py-16 bg-brand-creamLight border-y border-brand-gold/40 scroll-mt-28">
      <div className={CONTAINER}>
        <SectionHeading className="text-center max-w-3xl mx-auto mb-14" script="Unbeatable Student & Executive Pricing" title="Transparent Monthly Meal Passes"
          sub="Pause anytime. Zero cancellation penalty. Unused meal credits automatically rollover to next month or refund to UPI." />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {PLANS.map((p) => {
            const f = p.featured
            return (
              <div key={p.id} className={`ticket-card rounded-3xl p-7 shadow-lg flex flex-col justify-between relative ${f ? 'bg-brand-forest text-white border-2 border-brand-gold shadow-2xl transform -translate-y-2' : 'bg-white border-2 border-dashed border-brand-forest/40'}`}>
                {f ? (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-brand-gold text-brand-forestDark text-xs font-extrabold uppercase px-4 py-1 rounded-full shadow border-2 border-amber-200 whitespace-nowrap">{p.badge}</div>
                ) : (
                  <div className="absolute -top-3 left-8 bg-white px-2 text-brand-forest text-xs font-mono font-bold">{p.badge}</div>
                )}
                <div>
                  <div className={`flex justify-between items-start ${f ? 'mt-2' : ''}`}>
                    <div>
                      <h3 className={`font-bold font-heading ${f ? 'text-2xl text-amber-200' : 'text-xl text-brand-forest'}`}>{p.title}</h3>
                      <p className={`text-xs mt-1 ${f ? 'text-amber-100/80' : 'text-gray-500'}`}>{p.desc}</p>
                    </div>
                    {p.ribbon && <span className="bg-brand-chili text-white text-[10px] uppercase font-extrabold px-2 py-0.5 rounded">{p.ribbon}</span>}
                  </div>
                  <div className="my-6">
                    <div className="flex items-baseline gap-2">
                      <span className={`font-extrabold ${f ? 'text-4xl text-brand-gold font-heading' : 'text-3xl text-brand-forest'}`}>{p.price}</span>
                      <span className={`text-base line-through font-bold ${f ? 'text-red-300' : 'text-brand-chili'}`}>{p.oldPrice}</span>
                    </div>
                    <span className={`text-xs font-semibold ${f ? 'text-amber-200' : 'text-green-700'}`}>{p.saving}</span>
                  </div>
                  <ul className={`space-y-3 text-xs pt-5 border-t ${f ? 'text-amber-50 border-brand-gold/30' : 'text-gray-700 border-gray-100'}`}>
                    {p.features.map((t) => (
                      <li key={t} className="flex items-center gap-2">
                        <CheckIcon className={`w-4 h-4 flex-shrink-0 ${f ? 'text-brand-gold' : 'text-brand-forest'}`} />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={`mt-8 pt-4 border-t border-dashed ${f ? 'border-brand-gold/40' : 'border-gray-200'}`}>
                  <Link to="/student/browse" className={`block text-center w-full rounded-full font-bold uppercase tracking-wider transition-colors ${f ? 'py-3.5 bg-brand-saffron hover:bg-brand-saffronHover text-white font-extrabold text-sm shadow-lg' : 'py-3 bg-brand-forest hover:bg-brand-forestDark text-white text-xs'}`}>
                    {p.cta}
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  return (
    <section id="how-it-works" className={`py-16 scroll-mt-28 ${CONTAINER}`}>
      <SectionHeading script="Fast & Simple" title="How Messify Works in 4 Steps" sub="From finding the best local bhojanalay to enjoying steaming rotlis every day." />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
        {STEPS.map((s) => (
          <div key={s.n} className="bg-white p-6 rounded-2xl border border-brand-gold/40 shadow text-center relative flex flex-col items-center">
            <div className={`w-14 h-14 rounded-2xl ${s.color} flex items-center justify-center font-bold text-xl mb-4 shadow`}>{s.n}</div>
            <h3 className="font-bold text-lg text-brand-forest mb-2">{s.title}</h3>
            <p className="text-xs text-gray-600 leading-relaxed">{s.text}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function CouponBanner() {
  return (
    <section id="coupon-banner" className="py-10 max-w-6xl mx-auto px-4 sm:px-6 scroll-mt-28">
      <div className="flex items-center justify-between text-brand-chili font-mono text-xs font-bold mb-2 px-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">✂️</span>
          <span className="tracking-widest uppercase">Cut along dashed line for special in-store mess discount</span>
        </div>
        <span className="hidden sm:inline">{BUSINESS.addressLine2}</span>
      </div>
      <div className="relative bg-brand-forest rounded-3xl p-4 sm:p-7 border-4 border-brand-gold shadow-2xl overflow-hidden">
        <div className="bg-brand-cream rounded-2xl border-2 border-brand-gold/80 p-5 sm:p-8 flex flex-col lg:flex-row items-center justify-between gap-6 relative">
          <div className="w-full lg:w-3/4">
            <div className="text-center sm:text-left mb-2">
              <span className="font-script text-brand-saffron text-2xl font-bold tracking-wide">— ENJOY —</span>
              <h3 className="text-2xl sm:text-4xl font-extrabold text-brand-forest font-heading tracking-wide">FULL UNLIMITED DISH</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-4 border-t-2 border-dashed border-brand-forest/20">
              {COUPONS.map((c) => (
                <div key={c.amount} className="bg-white/80 p-4 rounded-xl border border-brand-gold/50 shadow-sm">
                  <span className="bg-brand-forest text-brand-gold text-[10px] font-extrabold uppercase px-2 py-0.5 rounded tracking-wider">EXCLUSIVE</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-3xl font-extrabold text-brand-forest">{c.amount}</span>
                    <span className="text-xs uppercase font-extrabold text-brand-charcoal">Flat OFF</span>
                  </div>
                  <div className="mt-2 text-sm font-bold flex items-center gap-2">
                    <span className="text-brand-chili line-through text-lg">{c.was}</span>
                    <span className="text-brand-forest text-xl">{c.now}</span>
                    <span className="text-xs text-gray-500 font-normal">{c.note}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-4 italic">* Valid on dine-in and parcel packing. Offer valid for students &amp; corporate employees with ID.</p>
          </div>
          <div className="hidden lg:block w-[2px] self-stretch border-r-2 border-dashed border-brand-forest/30" />
          <div className="w-full lg:w-1/4 bg-brand-forest text-white rounded-xl p-5 border-2 border-brand-gold text-center flex flex-col justify-between items-center shadow-inner">
            <div className="w-full">
              <span className="text-[10px] uppercase tracking-widest text-brand-gold font-bold">Use Coupon Code</span>
              <div className="bg-white text-brand-forest text-lg font-mono font-extrabold py-2 px-3 rounded-lg border border-brand-gold my-2 tracking-wider">MESSIFY100</div>
              <div className="text-[11px] text-amber-200 font-medium">
                Valid: 01/07/'26 to 31/07/'26 <br />
                <span className="text-[10px] text-white/80">Valid for One-Time Use Per Offer</span>
              </div>
            </div>
            <Link to="/student/browse" className="mt-4 w-full py-2 bg-brand-saffron hover:bg-brand-saffronHover text-white text-xs font-bold uppercase rounded-lg tracking-wider transition-colors shadow">
              Claim Offer Now
            </Link>
          </div>
        </div>
        <div className="mt-4 text-center text-xs text-amber-100/90 flex flex-wrap justify-center items-center gap-2 sm:gap-6 font-medium">
          <span>📍 {HQ_ADDRESS}</span>
          <span>📞 {SUPPORT_PHONE}</span>
        </div>
      </div>
    </section>
  )
}

function ForOwners({ live }) {
  return (
    <section id="for-owners" className="py-16 bg-brand-forest text-white border-t-2 border-brand-gold scroll-mt-28">
      <div className={CONTAINER}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <span className="text-brand-gold font-script text-2xl font-bold">Grow Your Mess Business</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-white mt-1 mb-4 leading-tight">Digitize Your Kitchen &amp; Fill Your Tables Every Day</h2>
            <p className="text-sm sm:text-base text-amber-100/80 mb-6 leading-relaxed">
              Stop worrying about empty mess seats, manual pass booklets, and delayed fee collections.
              Messify connects your kitchen directly with college students and working professionals in Nagpur.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 text-xs sm:text-sm">
              {OWNER_FEATURES.map((f) => (
                <div key={f.title} className="flex items-start gap-3 bg-brand-forestDark p-3.5 rounded-xl border border-brand-gold/30">
                  <span className="text-brand-gold text-lg">{f.icon}</span>
                  <div>
                    <strong className="text-white block font-semibold">{f.title}</strong>
                    <span className="text-amber-100/70 text-xs">{f.text}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-4">
              <Link to="/signup?role=mess" className="px-7 py-3 rounded-full bg-brand-gold hover:bg-brand-goldLight text-brand-forestDark font-extrabold text-sm uppercase tracking-wider transition-all shadow-md">
                Register My Mess (Takes 10 Mins)
              </Link>
              <a href={SUPPORT_PHONE_HREF} className="px-6 py-3 rounded-full border border-brand-gold/60 text-amber-200 hover:bg-brand-forestDark font-bold text-sm transition-colors flex items-center gap-2">
                <span>Talk to Partner Manager: {SUPPORT_PHONE}</span>
              </a>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="bg-brand-forestDark p-6 rounded-3xl border-2 border-brand-gold/60 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-brand-gold/20 mb-4">
                <div>
                  <span className="text-[10px] text-amber-200 font-bold uppercase tracking-widest">Messify Network</span>
                  <h4 className="text-lg font-bold text-white">Live Partner Kitchens</h4>
                </div>
                <span className="bg-green-500/20 text-green-300 text-xs px-2.5 py-1 rounded-full font-bold whitespace-nowrap">🟢 Live Now</span>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-brand-forest p-3.5 rounded-xl border border-brand-gold/20">
                  <span className="text-[11px] text-amber-200/80">Messes Listed</span>
                  <p className="text-2xl font-bold text-brand-gold mt-1">{live.loading ? '…' : live.messes.length}</p>
                </div>
                <div className="bg-brand-forest p-3.5 rounded-xl border border-brand-gold/20">
                  <span className="text-[11px] text-amber-200/80">Menus Posted Today</span>
                  <p className="text-2xl font-bold text-white mt-1">{live.loading ? '…' : `${live.withMenu} / ${live.messes.length}`}</p>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <span className="text-[11px] text-amber-200/70 font-semibold block uppercase tracking-wider">Recently Joined Kitchens</span>
                {!live.loading && live.recent.length === 0 && <p className="text-amber-100/70 p-2">No kitchens yet — yours could be the first.</p>}
                {live.recent.map((m) => (
                  <div key={m.id} className="flex justify-between items-center p-2 rounded-lg bg-brand-forest/60 border border-brand-gold/10 gap-2">
                    <span className="font-medium truncate">{m.messName}</span>
                    <span className={`font-mono text-[11px] whitespace-nowrap ${m.todayMenu ? 'text-green-400' : 'text-amber-200/70'}`}>{m.todayMenu ? 'Menu live' : 'Menu pending'}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-brand-gold/20 text-center">
                <span className="text-xs text-amber-200/80">Numbers update in real time from Messify.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Faq() {
  return (
    <section className="py-14 bg-brand-creamLight border-y border-brand-gold/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading className="text-center mb-10" h2="text-2xl sm:text-3xl" title="Frequently Asked Questions"
          sub="Everything you need to know about mess subscriptions, pauses, and safety." />
        <div className="space-y-4">
          {FAQS.map((f, i) => (
            <details key={f.q} open={i === 0} className="group bg-white p-4 sm:p-5 rounded-2xl border border-brand-gold/40 shadow-sm">
              <summary className="flex justify-between items-center gap-3 font-bold text-sm sm:text-base text-brand-forest cursor-pointer list-none">
                <span>{f.q}</span>
                <span className="transition group-open:rotate-180 text-brand-saffron">▼</span>
              </summary>
              <p className="text-xs sm:text-sm text-gray-600 mt-3 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

function Footer() {
  const h4 = 'text-sm font-bold uppercase tracking-wider text-amber-200 mb-4 font-heading'
  return (
    <footer className="bg-brand-forestDark text-white pt-14 pb-10 border-t-4 border-brand-gold">
      <div className={CONTAINER}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-10 border-b border-brand-gold/20">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <Logo className="w-11 h-11" />
              <span className="text-2xl font-extrabold text-brand-gold font-heading">Messify</span>
            </div>
            <p className="text-xs text-amber-100/70 leading-relaxed mb-4">
              Authentic, affordable, and hygienic student tiffin network across Nagpur. Bringing the warmth of mom's fresh rotli to every hostel and office.
            </p>
            <div className="flex items-center gap-2 text-xs text-brand-gold font-bold">
              <span>🌿 Pure Vegetarian</span><span>•</span><span>🥣 Groundnut Oil</span>
            </div>
          </div>
          <div>
            <h4 className={h4}>Explore Messes</h4>
            <ul className="space-y-2 text-xs text-amber-100/80">
              {FOOTER_LINKS.map((l) => <li key={l.label}><a className="hover:text-brand-gold transition-colors" href={l.href}>{l.label}</a></li>)}
            </ul>
          </div>
          <div>
            <h4 className={h4}>Flagship Location</h4>
            <p className="text-xs text-amber-100/80 leading-relaxed mb-3">
              <strong>Messify HQ:</strong><br />
              {BUSINESS.addressLine1}<br />
              {BUSINESS.addressLine2}
            </p>
            <p className="text-xs text-amber-200 font-bold">Helpline: {SUPPORT_PHONE}</p>
          </div>
          <div>
            <h4 className={h4}>Our Quality Promise</h4>
            <div className="bg-brand-forest p-4 rounded-xl border border-brand-gold/30 space-y-2 text-xs">
              {QUALITY_PROMISES.map((q) => (
                <div key={q} className="flex items-center gap-2 text-green-300"><span>✔</span><span>{q}</span></div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-amber-100/60 gap-4">
          <div>© 2026 Messify. All rights reserved. Made for students &amp; food lovers.</div>
          <div className="flex flex-wrap justify-center gap-4">
            <a className="hover:text-brand-gold" href="#">Terms of Service</a>
            <a className="hover:text-brand-gold" href="#">Privacy Policy</a>
            <a className="hover:text-brand-gold" href="#">Refund Policy</a>
            <a className="hover:text-brand-gold font-bold text-amber-200" href={SUPPORT_PHONE_HREF}>+91 82386 92705</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

function MobileBottomNav() {
  const item = 'flex flex-col items-center text-amber-100 hover:text-brand-gold'
  return (
    <div className="fixed bottom-0 inset-x-0 z-40 bg-brand-forest border-t-2 border-brand-gold md:hidden flex justify-around items-center py-2 text-white text-[11px] font-medium shadow-2xl">
      <a className="flex flex-col items-center text-brand-gold" href="#top"><HomeIcon className="w-5 h-5 mb-0.5" /><span>Home</span></a>
      <a className={item} href="#messes"><SearchIcon className="w-5 h-5 mb-0.5" /><span>Find Mess</span></a>
      <a className={`${item} relative`} href="#coupon-banner">
        <span className="absolute -top-1 right-2 bg-brand-chili text-white text-[9px] px-1 rounded-full font-bold">50 OFF</span>
        <TicketIcon className="w-5 h-5 mb-0.5" /><span>Coupons</span>
      </a>
      <a className={item} href="#plans"><CoinIcon className="w-5 h-5 mb-0.5" /><span>Passes</span></a>
    </div>
  )
}

export default function Landing() {
  const { location, status, detect } = useBrowserLocation()
  const live = usePublicMesses()
  return (
    <div id="top" className="messify-theme bg-indian-pattern min-h-screen text-brand-charcoal antialiased pb-16 md:pb-0">
      <Header location={location} status={status} onDetect={detect} />
      <Hero detected={location} />
      <TrustBar live={live} />
      <MessMenus live={live} />
      <Plans />
      <HowItWorks />
      <CouponBanner />
      <ForOwners live={live} />
      <Faq />
      <Footer />
      <MobileBottomNav />
    </div>
  )
}
