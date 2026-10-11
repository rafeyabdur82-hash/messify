import { useState, useRef, useEffect } from 'react'
import PageLayout from '../../components/common/DeliveryPage.jsx'
import { Card, Button, Toast } from '../../components/common/UI.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { recordBoxScan } from '../../firebase/firestore.js'

const MODES = {
  deliver: { label: 'Delivery', status: 'with_student', done: 'delivered to the student' },
  return: { label: 'Box return', status: 'with_mess', done: 'returned to the mess' },
}

export default function ScanQR() {
  const { currentUser } = useAuth()
  const [scanning, setScanning] = useState(false)
  const [mode, setMode] = useState('deliver')
  const [lastResult, setLastResult] = useState('')
  const [toast, setToast] = useState('')
  const scannerRef = useRef(null)
  const modeRef = useRef(mode)
  const lastScan = useRef({ code: '', at: 0 })

  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => () => { if (scannerRef.current) scannerRef.current.clear().catch(() => {}) }, [])

  async function startScanning() {
    setScanning(true)
    const { Html5QrcodeScanner } = await import('html5-qrcode')
    const scanner = new Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: 250 }, false)
    scannerRef.current = scanner
    scanner.render(async (decodedText) => {
      // The camera reports the same code many times per second — ignore repeats for 5s.
      const now = Date.now()
      if (decodedText === lastScan.current.code && now - lastScan.current.at < 5000) return
      lastScan.current = { code: decodedText, at: now }

      setLastResult(decodedText)
      // QR format: boxId|studentId|messId (shown on the student's dashboard)
      const [qrId, studentId, messId] = decodedText.split('|')
      if (!qrId) return
      const m = MODES[modeRef.current]
      try {
        await recordBoxScan(qrId, studentId || '', messId || '', m.status, currentUser.uid)
        setToast(`Box ${qrId.slice(0, 6).toUpperCase()} ${m.done}.`)
      } catch (err) {
        console.error(err)
        setToast('Could not save this scan. Please try again.')
      }
      setTimeout(() => setToast(''), 3000)
    }, () => {})
  }

  return (
    <PageLayout title="Tiffin Box Scanner" subtitle="Scan the box QR when you deliver or collect it">
      <Card className="flex flex-col items-center gap-5 py-10 text-center animate-fadeUp">
        <div className="inline-flex p-1 bg-dahi-dim rounded-full" role="tablist" aria-label="Scan mode">
          {Object.entries(MODES).map(([id, m]) => (
            <button key={id} type="button" role="tab" aria-selected={mode === id} onClick={() => setMode(id)}
              className={`px-5 py-2 rounded-full text-sm font-bold transition-colors ${mode === id ? 'bg-masala text-white' : 'text-charcoal-soft'}`}>
              {m.label}
            </button>
          ))}
        </div>
        {!scanning ? (
          <>
            <p className="text-charcoal-soft">{mode === 'deliver' ? 'Scan the QR on the tiffin box to confirm it reached the student.' : "Scan the QR when you pick the empty box back up — it's marked as returned to the mess."}</p>
            <Button onClick={startScanning}>Start Camera</Button>
          </>
        ) : (
          <div id="qr-reader" className="w-full max-w-sm rounded-xl overflow-hidden" />
        )}
        {lastResult && <p className="font-mono text-[13px] break-all">Last scan: {lastResult}</p>}
      </Card>
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </PageLayout>
  )
}
