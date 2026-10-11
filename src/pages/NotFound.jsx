import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-5">
      <h1 className="font-display text-7xl text-masala animate-fadeUp">404</h1>
      <p className="text-charcoal-soft">This page could not be found.</p>
      <Link to="/" className="text-masala font-bold">Go back home →</Link>
    </div>
  )
}
