import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import PageLayout from '../../components/common/MessPage.jsx'
import { Card, Input, Textarea, Button, Toast } from '../../components/common/UI.jsx'
import { getMenu, setTodayMenu } from '../../firebase/firestore.js'

const todayStr = () => new Date().toISOString().slice(0, 10)

export default function MenuManager() {
  const { currentUser } = useAuth()
  const [lunchItems, setLunchItems] = useState('')
  const [lunchPrice, setLunchPrice] = useState('')
  const [dinnerItems, setDinnerItems] = useState('')
  const [dinnerPrice, setDinnerPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    getMenu(currentUser.uid, todayStr()).then((menu) => {
      if (menu?.lunch) { setLunchItems(menu.lunch.items || ''); setLunchPrice(menu.lunch.price || '') }
      if (menu?.dinner) { setDinnerItems(menu.dinner.items || ''); setDinnerPrice(menu.dinner.price || '') }
    })
  }, [currentUser])

  async function handleSave() {
    setSaving(true)
    await setTodayMenu(currentUser.uid, todayStr(), 'lunch', lunchItems, Number(lunchPrice) || 0)
    await setTodayMenu(currentUser.uid, todayStr(), 'dinner', dinnerItems, Number(dinnerPrice) || 0)
    setSaving(false)
    setToast('Menu updated! Subscribers will now see it.')
    setTimeout(() => setToast(''), 3000)
  }

  return (
    <PageLayout title="Update Today's Menu" subtitle={`Date: ${todayStr()}`}>
      <Card className="animate-fadeUp">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-4">
            <h3 className="text-lg">Lunch</h3>
            <Textarea label="Items" placeholder="e.g. Dal, Rice, Potato Curry, Flatbread" value={lunchItems} onChange={(e) => setLunchItems(e.target.value)} />
            <Input label="Price per meal (₹)" type="number" placeholder="70" value={lunchPrice} onChange={(e) => setLunchPrice(e.target.value)} />
          </div>
          <div className="flex flex-col gap-4">
            <h3 className="text-lg">Dinner</h3>
            <Textarea label="Items" placeholder="e.g. Paneer Bhurji, Flatbread, Salad" value={dinnerItems} onChange={(e) => setDinnerItems(e.target.value)} />
            <Input label="Price per meal (₹)" type="number" placeholder="85" value={dinnerPrice} onChange={(e) => setDinnerPrice(e.target.value)} />
          </div>
        </div>
        <div className="mt-6">
          <Button disabled={saving} onClick={handleSave}>{saving ? 'Saving...' : 'Save Menu'}</Button>
        </div>
      </Card>

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </PageLayout>
  )
}
