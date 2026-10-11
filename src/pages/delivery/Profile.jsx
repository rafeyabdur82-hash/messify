import { useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import PageLayout from '../../components/common/DeliveryPage.jsx'
import { Card, Input, Button, Toast, Badge } from '../../components/common/UI.jsx'
import ChangePasswordCard from '../../components/common/ChangePasswordCard.jsx'

export default function Profile() {
  const { profile, updateUserProfile } = useAuth()
  const [name, setName] = useState(profile?.name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [vehicleNumber, setVehicleNumber] = useState(profile?.vehicleNumber || '')
  const [vehicleType, setVehicleType] = useState(profile?.vehicleType || 'bike')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    await updateUserProfile({ name, phone, vehicleNumber, vehicleType })
    setSaving(false)
    setToast('Profile updated successfully.')
    setTimeout(() => setToast(''), 3000)
  }

  return (
    <PageLayout title="My Profile" subtitle="Manage your personal and vehicle details">
      <div className="flex flex-col gap-6">
        <Card className="animate-fadeUp">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-masala text-white grid place-items-center text-2xl font-bold font-display flex-shrink-0">
              {profile?.name?.[0]?.toUpperCase() || 'D'}
            </div>
            <div>
              <h3 className="text-xl">{profile?.name}</h3>
              <Badge tone="info">Delivery Partner</Badge>
            </div>
          </div>

          <form onSubmit={handleSave} className="flex flex-col gap-4 max-w-lg">
            <Input label="Full name" required value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Email" value={profile?.email || ''} disabled className="opacity-60" />
            <p className="text-xs text-charcoal-soft -mt-2">Email can't be changed here. Contact support if you need to update it.</p>
            <Input label="Phone number" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210" />
            <label className="flex flex-col gap-2">
              <span className="text-[13px] font-bold text-charcoal-soft">Vehicle type</span>
              <select className="px-4 py-3 border-[1.5px] border-sooji rounded-xl text-[15px] bg-white text-charcoal focus:outline-none focus:border-tamarind" value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}>
                <option value="bike">Bike / Scooter</option>
                <option value="bicycle">Bicycle</option>
                <option value="car">Car</option>
                <option value="on_foot">On Foot</option>
              </select>
            </label>
            <Input label="Vehicle number (optional)" value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} placeholder="e.g. MH-31-AB-1234" />
            <div>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
            </div>
          </form>
        </Card>

        <ChangePasswordCard />
      </div>

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </PageLayout>
  )
}
