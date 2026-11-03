import React, { useEffect, useRef } from 'react'

/**
 * Cloudflare Turnstile Captcha Widget
 * Tự động tải script Cloudflare và chạy ngầm (invisible) bảo vệ form đăng ký/đăng nhập
 * Ẩn hoàn toàn trên giao diện Frontend nhưng vẫn duy trì xác thực và sinh token ngầm
 */
export function TurnstileWidget({ onVerify, onError, onExpire }) {
  const containerRef = useRef(null)
  const widgetIdRef = useRef(null)
  const siteKey = (import.meta.env.VITE_TURNSTILE_SITE_KEY || '').trim()

  useEffect(() => {
    if (!siteKey || !containerRef.current) return

    let isMounted = true

    const renderWidget = () => {
      if (typeof window !== 'undefined' && window.turnstile?.render && containerRef.current) {
        try {
          if (widgetIdRef.current) {
            window.turnstile.remove(widgetIdRef.current)
          }
          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            callback: (token) => {
              if (isMounted && onVerify) onVerify(token)
            },
            'error-callback': (err) => {
              if (isMounted && onError) onError(err)
            },
            'expired-callback': () => {
              if (isMounted && onExpire) onExpire()
            },
            theme: 'light',
            size: 'invisible',
          })
        } catch (_) {}
      }
    }

    const loadScript = () => {
      if (typeof window !== 'undefined' && window.turnstile?.render) {
        renderWidget()
        return
      }
      if (document.getElementById('cloudflare-turnstile-script')) {
        const interval = setInterval(() => {
          if (window.turnstile?.render) {
            clearInterval(interval)
            if (isMounted) renderWidget()
          }
        }, 100)
        return
      }
      const script = document.createElement('script')
      script.id = 'cloudflare-turnstile-script'
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.async = true
      script.defer = true
      script.onload = () => {
        if (isMounted) renderWidget()
      }
      document.head.appendChild(script)
    }

    loadScript()

    return () => {
      isMounted = false
      if (widgetIdRef.current && typeof window !== 'undefined' && typeof window.turnstile?.remove === 'function') {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch (_) {}
      }
    }
  }, [siteKey])

  if (!siteKey) return null

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
        opacity: 0,
        pointerEvents: 'none',
        zIndex: -9999,
      }}
    >
      <div ref={containerRef} className="turnstile-container" />
    </div>
  )
}

