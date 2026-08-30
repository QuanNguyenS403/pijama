import { useState, useEffect } from 'react'

const ADMIN_SESSION_KEY = 'qns_admin_session'

export default function AdminLoginGate({ children }) {
  const [isAuthed, setIsAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const session = sessionStorage.getItem(ADMIN_SESSION_KEY)
    if (session === 'true') setIsAuthed(true)
    setChecking(false)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const cleanPassword = (password || '').trim()
    if (!cleanPassword) {
      setError('Vui lòng nhập mật khẩu quản trị')
      return
    }
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: cleanPassword }),
      })
      const data = await res.json()
      if (data.success) {
        sessionStorage.setItem(ADMIN_SESSION_KEY, 'true')
        setIsAuthed(true)
      } else {
        setError(data.error || 'Sai mật khẩu quản trị')
      }
    } catch {
      setError('Không thể kết nối máy chủ')
    }
  }

  if (checking) return null
  if (isAuthed) return children

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#2C201A',
      fontFamily: 'Inter, Arial, sans-serif',
      padding: '20px',
      color: '#1A1614',
    }}>
      <form onSubmit={handleSubmit} style={{
        background: '#FAF8F5', padding: '40px', width: '100%', maxWidth: '360px',
        border: '1px solid #D4AF37', boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
        borderRadius: '4px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <img
            src="/images/logo.jpg"
            alt="QuanNguyenS Logo"
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              border: '2px solid #D4AF37',
              objectFit: 'cover',
              margin: '0 auto',
              boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
            }}
          />
        </div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '22px', marginBottom: '6px', color: '#631521', fontWeight: 'bold', textAlign: 'center' }}>
          QuanNguyenS Admin
        </h1>
        <p style={{ fontSize: '13px', color: '#8C7E74', marginBottom: '24px', lineHeight: '1.5', textAlign: 'center' }}>
          Nhập mật khẩu quản trị để truy cập trang quản lý đơn hàng
        </p>

        <div style={{ position: 'relative', marginBottom: '12px' }}>
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mật khẩu quản trị"
            autoFocus
            style={{
              width: '100%',
              padding: '12px 42px 12px 12px',
              border: '1px solid #D9CFC4',
              fontSize: '15px',
              borderRadius: '2px',
              outline: 'none',
              boxSizing: 'border-box',
              color: '#000000',
              backgroundColor: '#FFFFFF',
              fontFamily: 'Inter, Arial, sans-serif',
              fontWeight: 600,
              letterSpacing: showPassword ? 'normal' : '2px',
            }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
              color: '#7A6E6E',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>

        {error && (
          <p style={{ color: '#EF4444', fontSize: '12px', marginBottom: '14px', fontWeight: 500 }}>
            ⚠️ {error}
          </p>
        )}

        <button type="submit" style={{
          width: '100%', padding: '14px', background: '#631521', color: '#FAF8F5',
          border: 'none', fontWeight: 600, textTransform: 'uppercase',
          letterSpacing: '1px', fontSize: '12px', cursor: 'pointer',
          borderRadius: '2px', transition: 'background 0.2s ease',
        }}>
          Đăng nhập quản trị
        </button>
      </form>
    </div>
  )
}
