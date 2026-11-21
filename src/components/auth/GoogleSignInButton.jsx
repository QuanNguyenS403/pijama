import React, { useEffect, useRef, useState } from 'react'
import { waitForGoogleSdk, setupGoogleSignInButton, disableGoogleAutoSelect, loginWithGoogle } from '../../lib/googleAuth'
import { RefreshCw } from 'lucide-react'

/**
 * GoogleSignInButton Component Chuẩn Google Identity Services (GIS)
 * - Tự động tải và kết nối Google Identity Services trực tiếp.
 * - Hiển thị dòng chữ "Tiếp tục với Google" đồng bộ thẩm mỹ QuanNguyenS.
 * - Khắc phục triệt để câu chữ mặc định cồng kềnh "Tiếp tục sử dụng dịch vụ bằng Google" của Google GIS iframe tiếng Việt.
 * - Tương thích 100% Google Account Chooser & bảo mật ID Token.
 */
export default function GoogleSignInButton({
  onSuccess,
  onError,
  disabled = false,
  theme = 'outline',
  text = 'continue_with',
  buttonText = 'Tiếp tục với Google',
  className = '',
}) {
  const containerRef = useRef(null)
  const [status, setStatus] = useState('loading') // 'loading' | 'ready' | 'error'
  const [retryCount, setRetryCount] = useState(0)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    let isCancelled = false

    async function mountButton() {
      setStatus('loading')

      // Kiểm tra hoặc đợi SDK Google Identity Services sẵn sàng
      const isReady = await waitForGoogleSdk(3500)
      if (isCancelled || !isMountedRef.current) return

      if (!isReady) {
        // Thử chèn script động nếu chưa có
        if (typeof document !== 'undefined' && !document.getElementById('google-gsi-client-script')) {
          const script = document.createElement('script')
          script.id = 'google-gsi-client-script'
          script.src = 'https://accounts.google.com/gsi/client'
          script.async = true
          script.defer = true
          script.onload = async () => {
            if (isCancelled || !isMountedRef.current) return
            const readyAfterLoad = await waitForGoogleSdk(2000)
            if (readyAfterLoad && containerRef.current) {
              renderGoogleButton()
            } else if (isMountedRef.current) {
              setStatus('error')
            }
          }
          script.onerror = () => {
            if (isMountedRef.current) setStatus('error')
          }
          document.head.appendChild(script)
          return
        }

        setStatus('error')
        return
      }

      renderGoogleButton()
    }

    async function renderGoogleButton() {
      if (!containerRef.current || isCancelled || !isMountedRef.current) return

      try {
        disableGoogleAutoSelect()

        const container = containerRef.current
        const computedWidth = container.offsetWidth || container.parentElement?.offsetWidth || 360
        const targetWidth = Math.min(Math.max(computedWidth, 240), 400)

        const res = await setupGoogleSignInButton(container, {
          onSuccess: (data) => {
            if (isMountedRef.current && onSuccess) {
              onSuccess(data)
            }
          },
          onError: (err) => {
            if (isMountedRef.current && onError) {
              onError(err)
            }
          },
          theme,
          text,
          width: targetWidth,
        })

        if (res.success && isMountedRef.current) {
          setStatus('ready')
        } else if (isMountedRef.current) {
          setStatus('error')
        }
      } catch (err) {
        console.warn('Lỗi gắn nút Google GIS:', err)
        if (isMountedRef.current) setStatus('error')
      }
    }

    mountButton()

    // Lắng nghe thay đổi kích thước cửa sổ để co giãn nút cho vừa vặn
    const handleResize = () => {
      if (status === 'ready' && containerRef.current) {
        renderGoogleButton()
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      isCancelled = true
      isMountedRef.current = false
      window.removeEventListener('resize', handleResize)
    }
  }, [retryCount, theme, text])

  const handleRetry = () => {
    setStatus('loading')
    setRetryCount((c) => c + 1)
  }

  const handleManualClick = () => {
    if (disabled) return
    loginWithGoogle({
      onSuccess,
      onError: (err) => {
        if (onError && err) onError(err)
      },
      onFallbackNeeded: () => {
        if (onError) onError('Trình duyệt có thể đã chặn cửa sổ đăng nhập Google. Vui lòng cho phép popup.')
      },
    })
  }

  return (
    <div className={`w-full flex flex-col items-center justify-center ${className}`}>
      {/* 1. Trạng thái Loading (Skeleton chuẩn nhận diện thương hiệu) */}
      {status === 'loading' && (
        <div className="w-full flex justify-center items-center">
          <div className="w-full max-w-[400px] h-[40px] sm:h-[44px] flex items-center justify-center gap-3 py-2.5 px-4 border border-[#d9d9d9] bg-white text-[#2C201A] rounded-[2px] text-xs sm:text-sm font-medium transition-all shadow-2xs">
            <svg className="w-4 h-4 shrink-0 animate-pulse" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span className="text-[#8C7E74]">Đang khởi tạo kết nối Google...</span>
          </div>
        </div>
      )}

      {/* 2. Container chính: Nút chuẩn giao diện "Tiếp tục với Google" kết hợp Native Google Iframe */}
      <div
        className={`relative w-full max-w-[400px] min-h-[40px] sm:min-h-[44px] transition-opacity duration-200 ${
          status === 'ready' ? 'opacity-100 block' : 'opacity-0 h-0 overflow-hidden pointer-events-none'
        } ${disabled ? 'pointer-events-none opacity-60' : ''}`}
      >
        {/* Nút chuẩn thiết kế với dòng chữ "Tiếp tục với Google" */}
        <button
          type="button"
          onClick={handleManualClick}
          className="w-full h-[40px] sm:h-[44px] flex items-center justify-center gap-3 py-2.5 px-4 border border-[#d9d9d9] bg-white hover:bg-[#FAF8F5] text-[#2C201A] rounded-[2px] text-xs sm:text-sm font-medium transition-all shadow-2xs select-none cursor-pointer"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span className="text-[#2C201A] font-medium">{buttonText}</span>
        </button>

        {/* Google Identity Services Native Iframe đặt đè lên với opacity gần bằng 0 (0.001) để bắt click trực tiếp */}
        <div
          ref={containerRef}
          className="absolute inset-0 z-10 w-full h-full flex justify-center items-center opacity-[0.001] overflow-hidden cursor-pointer [&>div]:!w-full [&>div]:!h-full [&_iframe]:!w-full [&_iframe]:!h-full [&_iframe]:!min-w-full [&_iframe]:!min-h-full [&_iframe]:!scale-105"
        />
      </div>

      {/* 3. Trạng thái Fallback khi bị chặn bởi trình duyệt / AdBlock */}
      {status === 'error' && (
        <div className="w-full max-w-[400px] flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={handleRetry}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 border border-[#d9d9d9] bg-white hover:bg-[#FAF8F5] text-[#2C201A] rounded-[2px] text-xs sm:text-sm font-medium transition-all shadow-2xs cursor-pointer active:scale-[0.99]"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <RefreshCw className="w-3.5 h-3.5 text-[#631521]" />
            <span>Thử kết nối lại với Google</span>
          </button>
          <p className="text-[11px] text-[#8C7E74] text-center leading-normal">
            Trình duyệt hoặc tiện ích chặn quảng cáo có thể đang tạm chặn kết nối Google. Vui lòng thử lại hoặc đăng nhập bằng Email bên trên.
          </p>
        </div>
      )}
    </div>
  )
}
