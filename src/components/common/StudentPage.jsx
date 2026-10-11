import StudentLayout from './StudentLayout.jsx'

// Drop-in replacement for PageLayout on student pages: same sidebar shell as the dashboard.
export default function StudentPage({ title, subtitle, actions, planLabel, children }) {
  return (
    <StudentLayout planLabel={planLabel}>
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
