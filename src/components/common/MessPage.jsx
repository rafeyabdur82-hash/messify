import StudentLayout from './StudentLayout.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

const MESS_NAV = [
  { to: '/mess', label: 'Home', icon: 'cottage', end: true },
  { to: '/mess/menu', label: 'Meals', icon: 'restaurant_menu' },
  { to: '/mess/orders', label: 'Orders', icon: 'receipt_long' },
  { to: '/mess/payments', label: 'Payments', icon: 'payments' },
  { to: '/mess/subscribers', label: 'Subscribers', icon: 'group' },
  { to: '/mess/ledger', label: 'Ledger', icon: 'menu_book' },
  { to: '/mess/delivery-partners', label: 'Delivery', icon: 'local_shipping' },
  { to: '/mess/qr', label: 'UPI QR', icon: 'qr_code_2' },
]

// Mess-owner shell (same sidebar layout as the student panel). PageLayout-compatible props.
export default function MessPage({ title, subtitle, actions, children }) {
  const { profile } = useAuth()
  return (
    <StudentLayout
      nav={MESS_NAV} portalName="Mess Owner Portal" homePath="/mess" profilePath="/mess/profile"
      fallbackName="Mess Owner" subLabel={profile?.messName || 'Mess Owner'}
    >
      {(title || actions) && (
        <div className="flex justify-between items-end gap-4 flex-wrap animate-fadeUp">
          <div>
            {title && <h1 className="font-headline-md text-headline-md text-on-surface">{title}</h1>}
            {subtitle && <p className="font-body-md text-body-md text-on-surface-variant mt-1">{subtitle}</p>}
          </div>
          {actions && <div className="flex gap-3">{actions}</div>}
        </div>
      )}
      {children}
    </StudentLayout>
  )
}
