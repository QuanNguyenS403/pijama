// src/pages/admin/AdminOrdersPage.jsx
// Trang danh sách đơn hàng cho chủ shop
// Route: /admin/orders

import { useState, useEffect, useCallback } from 'react'

// ── Status config ─────────────────────────────────
const STATUS_CONFIG = {
  PENDING:    { label: 'Chờ xác nhận', color: '#F59E0B', bg: '#FEF3C7', emoji: '🟡' },
  CONFIRMED:  { label: 'Đã xác nhận',  color: '#2563EB', bg: '#DBEAFE', emoji: '🔵' },
  PROCESSING: { label: 'Đang đóng gói',color: '#7C3AED', bg: '#EDE9FE', emoji: '🟣' },
  SHIPPED:    { label: 'Đang giao',    color: '#EA580C', bg: '#FFEDD5', emoji: '🟠' },
  DELIVERED:  { label: 'Đã giao',      color: '#16A34A', bg: '#DCFCE7', emoji: '🟢' },
  CANCELLED:  { label: 'Đã hủy',       color: '#6B7280', bg: '#F3F4F6', emoji: '⚫' },
}

const PAYMENT_LABELS = {
  COD:           'COD',
  VNPAY:         'VNPAY',
  MOMO:          'MoMo',
  BANK_TRANSFER: 'Chuyển khoản',
}

const vnd = (n) => Number(n).toLocaleString('vi-VN') + 'đ'

