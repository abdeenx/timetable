import { useEffect, useState } from 'react'

const DISMISS_KEY = 'pwa-install-dismissed'
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

function wasRecentlyDismissed() {
  const dismissed = localStorage.getItem(DISMISS_KEY)
  if (!dismissed) return false
  return Date.now() - Number(dismissed) < DISMISS_MS
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [visible, setVisible] = useState(false)
  const [isIos, setIsIos] = useState(false)

  useEffect(() => {
    if (isStandalone() || wasRecentlyDismissed()) return

    if (isIOS()) {
      setIsIos(true)
      const timer = window.setTimeout(() => setVisible(true), 2000)
      return () => window.clearTimeout(timer)
    }

    const onBeforeInstall = (event) => {
      event.preventDefault()
      setDeferredPrompt(event)
      setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [])

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setVisible(false)
  }

  const install = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="install-prompt" role="dialog" aria-labelledby="install-prompt-title">
      <div className="install-prompt-content">
        <img src="/logo.png" alt="" className="install-prompt-logo" width={48} height={48} />
        <div className="install-prompt-text">
          <strong id="install-prompt-title">Install Timetable App</strong>
          {isIos ? (
            <p>
              Tap <span className="install-prompt-icon">Share</span> then{' '}
              <strong>Add to Home Screen</strong> for quick access offline.
            </p>
          ) : (
            <p>Add this app to your home screen for fast access and offline use.</p>
          )}
        </div>
      </div>
      <div className="install-prompt-actions">
        {!isIos && (
          <button type="button" className="btn-primary install-prompt-install" onClick={install}>
            Install
          </button>
        )}
        <button type="button" className="btn-secondary install-prompt-dismiss" onClick={dismiss}>
          {isIos ? 'Got it' : 'Not now'}
        </button>
      </div>
    </div>
  )
}
