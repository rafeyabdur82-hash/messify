import StudentLayout from './StudentLayout.jsx'

const DELIVERY_NAV = [
  { to: '/delivery', label: 'My Routes', icon: 'route', end: true },
  { to: '/delivery/scan', label: 'Scan Tiffin QR', icon: 'qr_code_scanner' },
  { to: '/delivery/history', label: 'Order History', icon: 'history' },
  { to: '/delivery/earnings', label: 'Tip & Payment History', icon: 'payments' },
]

// Delivery-partner shell (same sidebar layout as student / mess panels). PageLayout-compatible props.
export default function DeliveryPage({ title, subtitle, actions, children }) {
  return (
    <StudentLayout nav={DELIVERY_NAV} portalName="Delivery Portal" homePath="/delivery" profilePath="/delivery/profile" fallbackName="Delivery Partner" subLabel="Delivery Partner">
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
