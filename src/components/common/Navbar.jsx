import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import Brand from './Brand.jsx'
import NotificationBell from './NotificationBell.jsx'

const NAV_LINKS = {
  student: [
    { to: '/student', label: 'Home' },
    { to: '/student/browse', label: 'Browse Mess' },
    { to: '/student/subscriptions', label: 'My Subscriptions' },
    { to: '/student/billing', label: 'Billing' },
    { to: '/student/profile', label: 'Profile' },
  ],
  mess: [
    { to: '/mess', label: 'Dashboard' },
    { to: '/mess/menu', label: 'Menu' },
    { to: '/mess/subscribers', label: 'Subscribers' },
    { to: '/mess/orders', label: 'Orders' },
    { to: '/mess/payments', label: 'Payments' },
    { to: '/mess/payment-history', label: 'Payment History' },
    { to: '/mess/delivery-partners', label: 'Delivery' },
    { to: '/mess/qr', label: 'QR Code' },
    { to: '/mess/ledger', label: 'Ledger' },
    { to: '/mess/profile', label: 'Profile' },
  ],
  delivery: [
    { to: '/delivery', label: 'Routes' },
    { to: '/delivery/history', label: 'Completed Orders' },
    { to: '/delivery/scan', label: 'Scan QR' },
    { to: '/delivery/profile', label: 'Profile' },
  ],
  admin: [
    { to: '/admin', label: 'Overview' },
  ],
}

export default function Navbar() {
  const { profile, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const links = profile ? NAV_LINKS[profile.role] || [] : []

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-50 navbar-blur border-b border-sooji">
      <div className="max-w-7xl mx-auto px-5 py-3 flex items-center gap-6 relative">
        <Brand size="sm" hideSubtitleOnMobile />

        {links.length > 0 && (
          <nav className={`${menuOpen ? 'flex' : 'hidden'} md:flex flex-col md:flex-row gap-1 flex-1 absolute md:static top-full left-0 right-0 md:top-auto bg-dahi md:bg-transparent border-b md:border-0 border-sooji p-3 md:p-0 md:flex-wrap`}>
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`px-3.5 py-2 rounded-full font-semibold text-sm transition-colors whitespace-nowrap ${
                  location.pathname === l.to ? 'bg-masala text-white' : 'text-charcoal-soft hover:bg-sooji hover:text-charcoal'
                }`}
                onClick={() => setMenuOpen(false)}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-2 ml-auto">
          {profile ? (
            <>
              <NotificationBell />
              <span className="hidden md:inline font-bold text-sm ml-1">{profile.name?.split(' ')[0]}</span>
              <button className="text-charcoal-soft hover:text-charcoal font-semibold text-sm px-3 py-2 transition-colors" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-charcoal-soft hover:text-charcoal font-semibold text-sm px-3 py-2 transition-colors">Log in</Link>
              <Link to="/signup" className="btn-glow bg-masala hover:bg-masala-dark text-white font-bold text-sm px-5 py-2.5 rounded-full transition-all">Get Started</Link>
            </>
          )}
          {links.length > 0 && (
            <button className="md:hidden flex flex-col gap-1 p-2" onClick={() => setMenuOpen((o) => !o)} aria-label="Menu">
              <span className="w-5 h-0.5 bg-charcoal"></span>
              <span className="w-5 h-0.5 bg-charcoal"></span>
              <span className="w-5 h-0.5 bg-charcoal"></span>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
