import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Register the PWA service worker for offline support and auto-updates.
// When a new version is deployed, the service worker will automatically
// update in the background and activate on the next page load.
import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  // Called when a new service worker has installed and is waiting to activate.
  // With registerType: 'autoUpdate', this auto-activates, but we also
  // force an immediate update check on an interval.
  onNeedRefresh() {
    // Auto-reload to apply the new version
    updateSW(true)
  },
  onOfflineReady() {
    console.log('[PWA] App is ready for offline use.')
  },
  onRegisteredSW(swUrl: string, registration: ServiceWorkerRegistration | undefined) {
    if (!registration) return
    // Check for updates every 60 seconds
    setInterval(() => {
      registration.update()
    }, 60 * 1000)
    console.log('[PWA] Service worker registered:', swUrl)
  },
  onRegisterError(error: any) {
    console.error('[PWA] Service worker registration error:', error)
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
