import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import Icon from './Icon.jsx'
import Logo from './Logo.jsx'
import NotificationBell from './NotificationBell.jsx'

const STUDENT_NAV = [
  { to: '/student', label: 'Home', icon: 'cottage', end: true },
  { to: '/student/browse', label: 'Browse Messes', icon: 'storefront' },
  { to: '/student/subscriptions', label: 'My Subscription', icon: 'card_membership' },
  { to: '/student/billing', label: 'Billing', icon: 'receipt_long' },
]

const itemCls = 'flex items-center gap-space-sm px-space-md py-space-sm rounded-lg transition-all w-full text-left'

// Student shell from the user-page design: fixed sidebar on desktop (lg+),
// slide-out drawer with a hamburger on tablet and phone.
export default function StudentLayout({ planLabel, children, nav = STUDENT_NAV, portalName = 'Student Portal', homePath = '/student', profilePath = '/student/profile', fallbackName = 'Student', subLabel }) {
  const { profile, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => { setDrawerOpen(false) }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  const name = profile?.name || fallbackName
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
  const navClass = ({ isActive }) =>
    `${itemCls} ${isActive ? 'bg-primary text-on-tertiary-container font-semibold shadow-sm' : 'text-on-primary-container hover:bg-primary hover:text-on-primary'}`

  return (
    <div className="portal-theme min-h-screen font-body-md text-body-md">
      {drawerOpen && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setDrawerOpen(false)} aria-hidden="true" />}

      <aside
        className={`fixed left-0 top-0 h-full w-72 bg-primary-container z-50 flex flex-col justify-between py-space-md shadow-[4px_0_24px_rgba(15,77,58,0.2)] overflow-y-auto transition-transform duration-300 lg:translate-x-0 ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label={`${portalName} navigation`}
      >
        <div className="flex flex-col">
          <div className="px-space-lg pt-space-xs pb-space-md flex items-start justify-between">
            <Link to={homePath} className="flex items-center gap-space-sm">
              <Logo className="w-11 h-11" />
              <div className="flex flex-col">
                <div className="flex items-baseline gap-1">
                  <span className="font-headline-sm text-headline-sm text-on-primary font-bold">Messify</span>
                  <span className="font-script-accent text-script-accent text-on-tertiary-container italic">tiffin</span>
                </div>
                <span className="self-start px-space-xs py-0.5 rounded-full bg-primary text-on-tertiary-container font-label-xs text-label-xs uppercase tracking-widest">{portalName}</span>
              </div>
            </Link>
            <button type="button" className="lg:hidden text-on-primary-container hover:text-on-primary p-1" onClick={() => setDrawerOpen(false)} aria-label="Close menu">
              <Icon name="close" />
            </button>
          </div>

          <nav className="flex flex-col gap-1 px-space-md mt-space-sm">
            {nav.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={navClass}>
                <Icon name={n.icon} className="text-xl" />
                <span className="font-body-md text-body-md">{n.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="px-space-md space-y-1 mt-space-lg">
          <NavLink to={profilePath} className={navClass}>
            <Icon name="badge" className="text-xl" />
            <span className="font-body-md text-body-md">Profile</span>
          </NavLink>
          <button type="button" onClick={handleLogout} className={`${itemCls} text-on-primary-container hover:bg-primary hover:text-on-primary`}>
            <Icon name="logout" className="text-xl" />
            <span className="font-body-md text-body-md">Logout</span>
          </button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="fixed top-0 left-0 lg:left-72 right-0 h-16 bg-surface/90 backdrop-blur-md z-30 flex items-center justify-between gap-3 px-space-md md:px-space-lg shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-space-sm min-w-0">
            <button type="button" className="lg:hidden p-2 -ml-2 rounded-full hover:bg-surface-container-high transition-colors" onClick={() => setDrawerOpen(true)} aria-label="Open menu">
              <Icon name="menu" className="text-on-surface" />
            </button>
            {planLabel && (
              <div className="hidden sm:flex items-center gap-space-sm min-w-0">
                <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider whitespace-nowrap">Active Plan:</span>
                <span className="px-space-xs py-0.5 rounded bg-surface-container-high text-primary font-label-md text-label-md truncate">{planLabel}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-space-md md:gap-space-lg">
            <NotificationBell />
            <Link to={profilePath} className="flex items-center gap-space-sm">
              <div className="text-right hidden md:block">
                <p className="font-label-lg text-label-lg text-on-surface leading-tight">{name}</p>
                <p className="font-label-xs text-label-xs text-on-surface-variant">{subLabel ?? profile?.area ?? fallbackName}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-primary-container text-on-tertiary-container grid place-items-center font-label-lg text-label-md shadow-sm">{initials}</div>
            </Link>
          </div>
        </header>

        <main className="relative pt-16 bg-background w-full px-space-md md:px-space-lg min-h-screen">
          <div className="flex flex-col w-full py-space-lg pb-16 space-y-6 md:space-y-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
