import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import Icon from './Icon.jsx'

const HOME = { student: '/student', mess: '/mess', delivery: '/delivery', admin: '/admin' }

// "Back to Home" pill for auth pages. Signed-in users get a shortcut to their own dashboard instead.
export default function HomeButton({ className = '' }) {
  const { currentUser, profile } = useAuth()
  const dash = currentUser && profile?.role ? HOME[profile.role] : null
  return (
    <Link
      to={dash || '/'}
      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/15 hover:bg-white/25 border border-white/30 text-white text-xs font-semibold transition-colors whitespace-nowrap ${className}`}
    >
      <Icon name={dash ? 'dashboard' : 'arrow_back'} className="text-base" />
      {dash ? 'My Dashboard' : 'Back to Home'}
    </Link>
  )
}
