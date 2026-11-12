import { useEffect, useState, useCallback, useRef } from 'react'
import { Link, useSearchParams, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  CheckCircle2,
  Package,
  Truck,
  QrCode,
  Copy,
  Check,
  Gift,
  Loader2,
  Lock,
  AlertTriangle,
  ShoppingBag,
  Upload,
  ImagePlus,
  X,
  ExternalLink,
  ArrowRight,
} from 'lucide-react'
import Header from '../components/layout/Header'
import Section12Footer from '../components/sections/Section12Footer'
import CartDrawer from '../components/cart/CartDrawer'
import { formatVND } from '../data/checkoutConfig'
import { applyOrderUpdateLocally, getSavedOrders, restoreOrderItemsToCart, purgeCancelledOrderLocally } from '../lib/orderSync'
import useCartStore from '../store/cartStore'

export default function BankTransferPaymentPage() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const orderId = searchParams.get('orderId')

  // FE-003: Bắt buộc phải có orderId hợp lệ, không fallback sang đơn người khác
  useEffect(() => {
    if (!orderId) {
      navigate('/checkout', { replace: true })
    }
  }, [orderId, navigate])

  // Order state from location state or sessionStorage / localStorage
  const [order, setOrder] = useState(() => {
    if (location.state?.order) return location.state.order
    if (!orderId) return null
    try {
      const saved = sessionStorage.getItem(`last_order_${orderId}`)
      if (saved) return JSON.parse(saved)
      const allOrders = getSavedOrders()
      return allOrders.find((o) => (o.orderId || o.id) === orderId) || null
    } catch (e) {
      console.error(e)
      return null
    }
  })

  const [cartDrawerOpen, setCartDrawerOpen] = useState(false)
  const [copiedField, setCopiedField] = useState(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verifySuccess, setVerifySuccess] = useState(false)
  const [isQrInvalidated, setIsQrInvalidated] = useState(false)

  const [aiQrDataUrl, setAiQrDataUrl] = useState(null)
  const [bankDetails, setBankDetails] = useState(null)
  const [paymentPhase, setPaymentPhase] = useState(() => {
    if (order?.payment?.status === 'PAID' || order?.paymentStatus === 'PAID') return 'PAID'
    if (order?.status === 'CANCELLED') return 'CANCELLED'
    if (
      order?.payment?.status === 'PENDING_ADMIN_CONFIRMATION' ||
      order?.payment?.status === 'CUSTOMER_CLAIMED_PAID' ||
      Boolean(order?.payment?.submittedAt)
    ) {
      return 'WAITING_CONFIRMATION'
    }
    return 'AWAITING'
  })

  // Upload ảnh chuyển khoản thành công để chủ shop đối soát
  const [proofData, setProofData] = useState(() => {
    if (order?.paymentProof?.imageUrl) return order.paymentProof
    if (order?.payment?.proofImageUrl) {
      return {
        imageUrl: order.payment.proofImageUrl,
        uploadedAt: order.payment.proofUploadedAt || null,
        note: order.payment.proofNote || '',
      }
    }
    return null
  })
  const [selectedProofFile, setSelectedProofFile] = useState(null)
  const [proofPreviewUrl, setProofPreviewUrl] = useState('')
  const [proofNote, setProofNote] = useState('')
  const [isUploadingProof, setIsUploadingProof] = useState(false)
  const [proofError, setProofError] = useState('')
  const [isDraggingProof, setIsDraggingProof] = useState(false)
  const [showUploadForm, setShowUploadForm] = useState(() => {
    return !(order?.paymentProof?.imageUrl || order?.payment?.proofImageUrl)
  })
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false)
  const [submitPaymentError, setSubmitPaymentError] = useState('')
  const proofInputRef = useRef(null)
  const uploadSectionRef = useRef(null)
  const proofHydratedRef = useRef(false)

  useEffect(() => {
    return () => {
      if (proofPreviewUrl) URL.revokeObjectURL(proofPreviewUrl)
    }
  }, [proofPreviewUrl])

  const persistLocalOrderPatch = useCallback((patchFn) => {
    if (!orderId) return null
    let updatedSnapshot = null
    setOrder((prev) => {
      if (!prev) return prev
      const updated = patchFn(prev)
      updatedSnapshot = updated
      try {
        sessionStorage.setItem(`last_order_${orderId}`, JSON.stringify(updated))
        sessionStorage.setItem('latest_order', JSON.stringify(updated))
        for (const key of ['pijama_orders', 'pijama_orders_archive']) {
          const list = JSON.parse(localStorage.getItem(key) || '[]')
          if (Array.isArray(list)) {
            const exists = list.some((o) => (o.orderId || o.id) === orderId)
            const nextList = exists
              ? list.map((o) => ((o.orderId || o.id) === orderId ? updated : o))
              : [updated, ...list]
            localStorage.setItem(key, JSON.stringify(nextList))
          }
        }
        window.dispatchEvent(new CustomEvent('orders_updated', { detail: updated }))
      } catch {}
      return updated
    })
    return updatedSnapshot
  }, [orderId])

  const persistLocalPaymentProof = useCallback((nextProof) => {
    if (!nextProof) return
    persistLocalOrderPatch((prev) => ({
      ...prev,
      paymentProof: nextProof,
      payment: {
        ...(prev.payment || {}),
        proofImageUrl: nextProof.imageUrl,
        proofUploadedAt: nextProof.uploadedAt,
        proofNote: nextProof.note || '',
      },
    }))
  }, [persistLocalOrderPatch])

  // Nếu đơn đã bấm "Thanh toán" và đang chờ admin duyệt -> điều hướng thẳng sang trang chờ xác nhận
  useEffect(() => {
    if (!orderId) return
    if (paymentPhase === 'WAITING_CONFIRMATION') {
      navigate(`/cho-xac-nhan-thanh-toan?orderId=${encodeURIComponent(orderId)}`, {
        state: { order },
        replace: true,
      })
    }
  }, [paymentPhase, orderId, order, navigate])

  // Polling kiểm tra trạng thái thanh toán từ máy chủ
  const checkStatus = useCallback(async (isManual = false) => {
    if (!orderId) return
    try {
      if (isManual) setIsVerifying(true)
      const res = await fetch(`/api/orders/status?orderId=${encodeURIComponent(orderId)}`)
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          if (data.phase) {
            setPaymentPhase(data.phase)
          }
          if (data.hasPaymentProof && !proofData && !proofHydratedRef.current && order?.trackingToken) {
            proofHydratedRef.current = true
            fetch(`/api/orders/payment-proof?orderId=${encodeURIComponent(orderId)}&token=${encodeURIComponent(order.trackingToken)}`)
              .then((r) => (r.ok ? r.json() : null))
              .then((proofRes) => {
                if (proofRes?.success && proofRes.paymentProof) {
                  setProofData(proofRes.paymentProof)
                  setShowUploadForm(false)
                  persistLocalPaymentProof(proofRes.paymentProof)
                }
              })
              .catch(() => {})
          }

          if (data.phase === 'PAID' || data.status === 'PAID') {
            setIsQrInvalidated(true)
            setVerifySuccess(true)
            useCartStore.getState().clearCart()
            if (data.order) {
              applyOrderUpdateLocally(data.order)
              setOrder(data.order)
            }
            setTimeout(() => {
              navigate(`/dat-hang-thanh-cong?orderId=${encodeURIComponent(orderId)}`, {
                state: { order: data.order || order },
                replace: true,
              })
            }, 800)
          } else if (data.phase === 'WAITING_CONFIRMATION' || data.status === 'WAITING_CONFIRMATION') {
            setPaymentPhase('WAITING_CONFIRMATION')
          } else if (data.phase === 'CANCELLED' || data.status === 'CANCELLED') {
            setPaymentPhase('CANCELLED')
          }
        }
      }
    } catch {
      // Polling silent catch
    } finally {
      if (isManual) setIsVerifying(false)
    }
  }, [orderId, order, navigate, proofData, persistLocalPaymentProof])

  // Khôi phục toàn bộ sản phẩm vào giỏ hàng để khách đặt lại nhanh chóng
  const handleRestoreCartAndReorder = () => {
    if (order?.items && order.items.length > 0) {
      restoreOrderItemsToCart(order)
      purgeCancelledOrderLocally(orderId)
    }
    navigate('/checkout')
  }

  // Customer & Payment Data
  const customerName = order?.customer?.fullName || 'Quý khách'
  const total = order?.total || bankDetails?.total || 0
  const discount = order?.discount || 0
  const transferContent = bankDetails?.description || (orderId ? (orderId.startsWith('QNS') ? orderId : `QNS ${orderId}`) : '')
  const qrUrl = aiQrDataUrl || bankDetails?.vietQrUrl || (total > 0
    ? `https://img.vietqr.io/image/vietcombank-1050773506-qr_only.png?amount=${total}&addInfo=${encodeURIComponent(transferContent)}&accountName=NGUYEN%20DUC%20QUAN`
    : '')

  // Tự động lấy mã QR VietQR chuẩn hóa từ server (WP4 - Server-Authoritative)
  useEffect(() => {
    if (!orderId) return
    let isMounted = true
    fetch(`/api/payment/qr?orderId=${encodeURIComponent(orderId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (!isMounted || !res) return
        if (res.qrDataUrl) {
          setAiQrDataUrl(res.qrDataUrl)
        }
        if (res.accountNumber) {
          setBankDetails({
            bankName: res.bankCode === 'VCB' ? 'Ngân hàng Ngoại Thương Việt Nam (Vietcombank)' : res.bankCode,
            accountNumber: res.accountNumber,
            accountName: res.accountName,
            description: res.description || `QNS ${orderId}`,
            vietQrUrl: res.vietQrUrl,
            total: res.total,
          })
        }
        if (res.phase) {
          setPaymentPhase(res.phase)
        }
      })
      .catch(() => {})

    return () => {
      isMounted = false
    }
  }, [orderId])

  // Polling nhẹ & SSE đồng bộ khi Admin duyệt thủ công trong lúc khách đang mở trang QR
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    if (!orderId) return

    let isSubscribed = true
    checkStatus(false)
    const interval = setInterval(() => {
      if (isSubscribed) checkStatus(false)
    }, 4000)

    const handleOrderEvent = (e) => {
      if (!isSubscribed) return
      const updated = e?.detail
      if (updated && (updated.orderId === orderId || updated.id === orderId)) {
        if (updated.paymentStatus === 'PAID' || updated.payment?.status === 'PAID') {
          setIsQrInvalidated(true)
          setVerifySuccess(true)
          applyOrderUpdateLocally(updated)
          setOrder(updated)
          useCartStore.getState().clearCart()
          setTimeout(() => {
            navigate(`/dat-hang-thanh-cong?orderId=${encodeURIComponent(orderId)}`, {
              state: { order: updated },
              replace: true,
            })
          }, 800)
        }
      }
    }

    window.addEventListener('orders_updated', handleOrderEvent)

    return () => {
      isSubscribed = false
      clearInterval(interval)
      window.removeEventListener('orders_updated', handleOrderEvent)
    }
  }, [orderId, checkStatus, navigate])

  const handleCopy = (text, fieldName) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedField(fieldName)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleSelectProofFile = (file) => {
    setProofError('')
    setSubmitPaymentError('')
    if (!file) return
    const allowedTypes = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
    if (!allowedTypes.has(String(file.type || '').toLowerCase())) {
      setProofError('Chỉ hỗ trợ ảnh định dạng JPEG, PNG hoặc WebP.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setProofError('Dung lượng ảnh không được vượt quá 5MB.')
      return
    }
    if (proofPreviewUrl) URL.revokeObjectURL(proofPreviewUrl)
    setSelectedProofFile(file)
    setProofPreviewUrl(URL.createObjectURL(file))
  }

  const clearSelectedProofFile = () => {
    if (proofPreviewUrl) URL.revokeObjectURL(proofPreviewUrl)
    setSelectedProofFile(null)
    setProofPreviewUrl('')
    setProofError('')
    if (proofInputRef.current) proofInputRef.current.value = ''
  }

  const uploadProofFile = async (file, noteText = '') => {
    const formData = new FormData()
    formData.append('proofImage', file)
    formData.append('orderId', orderId)
    if (order?.trackingToken) formData.append('trackingToken', order.trackingToken)
    if (order?.customer?.phone) formData.append('phone', order.customer.phone)
    if (noteText.trim()) formData.append('note', noteText.trim())

    const res = await fetch('/api/orders/payment-proof', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Không thể tải ảnh chuyển khoản. Vui lòng thử lại.')
    }
    setProofData(data.paymentProof)
    setShowUploadForm(false)
    setProofNote('')
    clearSelectedProofFile()
    persistLocalPaymentProof(data.paymentProof)
    return data.paymentProof
  }

  const handleUploadProof = async (e) => {
    e.preventDefault()
    if (!selectedProofFile) {
      setProofError('Vui lòng chọn ảnh chụp màn hình chuyển khoản thành công.')
      return
    }
    setProofError('')
    setSubmitPaymentError('')
    setIsUploadingProof(true)
    try {
      await uploadProofFile(selectedProofFile, proofNote)
    } catch (err) {
      setProofError(err.message || 'Đã có lỗi xảy ra khi tải ảnh lên.')
    } finally {
      setIsUploadingProof(false)
    }
  }

  const handleConfirmQrPayment = async () => {
    setSubmitPaymentError('')
    setProofError('')

    if (!proofData?.imageUrl && !selectedProofFile) {
      setSubmitPaymentError('Vui lòng tải lên ảnh chuyển khoản thành công ở bước trên trước khi bấm Thanh toán.')
      uploadSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setIsSubmittingPayment(true)
    try {
      let latestProof = proofData
      if (selectedProofFile) {
        latestProof = await uploadProofFile(selectedProofFile, proofNote)
      }

      const res = await fetch('/api/orders/submit-qr-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          orderId,
          trackingToken: order?.trackingToken || '',
          phone: order?.customer?.phone || '',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Không thể gửi xác nhận thanh toán. Vui lòng thử lại.')
      }

      if (data.alreadyPaid) {
        useCartStore.getState().clearCart()
        navigate(`/dat-hang-thanh-cong?orderId=${encodeURIComponent(orderId)}`, {
          state: { order },
          replace: true,
        })
        return
      }

      const finalProof = data.paymentProof || latestProof
      const updatedOrder = {
        ...order,
        status: 'AWAITING_PAYMENT',
        paymentStatus: 'PENDING_ADMIN_CONFIRMATION',
        paymentProof: finalProof,
        payment: {
          ...(order?.payment || {}),
          method: 'BANK_TRANSFER',
          status: 'PENDING_ADMIN_CONFIRMATION',
          submittedAt: data.submittedAt || new Date().toISOString(),
          proofImageUrl: finalProof?.imageUrl || order?.payment?.proofImageUrl || null,
          proofUploadedAt: finalProof?.uploadedAt || order?.payment?.proofUploadedAt || null,
          proofNote: finalProof?.note || order?.payment?.proofNote || '',
        },
      }
      applyOrderUpdateLocally(updatedOrder)
      useCartStore.getState().clearCart()

      navigate(`/cho-xac-nhan-thanh-toan?orderId=${encodeURIComponent(orderId)}`, {
        state: { order: updatedOrder },
        replace: true,
      })
    } catch (err) {
      setSubmitPaymentError(err.message || 'Không thể gửi xác nhận thanh toán. Vui lòng thử lại.')
    } finally {
      setIsSubmittingPayment(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1614]">
      <title>Xác Nhận Chuyển Khoản VietQR — QuanNguyenS</title>

      <CartDrawer isOpen={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />
      <Header onCartOpen={() => setCartDrawerOpen(true)} />
      <div className="h-14 md:h-16" />

      <main className="max-w-[760px] mx-auto px-4 sm:px-6 py-10 md:py-16">
        {/* Verification Overlay when confirming */}
        {isVerifying && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white p-8 rounded-[4px] border border-[#E8DFD5] shadow-2xl text-center max-w-sm w-full"
            >
              {verifySuccess ? (
                <div className="space-y-3">
                  <div className="w-14 h-14 bg-[#E8F5E9] text-[#2E7D32] rounded-full flex items-center justify-center mx-auto border border-[#A5D6A7]">
                    <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
                  </div>
                  <h3 className="font-serif text-lg font-bold text-[#1A1614]">
                    Thanh Toán Thành Công!
                  </h3>
                  <p className="text-xs text-[#4A3F38]">
                    Đã vô hiệu hóa mã QR và gửi email xác nhận đặt hàng...
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Loader2 className="w-10 h-10 text-[#631521] animate-spin mx-auto" />
                  <h3 className="font-serif text-lg font-bold text-[#1A1614]">
                    Đang Xác Thực Thanh Toán...
                  </h3>
                  <p className="text-xs text-[#8C7E74]">
                    Đang kiểm tra giao dịch chuyển khoản cho đơn hàng #{orderId}
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="bg-white rounded-[4px] border border-[#E8DFD5] shadow-luxury overflow-hidden"
        >
          {/* Top Decorative Brand Banner */}
          <div className="bg-[#631521] px-6 py-8 text-center text-[#FAF8F5] relative overflow-hidden">
            <div className="absolute inset-0 bg-noise opacity-15" />
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 15 }}
              className="w-16 h-16 bg-[#FAF8F5] text-[#631521] rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-[#D4AF37] shadow-lg relative z-10"
            >
              <QrCode className="w-8 h-8 text-[#631521]" />
            </motion.div>

            <span className="font-sans text-xs font-semibold tracking-[0.3em] text-[#D4AF37] uppercase block mb-1.5 relative z-10">
              CỔNG THANH TOÁN VIETQR NAPAS 24/7
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-wide relative z-10">
              Quét Mã Để Hoàn Tất Đơn Hàng
            </h1>
            <div className="inline-flex items-center gap-2 mt-3 bg-black/25 px-4 py-1.5 rounded-full border border-white/20 relative z-10">
              <p className="font-mono text-xs text-[#FAF8F5] tracking-wider">
                Mã đơn: <strong className="text-[#D4AF37]">{orderId}</strong>
              </p>
              <button
                onClick={() => handleCopy(orderId, 'orderId')}
                className="text-white/80 hover:text-white p-0.5 rounded cursor-pointer"
                title="Sao chép mã đơn"
              >
                {copiedField === 'orderId' ? (
                  <Check className="w-3.5 h-3.5 text-[#A5D6A7]" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-6 sm:p-10 space-y-8">
            {!order || total <= 0 ? (
              /* State: Không tìm thấy dữ liệu đơn hàng */
              <div className="text-center py-8 space-y-4">
                <div className="w-14 h-14 bg-[#FAF5F0] border border-[#E8DFD5] text-[#631521] rounded-full flex items-center justify-center mx-auto">
                  <Package className="w-7 h-7" />
                </div>
                <h2 className="font-serif text-xl font-bold text-[#1A1614]">
                  Không tìm thấy dữ liệu đơn hàng
                </h2>
                <p className="text-xs sm:text-sm font-normal text-[#4A3F38] max-w-md mx-auto leading-relaxed">
                  Không tìm thấy thông tin thanh toán cho mã đơn này trên thiết bị. Vui lòng kiểm tra lại trong mục <strong>Đơn Hàng Đã Đặt</strong> hoặc liên hệ hotline <strong>0973 486 218</strong> để được hỗ trợ kiểm tra trực tiếp.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2 max-w-md mx-auto">
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent('open_orders_drawer'))}
                    className="flex-1 bg-[#631521] text-[#FAF8F5] font-sans font-bold text-xs uppercase tracking-[0.15em] py-3.5 px-6 rounded-[2px] hover:bg-[#4A0D17] border border-[#D4AF37]/30 shadow-sm transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Package className="w-4 h-4 text-[#D4AF37]" />
                    Mục Đơn Hàng Đã Đặt
                  </button>
                  <Link
                    to="/"
                    className="flex-1 bg-white text-[#631521] font-sans font-bold text-xs uppercase tracking-[0.15em] py-3.5 px-6 rounded-[2px] hover:bg-[#FAF5F0] border border-[#631521] transition-all text-center flex items-center justify-center"
                  >
                    Về Trang Chủ
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {/* Greeting & Payment Waiting Note */}
                <div className="text-center max-w-lg mx-auto space-y-2">
                  <p className="font-serif text-lg font-bold text-[#1A1614]">
                    Cảm ơn {customerName} đã lựa chọn QuanNguyenS
                  </p>
                  <p className="text-xs sm:text-sm font-normal text-[#4A3F38] leading-relaxed">
                    Vui lòng quét mã QR bên dưới để chuyển khoản (mã QR đã tự động điền sẵn số tiền và nội dung chuyển khoản), sau đó tải lên ảnh chuyển khoản thành công và bấm <strong>Thanh toán</strong> ở cuối trang để gửi yêu cầu xác nhận.
                  </p>
                </div>

                {/* BOX 1: HƯỚNG DẪN CHUYỂN KHOẢN VIETQR */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#FAF5F0] border-2 border-[#D4AF37]/50 rounded-[4px] p-5 sm:p-6 space-y-4 shadow-sm"
                >
                  <div className="flex items-center justify-between border-b border-[#E8DFD5] pb-3 flex-wrap gap-2">
                    <span className="font-sans text-xs font-bold uppercase tracking-wider text-[#631521] flex items-center gap-1.5">
                      <QrCode className="w-4 h-4 text-[#631521]" />
                      Mã QR Tại Đây
                    </span>
                  </div>

                  {isQrInvalidated ? (
                    /* Trạng thái mã QR đã bị vô hiệu hóa sau khi thanh toán */
                    <div className="p-6 bg-white border border-[#A5D6A7] rounded-[3px] text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center mx-auto">
                        <Lock className="w-6 h-6" />
                      </div>
                      <h4 className="font-serif text-base font-bold text-[#2E7D32]">
                        Mã QR đã được thanh toán và vô hiệu hóa
                      </h4>
                      <p className="text-xs text-[#4A3F38]">
                        Hệ thống đã khóa mã QR này để bảo vệ giao dịch và chống chuyển tiền trùng lặp.
                      </p>
                    </div>
                  ) : paymentPhase === 'CANCELLED' ? (
                    <div className="p-6 bg-white border border-[#EF9A9A] rounded-[4px] text-center space-y-3.5 shadow-xs">
                      <AlertTriangle className="w-10 h-10 text-[#C62828] mx-auto" />
                      <h4 className="font-serif text-base font-bold text-[#C62828]">
                        Đơn hàng #{orderId} đã bị hủy
                      </h4>
                      {order.cancelReason && (
                        <p className="text-xs text-[#4A3F38]">
                          <strong>Lý do:</strong> {order.cancelReason}
                        </p>
                      )}
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                        <button
                          type="button"
                          onClick={handleRestoreCartAndReorder}
                          className="w-full sm:w-auto bg-[#631521] text-white text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-[2px] hover:bg-[#4A0D17] transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                        >
                          <ShoppingBag className="w-4 h-4 text-[#D4AF37]" />
                          <span>Khôi phục sản phẩm & Đặt lại đơn</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col md:flex-row items-center gap-5">
                      {/* QR Image */}
                      <div className="flex flex-col items-center shrink-0">
                        <div className="w-52 h-52 sm:w-56 sm:h-56 bg-white p-2 rounded border border-[#E8DFD5] shadow-xs flex items-center justify-center relative overflow-hidden">
                          <img
                            src={qrUrl}
                            alt="Mã QR Chuyển khoản Vietcombank"
                            className="w-full h-full object-contain aspect-square"
                          />
                        </div>
                      </div>

                      {/* Bank info fields */}
                      <div className="space-y-2 flex-1 w-full text-xs font-sans">
                        <p className="font-serif font-bold text-[#631521] text-xs uppercase">
                          {bankDetails?.bankName || 'Ngân hàng Ngoại Thương Việt Nam (Vietcombank)'}
                        </p>

                        <div className="bg-white p-2.5 rounded-[2px] border border-[#E8DFD5] flex items-center justify-between">
                          <div>
                            <p className="text-[10px] text-[#8C7E74]">Số tài khoản:</p>
                            <p className="font-mono font-bold text-[#631521] text-base leading-tight">
                              {bankDetails?.accountNumber || '1050773506'}
                            </p>
                          </div>
                          <button
                            onClick={() => handleCopy(bankDetails?.accountNumber || '1050773506', 'bankStk')}
                            className="flex items-center gap-1 text-[11px] font-bold text-[#631521] bg-[#FAF8F5] px-2.5 py-1 rounded border border-[#E8DFD5] hover:bg-[#FAF5F0] transition-colors cursor-pointer"
                          >
                            {copiedField === 'bankStk' ? (
                              <>
                                <Check className="w-3 h-3 text-[#2E7D32]" />
                                <span className="text-[#2E7D32]">Đã chép</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Sao chép</span>
                              </>
                            )}
                          </button>
                        </div>

                        <p className="text-[11px] text-[#4A3F38]"><strong>Chủ tài khoản:</strong> {bankDetails?.accountName || 'NGUYEN DUC QUAN'}</p>

                        <div className="bg-white p-2.5 rounded-[2px] border border-[#E8DFD5] flex items-center justify-between">
                          <div>
                            <p className="text-[10px] text-[#8C7E74] flex items-center gap-1.5 flex-wrap">
                              <span>Nội dung chuyển khoản:</span>
                              <span className="text-[#2E7D32] font-semibold text-[10px] bg-[#E8F5E9] px-1.5 py-0.5 rounded-[2px] border border-[#C8E6C9]">(Đã tích hợp sẵn trong mã QR)</span>
                            </p>
                            <p className="font-mono font-bold text-[#631521] text-xs mt-0.5">
                              {transferContent}
                            </p>
                          </div>
                          <button
                            onClick={() => handleCopy(transferContent, 'bankContent')}
                            className="flex items-center gap-1 text-[11px] font-bold text-[#631521] bg-[#FAF8F5] px-2.5 py-1 rounded border border-[#E8DFD5] hover:bg-[#FAF5F0] transition-colors cursor-pointer"
                          >
                            {copiedField === 'bankContent' ? (
                              <>
                                <Check className="w-3 h-3 text-[#2E7D32]" />
                                <span className="text-[#2E7D32]">Đã chép</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Sao chép</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                </motion.div>

                {/* BOX 1b: UPLOAD ẢNH CHUYỂN KHOẢN THÀNH CÔNG ĐỂ CHỦ SHOP ĐỐI SOÁT */}
                {!isQrInvalidated && paymentPhase !== 'CANCELLED' && (
                  <div ref={uploadSectionRef} className="bg-white rounded-[4px] border border-[#E8DFD5] p-5 sm:p-6 space-y-4 shadow-xs">
                    <div className="flex items-center justify-between border-b border-[#E8DFD5] pb-3 flex-wrap gap-2">
                      <span className="font-sans text-xs font-bold uppercase tracking-wider text-[#631521] flex items-center gap-1.5">
                        <Upload className="w-4 h-4 text-[#631521]" />
                        Tải Lên Ảnh Chuyển Khoản Thành Công
                      </span>
                      {proofData?.imageUrl && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Đã gửi ảnh đối soát
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[#4A3F38] leading-relaxed">
                      Sau khi chuyển khoản thành công, vui lòng tải lên ảnh chụp màn hình biên lai giao dịch để chủ shop đối soát dòng tiền và xác nhận đơn nhanh hơn.
                    </p>

                    {proofData?.imageUrl && !showUploadForm ? (
                      <div className="bg-[#E8F5E9]/70 border border-[#A5D6A7] rounded-[3px] p-4 space-y-3">
                        <div className="flex flex-col sm:flex-row items-start gap-4">
                          <a
                            href={proofData.imageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-24 h-28 bg-white rounded-[2px] border border-[#A5D6A7] overflow-hidden shrink-0 hover:opacity-90 transition-opacity"
                            title="Bấm để xem ảnh kích thước đầy đủ"
                          >
                            <img
                              src={proofData.imageUrl}
                              alt="Ảnh chứng từ chuyển khoản đã tải lên"
                              className="w-full h-full object-cover"
                            />
                          </a>
                          <div className="flex-1 space-y-1.5 text-xs">
                            <p className="font-bold text-[#2E7D32] flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 shrink-0" />
                              Đã tiếp nhận ảnh xác nhận chuyển khoản
                            </p>
                            <p className="text-[#4A3F38] leading-relaxed">
                              Chứng từ của bạn đã được chuyển tới bộ phận đối soát của QuanNguyenS.
                            </p>
                            {proofData.uploadedAt && (
                              <p className="text-[11px] text-[#6B5D54]">
                                Thời gian tải lên: {new Date(proofData.uploadedAt).toLocaleString('vi-VN')}
                              </p>
                            )}
                            {proofData.note && (
                              <p className="text-[11px] text-[#4A3F38] bg-white/80 px-2.5 py-1.5 rounded border border-[#C8E6C9]">
                                <strong>Ghi chú:</strong> {proofData.note}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-3 pt-1">
                              <a
                                href={proofData.imageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#631521] hover:underline"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Xem ảnh đầy đủ
                              </a>
                              <button
                                type="button"
                                onClick={() => setShowUploadForm(true)}
                                className="text-[11px] font-semibold text-[#4A3F38] underline hover:text-[#631521] cursor-pointer"
                              >
                                Tải lên ảnh khác
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handleUploadProof} className="space-y-3">
                        <input
                          ref={proofInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(e) => handleSelectProofFile(e.target.files?.[0] || null)}
                          className="hidden"
                          id="payment-proof-file-input"
                        />

                        {!selectedProofFile ? (
                          <label
                            htmlFor="payment-proof-file-input"
                            onDragOver={(e) => {
                              e.preventDefault()
                              setIsDraggingProof(true)
                            }}
                            onDragLeave={() => setIsDraggingProof(false)}
                            onDrop={(e) => {
                              e.preventDefault()
                              setIsDraggingProof(false)
                              handleSelectProofFile(e.dataTransfer.files?.[0] || null)
                            }}
                            className={`flex flex-col items-center justify-center gap-2 p-5 border-2 border-dashed rounded-[3px] cursor-pointer transition-colors text-center ${
                              isDraggingProof
                                ? 'border-[#631521] bg-[#FAF5F0]'
                                : 'border-[#D9CFC4] bg-[#FAF8F5] hover:border-[#631521]/70 hover:bg-[#FAF5F0]'
                            }`}
                          >
                            <div className="w-10 h-10 rounded-full bg-white border border-[#E8DFD5] flex items-center justify-center text-[#631521]">
                              <ImagePlus className="w-5 h-5" />
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-xs font-semibold text-[#1A1614]">
                                Bấm để chọn ảnh hoặc kéo thả ảnh biên lai vào đây
                              </p>
                              <p className="text-[11px] text-[#8C7E74]">
                                Hỗ trợ JPG, PNG, WebP (tối đa 5MB)
                              </p>
                            </div>
                          </label>
                        ) : (
                          <div className="flex items-start gap-3.5 p-3 bg-[#FAF8F5] border border-[#E8DFD5] rounded-[3px]">
                            <img
                              src={proofPreviewUrl}
                              alt="Xem trước ảnh chuyển khoản"
                              className="w-20 h-24 object-cover rounded-[2px] border border-[#D9CFC4] bg-white shrink-0"
                            />
                            <div className="flex-1 min-w-0 space-y-1">
                              <p className="text-xs font-semibold text-[#1A1614] truncate">
                                {selectedProofFile.name}
                              </p>
                              <p className="text-[11px] text-[#8C7E74]">
                                {(selectedProofFile.size / 1024).toFixed(0)} KB
                              </p>
                              <div className="flex items-center gap-3 pt-1">
                                <label
                                  htmlFor="payment-proof-file-input"
                                  className="text-[11px] font-semibold text-[#631521] hover:underline cursor-pointer"
                                >
                                  Chọn ảnh khác
                                </label>
                                <button
                                  type="button"
                                  onClick={clearSelectedProofFile}
                                  className="inline-flex items-center gap-1 text-[11px] text-[#8C7E74] hover:text-[#C62828] cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                  Xóa
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        <div>
                          <label htmlFor="payment-proof-note" className="block text-[11px] font-semibold text-[#4A3F38] mb-1">
                            Ghi chú giao dịch (không bắt buộc)
                          </label>
                          <input
                            id="payment-proof-note"
                            type="text"
                            maxLength={200}
                            value={proofNote}
                            onChange={(e) => setProofNote(e.target.value)}
                            placeholder="Ví dụ: Đã chuyển từ Vietcombank lúc 16:30, mã tham chiếu..."
                            className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-[#E8DFD5] rounded-[2px] focus:bg-white focus:outline-none focus:border-[#631521]"
                          />
                        </div>

                        {proofError && (
                          <p className="text-xs text-[#C62828] bg-[#FFEBEE] border border-[#FFCDD2] px-3 py-2 rounded-[2px]">
                            {proofError}
                          </p>
                        )}

                        <div className="flex items-center gap-2.5">
                          <button
                            type="submit"
                            disabled={isUploadingProof || !selectedProofFile}
                            className="flex-1 bg-[#631521] text-[#FAF8F5] font-sans font-bold text-xs uppercase tracking-[0.15em] py-3 px-4 rounded-[2px] hover:bg-[#4A0D17] border border-[#D4AF37]/30 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isUploadingProof ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
                                <span>Đang tải ảnh lên...</span>
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4 text-[#D4AF37]" />
                                <span>Gửi Ảnh Chuyển Khoản</span>
                              </>
                            )}
                          </button>
                          {proofData?.imageUrl && (
                            <button
                              type="button"
                              onClick={() => {
                                clearSelectedProofFile()
                                setShowUploadForm(false)
                              }}
                              className="px-4 py-3 text-xs font-semibold text-[#4A3F38] bg-[#FAF8F5] border border-[#E8DFD5] rounded-[2px] hover:bg-[#FAF5F0] cursor-pointer"
                            >
                              Hủy
                            </button>
                          )}
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* BOX 2: XÁC NHẬN ĐƠN HÀNG */}
                <div className="bg-[#FAF5F0] rounded-[3px] border border-[#E8DFD5] p-5 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#E8DFD5] pb-3">
                    <span className="font-sans text-xs font-bold uppercase tracking-wider text-[#631521]">
                      Xác Nhận Đơn Hàng
                    </span>
                    <span className="text-xs font-mono text-[#8C7E74]">
                      {order.orderDateVN || 'Vừa xong'}
                    </span>
                  </div>

                  {/* Items List */}
                  {order.items && order.items.length > 0 && (
                    <div className="space-y-3">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-start text-xs sm:text-sm">
                          <div className="pr-4">
                            <p className="font-bold text-[#1A1614]">{item.productName}</p>
                            <p className="text-xs text-[#8C7E74]">{item.variant} · SL: x{item.quantity}</p>
                          </div>
                          <span className="font-serif font-bold text-[#631521] shrink-0">
                            {formatVND(item.totalPrice || item.unitPrice * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Shipping & Discount Rows */}
                  {Number(order?.shippingFee || 0) > 0 && (
                    <div className="border-t border-[#E8DFD5] pt-2 flex justify-between items-center text-xs text-[#4A3F38]">
                      <span>Phí vận chuyển{order?.deliveryOption === 'SPLIT_SHIPPING' ? ' (gồm phụ phí tách giao)' : ''}</span>
                      <span className="font-medium">{formatVND(order.shippingFee)}</span>
                    </div>
                  )}

                  {discount > 0 && (
                    <div className="border-t border-[#E8DFD5] pt-2 flex justify-between items-center text-xs text-[#2E7D32]">
                      <span className="font-medium flex items-center gap-1">
                        <Gift className="w-3.5 h-3.5" />
                        {order?.voucherDiscount > 0 || order?.tierDiscountAmount > 0
                          ? `Tổng giảm giá ưu đãi${order?.voucherCode ? ` (${order.voucherCode})` : ''}`
                          : 'Ưu đãi Chuyển khoản VietQR (10%)'}
                      </span>
                      <span className="font-serif font-bold">
                        -{formatVND(discount)}
                      </span>
                    </div>
                  )}

                  {/* Total Row */}
                  <div className="border-t border-[#E8DFD5] pt-3 flex justify-between items-baseline">
                    <span className="font-sans text-xs font-bold uppercase text-[#4A3F38]">
                      Tổng giá trị đơn hàng
                    </span>
                    <span className="font-serif text-xl font-bold text-[#631521]">
                      {formatVND(total)}
                    </span>
                  </div>

                  {/* Shipping info */}
                  {order.shipping && (
                    <div className="border-t border-[#E8DFD5] pt-3 text-xs text-[#4A3F38] space-y-1">
                      <p><strong>Người nhận:</strong> {order.customer?.fullName} — {order.customer?.phone}</p>
                      <p><strong>Địa chỉ nhận hàng:</strong> {order.shipping?.fullAddress}</p>
                      <p><strong>Phương thức TT:</strong> {order.payment?.methodLabel || 'Chuyển khoản VietQR (Giảm 10%)'}</p>
                    </div>
                  )}
                </div>

                {/* BOX 3: Thời Gian Giao Hàng Dự Kiến */}
                <div className="flex items-start gap-3.5 bg-white p-4 rounded-[3px] border border-[#E8DFD5] text-xs font-sans text-[#4A3F38]">
                  <Truck className="w-5 h-5 text-[#631521] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-[#1A1614] mb-0.5">Thời gian giao hàng dự kiến:</p>
                    <p className="font-normal leading-relaxed">
                      Từ <strong>2–4 ngày làm việc</strong>. Bộ phận vận hành sẽ liên hệ qua điện thoại trước khi giao hàng.
                    </p>
                  </div>
                </div>

                {/* KHUNG THANH TOÁN NGAY PHÍA DƯỚI THỜI GIAN GIAO HÀNG DỰ KIẾN */}
                {!isQrInvalidated && paymentPhase !== 'CANCELLED' && (
                  <div className="bg-[#FAF5F0] border-2 border-[#D4AF37]/60 rounded-[4px] p-4 sm:p-5 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between flex-wrap gap-2 text-[11px] font-sans text-[#4A3F38]">
                      <span>
                        <strong>Bước 1:</strong> Quét QR chuyển khoản → <strong>Bước 2:</strong> Tải ảnh CK → <strong>Bước 3:</strong> Bấm Thanh toán
                      </span>
                      {(proofData?.imageUrl || selectedProofFile) ? (
                        <span className="text-[#2E7D32] font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Đã có ảnh chuyển khoản
                        </span>
                      ) : (
                        <span className="text-[#B45309] font-semibold">
                          Cần tải ảnh CK ở bước trên
                        </span>
                      )}
                    </div>

                    {submitPaymentError && (
                      <p className="text-xs text-[#C62828] bg-[#FFEBEE] border border-[#FFCDD2] px-3 py-2 rounded-[2px]">
                        {submitPaymentError}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={handleConfirmQrPayment}
                      disabled={isSubmittingPayment || isUploadingProof}
                      className="w-full bg-[#631521] text-[#FAF8F5] font-sans font-bold text-xs sm:text-sm uppercase tracking-[0.18em] py-4 px-5 rounded-[2px] hover:bg-[#4A0D17] border border-[#D4AF37]/40 shadow-luxury transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isSubmittingPayment ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
                          <span>Đang gửi yêu cầu xác nhận...</span>
                        </>
                      ) : (
                        <>
                          <span>Thanh toán</span>
                          <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </main>

      <Section12Footer />
    </div>
  )
}
