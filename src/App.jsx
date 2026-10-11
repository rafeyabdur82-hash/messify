import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import AIAgent from './components/common/AIAgent.jsx'

import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'

import StudentDashboard from './pages/student/StudentDashboard.jsx'
import BrowseMess from './pages/student/BrowseMess.jsx'
import MessDetail from './pages/student/MessDetail.jsx'
import Payment from './pages/student/Payment.jsx'
import Checkout from './pages/student/Checkout.jsx'
import MySubscriptions from './pages/student/MySubscriptions.jsx'
import Billing from './pages/student/Billing.jsx'
import TrackDelivery from './pages/student/TrackDelivery.jsx'
import StudentProfile from './pages/student/Profile.jsx'

import MessDashboard from './pages/mess/MessDashboard.jsx'
import MenuManager from './pages/mess/MenuManager.jsx'
import Subscribers from './pages/mess/Subscribers.jsx'
import MessOrders from './pages/mess/MessOrders.jsx'
import MessLedger from './pages/mess/MessLedger.jsx'
import MessProfile from './pages/mess/Profile.jsx'
import PaymentApprovals from './pages/mess/PaymentApprovals.jsx'
import PaymentHistory from './pages/mess/PaymentHistory.jsx'
import QRSettings from './pages/mess/QRSettings.jsx'
import DeliveryPartners from './pages/mess/DeliveryPartners.jsx'

import DeliveryDashboard from './pages/delivery/DeliveryDashboard.jsx'
import RouteView from './pages/delivery/RouteView.jsx'
import DeliveryHistory from './pages/delivery/DeliveryHistory.jsx'
import ScanQR from './pages/delivery/ScanQR.jsx'
import DeliveryProfile from './pages/delivery/Profile.jsx'

import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import AdminLogin from './pages/admin/AdminLogin.jsx'

import NotFound from './pages/NotFound.jsx'

const ROLE_HOME = { student: '/student', mess: '/mess', delivery: '/delivery', admin: '/admin' }

function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser, profile } = useAuth()
  const location = useLocation()
  if (!currentUser) return <Navigate to={allowedRoles?.includes('admin') ? '/admin/login' : '/login'} state={{ from: location }} replace />
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/" replace />
  }
  return children
}

function HomeRoute() {
  const { currentUser, profile } = useAuth()
  if (currentUser && profile?.role && ROLE_HOME[profile.role]) {
    return <Navigate to={ROLE_HOME[profile.role]} replace />
  }
  return <Landing />
}

export default function App() {
  const { currentUser } = useAuth()

  return (
    <>
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Student section */}
        <Route path="/student" element={
          <ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>
        } />
        <Route path="/student/browse" element={
          <ProtectedRoute allowedRoles={['student']}><BrowseMess /></ProtectedRoute>
        } />
        <Route path="/student/mess/:messId" element={
          <ProtectedRoute allowedRoles={['student']}><MessDetail /></ProtectedRoute>
        } />
        <Route path="/student/mess/:messId/checkout" element={
          <ProtectedRoute allowedRoles={['student']}><Checkout /></ProtectedRoute>
        } />
        <Route path="/student/mess/:messId/pay" element={
          <ProtectedRoute allowedRoles={['student']}><Payment /></ProtectedRoute>
        } />
        <Route path="/student/subscriptions" element={
          <ProtectedRoute allowedRoles={['student']}><MySubscriptions /></ProtectedRoute>
        } />
        <Route path="/student/billing" element={
          <ProtectedRoute allowedRoles={['student']}><Billing /></ProtectedRoute>
        } />
        <Route path="/student/track/:orderId" element={
          <ProtectedRoute allowedRoles={['student']}><TrackDelivery /></ProtectedRoute>
        } />
        <Route path="/student/profile" element={
          <ProtectedRoute allowedRoles={['student']}><StudentProfile /></ProtectedRoute>
        } />

        {/* Mess owner section */}
        <Route path="/mess" element={
          <ProtectedRoute allowedRoles={['mess']}><MessDashboard /></ProtectedRoute>
        } />
        <Route path="/mess/menu" element={
          <ProtectedRoute allowedRoles={['mess']}><MenuManager /></ProtectedRoute>
        } />
        <Route path="/mess/subscribers" element={
          <ProtectedRoute allowedRoles={['mess']}><Subscribers /></ProtectedRoute>
        } />
        <Route path="/mess/orders" element={
          <ProtectedRoute allowedRoles={['mess']}><MessOrders /></ProtectedRoute>
        } />
        <Route path="/mess/ledger" element={
          <ProtectedRoute allowedRoles={['mess']}><MessLedger /></ProtectedRoute>
        } />
        <Route path="/mess/payments" element={
          <ProtectedRoute allowedRoles={['mess']}><PaymentApprovals /></ProtectedRoute>
        } />
        <Route path="/mess/payment-history" element={
          <ProtectedRoute allowedRoles={['mess']}><PaymentHistory /></ProtectedRoute>
        } />
        <Route path="/mess/qr" element={
          <ProtectedRoute allowedRoles={['mess']}><QRSettings /></ProtectedRoute>
        } />
        <Route path="/mess/delivery-partners" element={
          <ProtectedRoute allowedRoles={['mess']}><DeliveryPartners /></ProtectedRoute>
        } />
        <Route path="/mess/profile" element={
          <ProtectedRoute allowedRoles={['mess']}><MessProfile /></ProtectedRoute>
        } />

        {/* Delivery section */}
        <Route path="/delivery" element={
          <ProtectedRoute allowedRoles={['delivery']}><DeliveryDashboard /></ProtectedRoute>
        } />
        <Route path="/delivery/route/:routeId" element={
          <ProtectedRoute allowedRoles={['delivery']}><RouteView /></ProtectedRoute>
        } />
        <Route path="/delivery/history" element={
          <ProtectedRoute allowedRoles={['delivery']}><DeliveryHistory /></ProtectedRoute>
        } />
        <Route path="/delivery/scan" element={
          <ProtectedRoute allowedRoles={['delivery']}><ScanQR /></ProtectedRoute>
        } />
        <Route path="/delivery/profile" element={
          <ProtectedRoute allowedRoles={['delivery']}><DeliveryProfile /></ProtectedRoute>
        } />

        {/* Admin section */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>
        } />

        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* Floating AI assistant — visible everywhere, logged in or not */}
      <AIAgent />
    </>
  )
}
