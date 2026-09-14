import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircle2, AlertCircle, Loader2, Home } from 'lucide-react'
import Header from '../components/layout/Header'
import Section12Footer from '../components/sections/Section12Footer'

export default function UnsubscribePage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!token) {
      setLoading(false)
      setError('Thiếu mã token hủy đăng ký trong liên kết.')
      return
    }

    fetch('/api/auth/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSuccess(true)
          setMessage(data.message || 'Đã hủy nhận email marketing thành công.')
        } else {
          setError(data.error || 'Liên kết hủy đăng ký không hợp lệ hoặc đã hết hạn.')
        }
      })
      .catch(() => {
        setError('Không thể kết nối đến máy chủ để xử lý yêu cầu.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [token])

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1614] flex flex-col font-sans">
      <title>Hủy Nhận Email Marketing — QuanNguyenS</title>
      <Header />

      <div className="h-16 md:h-20" />

      <main className="max-w-xl mx-auto px-4 py-16 flex-1 w-full flex items-center justify-center">
        <div className="bg-white p-8 sm:p-10 rounded-[4px] border border-[#E8DFD5] shadow-sm text-center w-full">
          {loading ? (
            <div className="py-8 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#631521]" />
              <p className="text-xs text-[#8C7E74]">Đang xử lý yêu cầu hủy nhận thư...</p>
            </div>
          ) : success ? (
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-full bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <h1 className="font-serif text-2xl font-bold text-[#1A1614]">
                Hủy Đăng Ký Thành Công
              </h1>

              <p className="text-xs text-[#4A3F38] leading-relaxed">
                {message}
              </p>

              <div className="p-3 bg-[#FAF8F5] border border-[#E8DFD5] rounded-[2px] text-[11px] text-[#8C7E74]">
                ℹ️ Bạn vẫn sẽ nhận được các email giao dịch bắt buộc như hóa đơn, mã QR thanh toán hoặc trạng thái đơn hàng khi mua sắm.
              </div>

              <div className="pt-4">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 bg-[#631521] hover:bg-[#4A0D17] text-white text-xs font-bold uppercase tracking-wider py-2.5 px-6 rounded-[2px] transition-colors"
                >
                  <Home className="w-4 h-4" />
                  <span>Quay về Trang Chủ</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-full bg-[#631521]/10 text-[#631521] flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8" />
              </div>

              <h1 className="font-serif text-xl font-bold text-[#1A1614]">
                Yêu Cầu Không Hợp Lệ
              </h1>

              <p className="text-xs text-[#631521]">
                {error}
              </p>

              <p className="text-xs text-[#8C7E74]">
                Nếu cần hỗ trợ thêm, vui lòng liên hệ hotline 0981 753 082.
              </p>

              <div className="pt-4">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 bg-[#631521] hover:bg-[#4A0D17] text-white text-xs font-bold uppercase tracking-wider py-2.5 px-6 rounded-[2px] transition-colors"
                >
                  <Home className="w-4 h-4" />
                  <span>Quay về Trang Chủ</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      <Section12Footer />
    </div>
  )
}
