import { Link } from 'react-router-dom'
import Logo from './Logo.jsx'

// Shared stacked-logo brand mark: "MESSIFY" in bold with the AI tagline
// underneath, separated by a left accent bar — used in the navbar, landing
// page, auth screens, and footer so the branding stays consistent everywhere.
export default function Brand({ to = '/', size = 'md', hideSubtitleOnMobile = false, className = '' }) {
  const titleSize = size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-lg' : 'text-2xl'
  const subSize = size === 'lg' ? 'text-sm' : 'text-[11px]'
  const subtitleVisibility = hideSubtitleOnMobile ? 'hidden sm:block' : ''

  return (
    <Link to={to} className={`flex items-center gap-3 group ${className}`}>
      <Logo ring={false} className="w-11 h-11 transition-transform duration-500 group-hover:rotate-12" />
      <span className="pl-3 border-l-2 border-sooji flex flex-col justify-center leading-tight">
        <span className={`font-display font-extrabold text-masala tracking-tight ${titleSize}`}>MESSIFY</span>
        <span className={`font-body italic text-charcoal-soft ${subSize} whitespace-nowrap ${subtitleVisibility}`}>AI-Powered Smart Mess Management System</span>
      </span>
    </Link>
  )
}