export default function AdminOrdersPage() {
  const [orders, setOrders]         = useState([])
  const [total, setTotal]           = useState(0)
  const [loading, setLoading]       = useState(true)
  const [page, setPage]             = useState(1)
  const [filters, setFilters]       = useState({
    status: '', payment: '', search: '', from: '', to: '',
  })
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [actionModal, setActionModal]     = useState(null) // { type, orderId }
  const [actionInput, setActionInput]     = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast]                 = useState(null)

  // ── Fetch orders ────────────────────────────────
  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const q = new URLSearchParams({
        page,
        ...(filters.status  && { status:  filters.status  }),
        ...(filters.payment && { payment: filters.payment }),
        ...(filters.search  && { search:  filters.search  }),
        ...(filters.from    && { from:    filters.from    }),
        ...(filters.to      && { to:      filters.to      }),
      })
      const res  = await fetch(`/api/admin/orders?${q}`)
      const data = await res.json()
      setOrders(data.orders || [])
      setTotal(data.total   || 0)
    } catch (err) {
      console.error('Error fetching orders:', err)
    } finally {
      setLoading(false)
    }
  }, [page, filters])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  // ── Gọi action API ──────────────────────────────
  const callAction = async (orderId, action, extra = {}) => {
    setActionLoading(true)
    try {
      const res  = await fetch(`/api/admin/orders/${orderId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action, ...extra }),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      showToast(data.message || 'Thao tác thành công', 'success')
      setActionModal(null)
      setActionInput('')
      fetchOrders()

      // Cập nhật selectedOrder nếu đang xem
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(data.order)
      }
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  // ── Render status badge ─────────────────────────
  const StatusBadge = ({ status }) => {
    const cfg = STATUS_CONFIG[status] || {}
    return (
      <span style={{
        background:  cfg.bg,
        color:       cfg.color,
        fontSize:    '11px',
        fontWeight:  600,
        padding:     '3px 10px',
        letterSpacing: '0.5px',
        whiteSpace:  'nowrap',
      }}>
        {cfg.emoji} {cfg.label}
      </span>
    )
  }

  // ── Action buttons cho từng trạng thái ─────────
  const ActionButtons = ({ order }) => {
    const { id, status } = order
    return (
      <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
        {status === 'PENDING' && (
          <>
            <ActionBtn
              label="✅ Xác nhận"
              color="#2563EB"
              onClick={() => setActionModal({ type:'CONFIRM', orderId:id })}
            />
            <ActionBtn
              label="❌ Hủy đơn"
              color="#6B7280"
              onClick={() => setActionModal({ type:'CANCEL', orderId:id })}
            />
          </>
        )}
        {status === 'CONFIRMED' && (
          <>
            <ActionBtn
              label="📦 Đóng gói"
              color="#7C3AED"
              onClick={() => callAction(id, 'PROCESSING')}
            />
            <ActionBtn
              label="🚚 Giao shipper"
              color="#EA580C"
              onClick={() => setActionModal({ type:'SHIP', orderId:id })}
            />
            <ActionBtn
              label="❌ Hủy đơn"
              color="#6B7280"
              onClick={() => setActionModal({ type:'CANCEL', orderId:id })}
            />
          </>
        )}
        {status === 'PROCESSING' && (
          <>
            <ActionBtn
              label="🚚 Giao shipper"
              color="#EA580C"
              onClick={() => setActionModal({ type:'SHIP', orderId:id })}
            />
            <ActionBtn
              label="❌ Hủy đơn"
              color="#6B7280"
              onClick={() => setActionModal({ type:'CANCEL', orderId:id })}
            />
          </>
        )}
        {status === 'SHIPPED' && (
          <ActionBtn
            label="✅ Đã giao xong"
            color="#16A34A"
            onClick={() => callAction(id, 'DELIVER')}
          />
        )}
      </div>
    )
  }

  const ActionBtn = ({ label, color, onClick }) => (
    <button
      onClick={onClick}
      style={{
        background:    color,
        color:         '#fff',
        border:        'none',
        padding:       '6px 12px',
        fontSize:      '11px',
        fontWeight:    600,
        cursor:        'pointer',
        letterSpacing: '0.5px',
        fontFamily:    'DM Sans, Arial, sans-serif',
      }}
    >
      {label}
    </button>
  )

  return (
    <div style={{ padding:'24px', fontFamily:'DM Sans, Arial, sans-serif', color:'#3A3535', minHeight:'100vh', background:'#FAF8F5' }}>

      {/* ── HEADER ──────────────────────────── */}
      <div style={{ marginBottom:'24px' }}>
        <div style={{ fontSize:'10px', letterSpacing:'2px', textTransform:'uppercase', color:'#7A6E6E' }}>
          QUẢN LÝ
        </div>
        <h1 style={{ fontFamily:'Georgia,serif', fontSize:'28px', fontWeight:600, margin:'4px 0 0' }}>
          Đơn Hàng
        </h1>
        <p style={{ color:'#7A6E6E', fontSize:'13px', marginTop:'4px' }}>
          Tổng: <strong>{total}</strong> đơn
        </p>
      </div>

      {/* ── BỘ LỌC ──────────────────────────── */}
      <div style={{
        display:'flex', gap:'10px', flexWrap:'wrap',
        background:'#F5F0E8', padding:'16px', marginBottom:'20px',
      }}>
        <input
          placeholder="🔍 Tìm tên, SĐT, email, mã đơn..."
          value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          style={inputStyle}
        />
        <select
          value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          style={inputStyle}
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.emoji} {v.label}</option>
          ))}
        </select>
        <select
          value={filters.payment}
          onChange={e => setFilters(f => ({ ...f, payment: e.target.value }))}
          style={inputStyle}
        >
          <option value="">Tất cả TT</option>
          {Object.entries(PAYMENT_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <input
          type="date" placeholder="Từ ngày"
          value={filters.from}
          onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
          style={{ ...inputStyle, width:'140px' }}
        />
        <input
          type="date" placeholder="Đến ngày"
          value={filters.to}
          onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}
          style={{ ...inputStyle, width:'140px' }}
        />
        <button
          onClick={() => { setFilters({ status:'', payment:'', search:'', from:'', to:'' }); setPage(1) }}
          style={{ ...btnStyle, background:'#7A6E6E' }}
        >
          Xóa lọc
        </button>
      </div>

      {/* ── BẢNG ĐƠN HÀNG ────────────────────── */}
      {loading ? (
        <div style={{ textAlign:'center', padding:'48px', color:'#7A6E6E' }}>
          Đang tải...
        </div>
      ) : (
        <div style={{ overflowX:'auto', background:'#fff', border:'1px solid #D9CFC4' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
            <thead>
              <tr style={{ background:'#7B2D3E', color:'#F5F0E8' }}>
                {['Mã đơn','Khách hàng','Sản phẩm','Tổng tiền','Thanh toán','Trạng thái','Ngày đặt','Thao tác'].map(h => (
                  <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontSize:'10px', letterSpacing:'1px', textTransform:'uppercase', fontWeight:500, whiteSpace:'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding:'48px', textAlign:'center', color:'#7A6E6E' }}>
                    Không có đơn hàng nào
                  </td>
                </tr>
              )}
              {orders.map((order, i) => (
                <tr
                  key={order.id}
                  style={{ background: i % 2 === 0 ? '#fff' : '#FAF7F3' }}
                >
                  {/* Mã đơn */}
                  <td style={{ padding:'12px', fontWeight:600, color:'#7B2D3E', whiteSpace:'nowrap' }}>
                    <button
                      onClick={() => setSelectedOrder(order)}
                      style={{ background:'none', border:'none', color:'#7B2D3E', fontWeight:600, cursor:'pointer', fontSize:'13px', textDecoration:'underline' }}
                    >
                      {order.orderNumber}
                    </button>
                  </td>

                  {/* Khách hàng */}
                  <td style={{ padding:'12px' }}>
                    <div style={{ fontWeight:500 }}>{order.customerName}</div>
                    <div style={{ color:'#7A6E6E', fontSize:'12px' }}>{order.customerPhone}</div>
                  </td>

                  {/* Sản phẩm */}
                  <td style={{ padding:'12px', maxWidth:'200px' }}>
                    {order.items?.map(item => (
                      <div key={item.id} style={{ fontSize:'12px', marginBottom:'2px' }}>
                        {item.productName || item.product?.name} · {item.colorLabel || item.variant?.colorLabel} / {item.size || item.variant?.size} × {item.quantity}
                      </div>
                    ))}
                  </td>

                  {/* Tổng tiền */}
                  <td style={{ padding:'12px', fontFamily:'Georgia,serif', color:'#7B2D3E', fontWeight:'bold', whiteSpace:'nowrap' }}>
                    {vnd(order.total)}
                  </td>

                  {/* Thanh toán */}
                  <td style={{ padding:'12px', fontSize:'12px', whiteSpace:'nowrap' }}>
                    <div>{PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}</div>
                    <div style={{ color: order.paymentStatus === 'PAID' ? '#16A34A' : '#F59E0B', fontWeight:500 }}>
                      {order.paymentStatus === 'PAID' ? '✅ Đã TT' : '⏳ Chưa TT'}
                    </div>
                  </td>

                  {/* Trạng thái */}
                  <td style={{ padding:'12px' }}>
                    <StatusBadge status={order.status} />
                  </td>

                  {/* Ngày đặt */}
                  <td style={{ padding:'12px', color:'#7A6E6E', fontSize:'12px', whiteSpace:'nowrap' }}>
                    {new Date(order.createdAt).toLocaleString('vi-VN', {
                      day:'2-digit', month:'2-digit', year:'numeric',
                      hour:'2-digit', minute:'2-digit',
                    })}
                  </td>

                  {/* Thao tác */}
                  <td style={{ padding:'12px' }}>
                    <ActionButtons order={order} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── PHÂN TRANG ───────────────────────── */}
      <div style={{ display:'flex', justifyContent:'center', gap:'8px', marginTop:'24px' }}>
        <button
          disabled={page === 1}
          onClick={() => setPage(p => p - 1)}
          style={{ ...btnStyle, opacity: page === 1 ? 0.4 : 1 }}
        >← Trước</button>
        <span style={{ padding:'8px 16px', fontSize:'13px', color:'#7A6E6E' }}>
          Trang {page}
        </span>
        <button
          disabled={page * 20 >= total}
          onClick={() => setPage(p => p + 1)}
          style={{ ...btnStyle, opacity: page * 20 >= total ? 0.4 : 1 }}
        >Sau →</button>
      </div>

      {/* ── MODAL ACTION ─────────────────────── */}
      {actionModal && (
        <div style={{
          position:'fixed', inset:0,
          background:'rgba(0,0,0,0.6)',
          display:'flex', alignItems:'center', justifyContent:'center',
          zIndex:1000,
        }}>
          <div style={{
            background:'#fff', padding:'32px', width:'440px',
            fontFamily:'DM Sans, Arial, sans-serif',
            boxShadow:'0 20px 40px rgba(0,0,0,0.2)',
          }}>
            {/* CONFIRM modal */}
            {actionModal.type === 'CONFIRM' && (
              <>
                <h2 style={modalTitle}>✅ Xác nhận đơn hàng</h2>
                <p style={modalDesc}>Đơn sẽ chuyển sang trạng thái "Đã xác nhận". Email thông báo sẽ được gửi đến khách hàng ngay lập tức.</p>
                <textarea
                  placeholder="Ghi chú nội bộ (không bắt buộc)"
                  value={actionInput}
                  onChange={e => setActionInput(e.target.value)}
                  rows={3} style={textareaStyle}
                />
                <div style={modalActions}>
                  <button onClick={() => callAction(actionModal.orderId, 'CONFIRM', { note: actionInput })}
                    disabled={actionLoading} style={{ ...btnStyle, background:'#2563EB' }}>
                    {actionLoading ? 'Đang xử lý...' : '✅ Xác nhận đơn'}
                  </button>
                  <button onClick={() => setActionModal(null)} style={{ ...btnStyle, background:'#6B7280' }}>
                    Hủy
                  </button>
                </div>
              </>
            )}

            {/* SHIP modal */}
            {actionModal.type === 'SHIP' && (
              <>
                <h2 style={modalTitle}>🚚 Giao cho shipper</h2>
                <p style={modalDesc}>Nhập mã vận đơn nếu có. Email có tracking sẽ được gửi cho khách hàng.</p>
                <input
                  placeholder="Mã vận đơn (tracking number)"
                  value={actionInput}
                  onChange={e => setActionInput(e.target.value)}
                  style={{ ...inputStyle, width:'100%', marginBottom:'12px', display:'block' }}
                />
                <div style={modalActions}>
                  <button
                    onClick={() => callAction(actionModal.orderId, 'SHIP', { trackingNumber: actionInput })}
                    disabled={actionLoading}
                    style={{ ...btnStyle, background:'#EA580C' }}
                  >
                    {actionLoading ? 'Đang xử lý...' : '🚚 Xác nhận giao hàng'}
                  </button>
                  <button onClick={() => setActionModal(null)} style={{ ...btnStyle, background:'#6B7280' }}>
                    Hủy
                  </button>
                </div>
              </>
            )}

            {/* CANCEL modal */}
            {actionModal.type === 'CANCEL' && (
              <>
                <h2 style={modalTitle}>❌ Hủy đơn hàng</h2>
                <p style={modalDesc}>
                  Tồn kho sẽ được hoàn trả tự động. Email hủy đơn (kèm lý do) sẽ gửi đến khách hàng.
                  Nếu khách đã thanh toán, hướng dẫn hoàn tiền sẽ có trong email.
                </p>
                <textarea
                  placeholder="Lý do hủy đơn * (bắt buộc — khách hàng sẽ thấy lý do này)"
                  value={actionInput}
                  onChange={e => setActionInput(e.target.value)}
                  rows={4} style={{ ...textareaStyle, borderColor: '#EF4444' }}
                />
                <div style={modalActions}>
                  <button
                    onClick={() => callAction(actionModal.orderId, 'CANCEL', { reason: actionInput })}
                    disabled={actionLoading || actionInput.trim().length < 5}
                    style={{
                      ...btnStyle, background:'#EF4444',
                      opacity: actionInput.trim().length < 5 ? 0.5 : 1,
                    }}
                  >
                    {actionLoading ? 'Đang xử lý...' : '❌ Xác nhận hủy đơn'}
                  </button>
                  <button onClick={() => setActionModal(null)} style={{ ...btnStyle, background:'#6B7280' }}>
                    Không hủy
                  </button>
                </div>
                {actionInput.trim().length < 5 && actionInput.length > 0 && (
                  <p style={{ color:'#EF4444', fontSize:'12px', marginTop:'8px' }}>
                    Vui lòng nhập lý do tối thiểu 5 ký tự
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── TOAST NOTIFICATION ───────────────── */}
      {toast && (
        <div style={{
          position:'fixed', top:'20px', right:'20px',
          background: toast.type === 'success' ? '#1F2937' : '#EF4444',
          color:'#fff', padding:'14px 20px',
          fontSize:'13px', zIndex:9999,
          maxWidth:'360px',
          boxShadow:'0 4px 20px rgba(0,0,0,0.15)',
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}

// ── Styles ─────────────────────────────────────────
const inputStyle = {
  padding:'8px 12px', fontSize:'13px',
  border:'1px solid #D9CFC4', outline:'none',
  fontFamily:'DM Sans, Arial, sans-serif',
  minWidth:'160px',
}
const btnStyle = {
  background:'#7B2D3E', color:'#fff',
  border:'none', padding:'8px 16px',
  fontSize:'12px', fontWeight:500,
  letterSpacing:'0.5px', cursor:'pointer',
  fontFamily:'DM Sans, Arial, sans-serif',
  textTransform:'uppercase',
}
const modalTitle    = { fontFamily:'Georgia,serif', fontSize:'20px', marginBottom:'10px' }
const modalDesc     = { fontSize:'13px', color:'#5A5050', lineHeight:1.7, marginBottom:'16px' }
const textareaStyle = { width:'100%', padding:'10px 12px', fontSize:'13px', border:'1px solid #D9CFC4', resize:'vertical', fontFamily:'DM Sans, Arial, sans-serif', marginBottom:'16px' }
const modalActions  = { display:'flex', gap:'10px' }
