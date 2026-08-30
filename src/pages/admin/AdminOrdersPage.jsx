// src/pages/admin/AdminOrdersPage.jsx
// Trang danh sách đơn hàng cho chủ shop
// Route: /admin/orders

import { useState, useEffect, useCallback } from 'react'
import { broadcastOrderUpdateClient } from '../../lib/orderSync'

// ── Status config ─────────────────────────────────
const STATUS_CONFIG = {
  PENDING:          { label: 'Chờ xác nhận', color: '#F59E0B', bg: '#FEF3C7', emoji: '🟡' },
  AWAITING_PAYMENT: { label: 'Chờ thanh toán', color: '#3B82F6', bg: '#DBEAFE', emoji: '⏳' },
  CONFIRMED:        { label: 'Đã xác nhận',  color: '#2563EB', bg: '#DBEAFE', emoji: '🔵' },
  PROCESSING:       { label: 'Đang đóng gói',color: '#7C3AED', bg: '#EDE9FE', emoji: '🟣' },
  SHIPPED:          { label: 'Đang giao',    color: '#EA580C', bg: '#FFEDD5', emoji: '🟠' },
  DELIVERED:        { label: 'Đã giao',      color: '#16A34A', bg: '#DCFCE7', emoji: '🟢' },
  CANCELLED:        { label: 'Đã hủy',       color: '#6B7280', bg: '#F3F4F6', emoji: '⚫' },
}

const PAYMENT_LABELS = {
  COD:           'COD (Tiền mặt)',
  BANK_TRANSFER: 'Chuyển khoản VietQR',
}

const vnd = (n) => Number(n || 0).toLocaleString('vi-VN') + 'đ'

export default function AdminOrdersPage() {
  const [orders, setOrders]               = useState([])
  const [total, setTotal]                 = useState(0)
  const [loading, setLoading]             = useState(true)
  const [isRefreshing, setIsRefreshing]   = useState(false)
  const [lastUpdated, setLastUpdated]     = useState(() => new Date().toLocaleTimeString('vi-VN'))
  const [fetchError, setFetchError]       = useState(null)
  const [page, setPage]                   = useState(1)
  const [filters, setFilters]             = useState({
    status: '', payment: '', search: '', date: '',
  })
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [actionModal, setActionModal]     = useState(null) // { type, orderId }
  const [actionInput, setActionInput]     = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast]                 = useState(null)

  // ── Fetch orders ────────────────────────────────
  const fetchOrders = useCallback(async (isManual = false) => {
    if (isManual) {
      setIsRefreshing(true)
    } else if (orders.length === 0) {
      setLoading(true)
    }
    setFetchError(null)
    try {
      const q = new URLSearchParams({
        page: String(page),
        ...(filters.status  && { status:  filters.status  }),
        ...(filters.payment && { payment: filters.payment }),
        ...(filters.search  && { search:  filters.search  }),
        ...(filters.date    && { date:    filters.date    }),
      })
      const res = await fetch(`/api/admin/orders?${q}`)
      if (!res.ok) {
        throw new Error(`Lỗi kết nối máy chủ (${res.status})`)
      }
      const data = await res.json()
      setOrders(data.orders || [])
      setTotal(data.total   || 0)
      setLastUpdated(new Date().toLocaleTimeString('vi-VN'))
    } catch (err) {
      console.error('Error fetching orders:', err)
      setFetchError('Không thể tải danh sách đơn hàng. Kiểm tra kết nối máy chủ hoặc thử lại.')
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [page, filters, orders.length])

  // Chỉ tải khi vào trang hoặc thay đổi bộ lọc / phân trang — KHÔNG chạy polling liên tục
  useEffect(() => {
    fetchOrders(false)
  }, [page, filters])

  // ── Gọi action API ──────────────────────────────
  const callAction = async (orderId, action, extra = {}) => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action, ...extra }),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Thao tác thất bại')

      showToast(data.message || 'Thao tác thành công', 'success')
      setActionModal(null)
      setActionInput('')

      // Cập nhật ngay lập tức xuống client storage và phát sự kiện đồng bộ khách hàng
      if (data.order) {
        broadcastOrderUpdateClient(data.order)

        // Cập nhật optimistic vào danh sách orders hiện tại
        setOrders((prev) =>
          prev.map((o) => ((o.orderId || o.id) === orderId ? data.order : o))
        )
      }

      // Cập nhật selectedOrder nếu đang mở xem
      if (selectedOrder?.orderId === orderId || selectedOrder?.id === orderId) {
        setSelectedOrder(data.order)
      }

      // Tải lại dữ liệu trang admin để đảm bảo thứ tự
      fetchOrders(false)
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
    const cfg = STATUS_CONFIG[status] || { label: status, color: '#6B7280', bg: '#F3F4F6', emoji: '⚪' }
    return (
      <span style={{
        background:  cfg.bg,
        color:       cfg.color,
        fontSize:    '11px',
        fontWeight:  600,
        padding:     '4px 10px',
        letterSpacing: '0.5px',
        whiteSpace:  'nowrap',
        borderRadius: '2px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
      }}>
        {cfg.emoji} {cfg.label}
      </span>
    )
  }

  // ── Action buttons cho từng trạng thái ─────────
  const ActionButtons = ({ order }) => {
    const orderId = order.orderId || order.id
    const status = order.status || 'PENDING'

    return (
      <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
        {(status === 'PENDING' || status === 'AWAITING_PAYMENT') && (
          <>
            <ActionBtn
              label="✅ Xác nhận"
              color="#2563EB"
              onClick={() => setActionModal({ type:'CONFIRM', orderId })}
            />
            <ActionBtn
              label="❌ Hủy đơn"
              color="#6B7280"
              onClick={() => setActionModal({ type:'CANCEL', orderId })}
            />
          </>
        )}
        {status === 'CONFIRMED' && (
          <>
            <ActionBtn
              label="📦 Đóng gói"
              color="#7C3AED"
              onClick={() => callAction(orderId, 'PROCESSING')}
            />
            <ActionBtn
              label="🚚 Giao shipper"
              color="#EA580C"
              onClick={() => setActionModal({ type:'SHIP', orderId })}
            />
            <ActionBtn
              label="❌ Hủy đơn"
              color="#6B7280"
              onClick={() => setActionModal({ type:'CANCEL', orderId })}
            />
          </>
        )}
        {status === 'PROCESSING' && (
          <>
            <ActionBtn
              label="🚚 Giao shipper"
              color="#EA580C"
              onClick={() => setActionModal({ type:'SHIP', orderId })}
            />
            <ActionBtn
              label="❌ Hủy đơn"
              color="#6B7280"
              onClick={() => setActionModal({ type:'CANCEL', orderId })}
            />
          </>
        )}
        {status === 'SHIPPED' && (
          <ActionBtn
            label="🎉 Giao thành công"
            color="#16A34A"
            onClick={() => callAction(orderId, 'DELIVER')}
          />
        )}
      </div>
    )
  }

  const ActionBtn = ({ label, color, onClick }) => (
    <button
      onClick={onClick}
      disabled={actionLoading}
      style={{
        background:    color,
        color:         '#fff',
        border:        'none',
        padding:       '6px 12px',
        fontSize:      '11px',
        fontWeight:    600,
        cursor:        actionLoading ? 'not-allowed' : 'pointer',
        letterSpacing: '0.5px',
        fontFamily:    'Inter, Arial, sans-serif',
        borderRadius:  '2px',
        opacity:       actionLoading ? 0.6 : 1,
        transition:    'opacity 0.2s',
      }}
    >
      {label}
    </button>
  )

  return (
    <div style={{ padding:'24px', fontFamily:'Inter, Arial, sans-serif', color:'#3A3535', minHeight:'100vh', background:'#FAF8F5' }}>

      {/* ── HEADER ──────────────────────────── */}
      <div style={{ marginBottom:'24px', display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:'12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img
            src="/images/logo.jpg"
            alt="QuanNguyenS Logo"
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              border: '2px solid #D4AF37',
              objectFit: 'cover',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          />
          <div>
            <div style={{ fontSize:'11px', letterSpacing:'2px', textTransform:'uppercase', color:'#7A6E6E', fontWeight:600 }}>
              HỆ THỐNG QUẢN TRỊ QUANNGUYENS
            </div>
            <h1 style={{ fontFamily:'Georgia,serif', fontSize:'26px', fontWeight:600, margin:'2px 0 0', color:'#631521' }}>
              Quản Lý Đơn Hàng
            </h1>
            <p style={{ color:'#7A6E6E', fontSize:'13px', marginTop:'3px' }}>
              Tổng số: <strong>{total}</strong> đơn hàng · Lần cập nhật cuối: <span style={{ color:'#631521', fontWeight:600 }}>{lastUpdated}</span>
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchOrders(true)}
          disabled={isRefreshing || loading}
          title="Click để tải lại danh sách đơn hàng mới nhất từ máy chủ"
          style={{
            ...btnStyle,
            background: '#631521',
            padding: '10px 18px',
            fontSize: '12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            cursor: (isRefreshing || loading) ? 'not-allowed' : 'pointer',
            opacity: (isRefreshing || loading) ? 0.7 : 1,
            boxShadow: '0 2px 4px rgba(99,21,33,0.15)',
          }}
        >
          <span style={{
            display: 'inline-block',
            transition: 'transform 0.5s linear',
            transform: isRefreshing ? 'rotate(360deg)' : 'none',
          }}>
            🔄
          </span>
          <span>{isRefreshing ? 'Đang cập nhật...' : 'Làm mới dữ liệu'}</span>
        </button>
      </div>

      {/* ── BANNER LỖI NẾU CÓ ─────────────────── */}
      {fetchError && (
        <div style={{
          background: '#FEE2E2', color: '#991B1B', padding: '12px 16px',
          marginBottom: '16px', fontSize: '13px', border: '1px solid #FECACA',
          borderRadius: '2px', display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          ⚠️ {fetchError}
        </div>
      )}

      {/* ── BỘ LỌC ──────────────────────────── */}
      <div style={{
        display:'flex', gap:'10px', flexWrap:'wrap',
        background:'#F5F0E8', padding:'16px', marginBottom:'20px',
        border:'1px solid #E8DFD5',
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
          <option value="">Tất cả phương thức TT</option>
          {Object.entries(PAYMENT_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <input
          type="date"
          title="Lọc theo ngày đặt hàng"
          value={filters.date}
          onChange={e => setFilters(f => ({ ...f, date: e.target.value }))}
          style={{ ...inputStyle, width:'150px' }}
        />
        <button
          onClick={() => { setFilters({ status:'', payment:'', search:'', date:'' }); setPage(1) }}
          style={{ ...btnStyle, background:'#7A6E6E' }}
        >
          Xóa lọc
        </button>
      </div>

      {/* ── BẢNG ĐƠN HÀNG ────────────────────── */}
      {loading ? (
        <div style={{ textAlign:'center', padding:'48px', color:'#7A6E6E' }}>
          Đang đồng bộ dữ liệu đơn hàng...
        </div>
      ) : (
        <div style={{ overflowX:'auto', background:'#fff', border:'1px solid #D9CFC4', boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
            <thead>
              <tr style={{ background:'#631521', color:'#FAF8F5' }}>
                {['Mã đơn','Khách hàng','Sản phẩm','Tổng tiền','Thanh toán','Trạng thái','Ngày đặt','Thao tác'].map(h => (
                  <th key={h} style={{ padding:'12px 14px', textAlign:'left', fontSize:'11px', letterSpacing:'1px', textTransform:'uppercase', fontWeight:600, whiteSpace:'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding:'48px', textAlign:'center', color:'#7A6E6E' }}>
                    Không tìm thấy đơn hàng nào phù hợp
                  </td>
                </tr>
              )}
              {orders.map((order, i) => {
                const orderId = order.orderId || order.id
                return (
                  <tr
                    key={orderId || i}
                    style={{ background: i % 2 === 0 ? '#fff' : '#FAF7F3', borderBottom:'1px solid #EDE8DF' }}
                  >
                    {/* Mã đơn */}
                    <td style={{ padding:'12px 14px', fontWeight:600, color:'#631521', whiteSpace:'nowrap' }}>
                      <button
                        onClick={() => setSelectedOrder(order)}
                        title="Click để xem chi tiết đầy đủ đơn hàng"
                        style={{ background:'none', border:'none', color:'#631521', fontWeight:700, cursor:'pointer', fontSize:'13px', textDecoration:'underline' }}
                      >
                        {orderId}
                      </button>
                    </td>

                    {/* Khách hàng */}
                    <td style={{ padding:'12px 14px' }}>
                      <div style={{ fontWeight:600, color:'#1A1614' }}>{order.customerName}</div>
                      <div style={{ color:'#7A6E6E', fontSize:'12px' }}>{order.customerPhone}</div>
                    </td>

                    {/* Sản phẩm */}
                    <td style={{ padding:'12px 14px', minWidth:'220px', maxWidth:'320px' }}>
                      {order.items?.map((item, idx) => (
                        <div key={idx} style={{ fontSize:'12px', marginBottom:'4px', lineHeight:'1.4' }}>
                          <div style={{ fontWeight: 600, color: '#1A1614' }}>
                            {item.productName || 'Bộ Pijama'}
                          </div>
                          <div style={{ color:'#7A6E6E', fontSize:'11px' }}>
                            {item.colorLabel ? `${item.colorLabel} · ` : ''}{item.size ? `Size ${item.size}` : ''} × <strong style={{ color: '#631521' }}>{item.quantity}</strong>
                          </div>
                        </div>
                      ))}
                    </td>

                    {/* Tổng tiền */}
                    <td style={{ padding:'12px 14px', fontFamily:'Georgia,serif', color:'#631521', fontWeight:'bold', fontSize:'14px', whiteSpace:'nowrap' }}>
                      {vnd(order.total)}
                    </td>

                    {/* Thanh toán */}
                    <td style={{ padding:'12px 14px', fontSize:'12px', whiteSpace:'nowrap' }}>
                      <div style={{ fontWeight: 500, marginBottom:'3px' }}>{PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}</div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          callAction(orderId, 'TOGGLE_PAYMENT')
                        }}
                        disabled={actionLoading}
                        title="Click để đổi trạng thái Chưa TT / Đã TT"
                        style={{
                          background: order.paymentStatus === 'PAID' ? '#DCFCE7' : '#FEF3C7',
                          color: order.paymentStatus === 'PAID' ? '#16A34A' : '#D97706',
                          border: `1px solid ${order.paymentStatus === 'PAID' ? '#86EFAC' : '#FDE68A'}`,
                          padding: '3px 8px',
                          fontSize: '11px',
                          fontWeight: 600,
                          borderRadius: '2px',
                          cursor: actionLoading ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {order.paymentStatus === 'PAID' ? '✅ Đã TT' : '⏳ Chưa TT'}
                      </button>
                    </td>

                    {/* Trạng thái */}
                    <td style={{ padding:'12px 14px' }}>
                      <StatusBadge status={order.status} />
                    </td>

                    {/* Ngày đặt */}
                    <td style={{ padding:'12px 14px', color:'#7A6E6E', fontSize:'12px', whiteSpace:'nowrap' }}>
                      {order.createdAt && !isNaN(new Date(order.createdAt).getTime()) ? (
                        new Date(order.createdAt).toLocaleString('vi-VN', {
                          day:'2-digit', month:'2-digit', year:'numeric',
                          hour:'2-digit', minute:'2-digit',
                        })
                      ) : (
                        order.orderDateVN || 'Vừa xong'
                      )}
                    </td>

                    {/* Thao tác */}
                    <td style={{ padding:'12px 14px' }}>
                      <ActionButtons order={order} />
                    </td>
                  </tr>
                )
              })}
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
        <span style={{ padding:'8px 16px', fontSize:'13px', color:'#7A6E6E', display:'flex', alignItems:'center' }}>
          Trang {page}
        </span>
        <button
          disabled={page * 20 >= total}
          onClick={() => setPage(p => p + 1)}
          style={{ ...btnStyle, opacity: page * 20 >= total ? 0.4 : 1 }}
        >Sau →</button>
      </div>

      {/* ── MODAL ACTION (CONFIRM / SHIP / CANCEL) ─────────── */}
      {actionModal && (
        <div style={{
          position:'fixed', inset:0,
          background:'rgba(0,0,0,0.6)',
          display:'flex', alignItems:'center', justifyContent:'center',
          zIndex:1000,
        }}>
          <div style={{
            background:'#fff', padding:'32px', width:'440px', maxWidth:'95vw',
            fontFamily:'Inter, Arial, sans-serif',
            boxShadow:'0 20px 40px rgba(0,0,0,0.2)',
            borderRadius:'4px',
          }}>
            {/* CONFIRM modal */}
            {actionModal.type === 'CONFIRM' && (
              <>
                <h2 style={modalTitle}>✅ Xác nhận đơn hàng</h2>
                <p style={modalDesc}>Đơn sẽ chuyển sang trạng thái "Đã xác nhận". Email xác nhận sẽ tự động gửi đến khách hàng.</p>
                <textarea
                  placeholder="Ghi chú nội bộ (không bắt buộc)"
                  value={actionInput}
                  onChange={e => setActionInput(e.target.value)}
                  rows={3} style={textareaStyle}
                />
                <div style={modalActions}>
                  <button
                    onClick={() => callAction(actionModal.orderId, 'CONFIRM', { note: actionInput })}
                    disabled={actionLoading}
                    style={{ ...btnStyle, background:'#2563EB' }}
                  >
                    {actionLoading ? 'Đang xử lý...' : '✅ Xác nhận đơn'}
                  </button>
                  <button
                    onClick={() => setActionModal(null)}
                    disabled={actionLoading}
                    style={{ ...btnStyle, background:'#6B7280' }}
                  >
                    Hủy
                  </button>
                </div>
              </>
            )}

            {/* SHIP modal */}
            {actionModal.type === 'SHIP' && (
              <>
                <h2 style={modalTitle}>🚚 Giao cho shipper</h2>
                <p style={modalDesc}>Nhập mã vận đơn bưu tá. Email thông báo kèm mã vận đơn sẽ được gửi ngay cho khách hàng.</p>
                <input
                  placeholder="Mã vận đơn (tracking number)"
                  value={actionInput}
                  onChange={e => setActionInput(e.target.value)}
                  style={{ ...inputStyle, width:'100%', marginBottom:'12px', display:'block', boxSizing:'border-box' }}
                />
                <div style={modalActions}>
                  <button
                    onClick={() => callAction(actionModal.orderId, 'SHIP', { trackingNumber: actionInput })}
                    disabled={actionLoading}
                    style={{ ...btnStyle, background:'#EA580C' }}
                  >
                    {actionLoading ? 'Đang xử lý...' : '🚚 Xác nhận giao hàng'}
                  </button>
                  <button
                    onClick={() => setActionModal(null)}
                    disabled={actionLoading}
                    style={{ ...btnStyle, background:'#6B7280' }}
                  >
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
                  Email thông báo hủy đơn (kèm lý do) sẽ được gửi tới khách hàng.
                  Nếu khách đã thanh toán, hướng dẫn hoàn tiền sẽ được ghi rõ trong email.
                </p>
                <textarea
                  placeholder="Lý do hủy đơn * (bắt buộc tối thiểu 5 ký tự — khách hàng sẽ thấy lý do này)"
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
                  <button
                    onClick={() => setActionModal(null)}
                    disabled={actionLoading}
                    style={{ ...btnStyle, background:'#6B7280' }}
                  >
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

      {/* ── MODAL CHI TIẾT ĐƠN HÀNG ───────────── */}
      {selectedOrder && !actionModal && (
        <div style={{
          position:'fixed', inset:0,
          background:'rgba(0,0,0,0.6)',
          display:'flex', alignItems:'center', justifyContent:'center',
          zIndex:999,
        }} onClick={() => setSelectedOrder(null)}>
          <div style={{
            background:'#fff', padding:'28px', width:'560px', maxWidth:'95vw',
            maxHeight:'85vh', overflowY:'auto',
            fontFamily:'Inter, Arial, sans-serif',
            boxShadow:'0 20px 40px rgba(0,0,0,0.2)',
            borderRadius:'4px',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'16px' }}>
              <div>
                <span style={{ fontSize:'11px', color:'#7A6E6E', textTransform:'uppercase', letterSpacing:'1px' }}>Chi tiết đơn hàng</span>
                <h2 style={{ fontFamily:'Georgia,serif', fontSize:'22px', color:'#631521', margin:'2px 0 0' }}>
                  #{selectedOrder.orderId || selectedOrder.id}
                </h2>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                disabled={actionLoading}
                style={{ background:'none', border:'none', fontSize:'22px', cursor:'pointer', color:'#7A6E6E' }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom:'16px' }}>
              <StatusBadge status={selectedOrder.status} />
            </div>

            <div style={{ background:'#FAF7F3', padding:'14px', marginBottom:'16px', fontSize:'13px', border:'1px solid #E8DFD5', lineHeight:'1.8' }}>
              <div><strong>Khách hàng:</strong> {selectedOrder.customerName || selectedOrder.customer?.fullName}</div>
              <div><strong>Điện thoại:</strong> <a href={`tel:${selectedOrder.customerPhone || selectedOrder.customer?.phone}`} style={{ color:'#631521', fontWeight:600 }}>{selectedOrder.customerPhone || selectedOrder.customer?.phone}</a></div>
              {(selectedOrder.customerEmail || selectedOrder.customer?.email) && (
                <div><strong>Email:</strong> {selectedOrder.customerEmail || selectedOrder.customer?.email}</div>
              )}
              <div><strong>Địa chỉ nhận:</strong> {selectedOrder.shippingAddress || selectedOrder.shipping?.fullAddress || 'Chưa cung cấp'}</div>
              <div><strong>Phương thức TT:</strong> {PAYMENT_LABELS[selectedOrder.paymentMethod] || selectedOrder.paymentMethod} ({selectedOrder.paymentStatus === 'PAID' ? '✅ Đã TT' : '⏳ Chưa TT'})</div>
              {selectedOrder.customerNote && <div><strong>Ghi chú khách:</strong> {selectedOrder.customerNote}</div>}
              {selectedOrder.adminNote && <div><strong>Ghi chú nội bộ:</strong> {selectedOrder.adminNote}</div>}
              {selectedOrder.trackingNumber && <div><strong>Mã vận đơn:</strong> {selectedOrder.trackingNumber} ({selectedOrder.carrier || 'GHN'})</div>}
              {selectedOrder.cancelReason && <div style={{ color: '#EF4444' }}><strong>Lý do hủy:</strong> {selectedOrder.cancelReason}</div>}
            </div>

            <div style={{ marginBottom:'16px' }}>
              <div style={{ fontSize:'12px', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'8px', color:'#7A6E6E' }}>
                Sản phẩm đặt mua ({selectedOrder.items?.length || 0})
              </div>
              <div style={{ border:'1px solid #E8DFD5' }}>
                {selectedOrder.items?.map((item, idx) => (
                  <div key={idx} style={{ display:'flex', justifyContent:'space-between', padding:'10px 12px', borderBottom: idx < selectedOrder.items.length - 1 ? '1px solid #E8DFD5' : 'none', fontSize:'13px' }}>
                    <div>
                      <div style={{ fontWeight:600, color:'#1A1614' }}>{item.productName || 'Bộ Pijama'}</div>
                      <div style={{ fontSize:'11px', color:'#7A6E6E' }}>{item.colorLabel ? `${item.colorLabel} · ` : ''}{item.size ? `Size ${item.size}` : ''} × {item.quantity}</div>
                    </div>
                    <div style={{ fontWeight:600, color:'#631521' }}>
                      {vnd(item.totalPrice || (item.unitPrice * item.quantity))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background:'#FAF7F3', padding:'14px', marginBottom:'16px', fontSize:'13px', border:'1px solid #E8DFD5' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                <span>Tạm tính:</span>
                <span>{vnd(selectedOrder.subtotal)}</span>
              </div>
              {selectedOrder.discount > 0 && (
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px', color:'#16A34A' }}>
                  <span>Ưu đãi / Giảm giá:</span>
                  <span>-{vnd(selectedOrder.discount)}</span>
                </div>
              )}
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
                <span>Phí vận chuyển:</span>
                <span>{vnd(selectedOrder.shippingFee)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', borderTop:'1px solid #D9CFC4', paddingTop:'8px', fontWeight:'bold', fontSize:'15px', color:'#631521' }}>
                <span>Tổng thanh toán:</span>
                <span>{vnd(selectedOrder.total)}</span>
              </div>
            </div>

            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'20px', flexWrap:'wrap', gap:'10px' }}>
              <ActionButtons order={selectedOrder} />
              <button
                onClick={() => setSelectedOrder(null)}
                disabled={actionLoading}
                style={{ ...btnStyle, background:'#6B7280' }}
              >
                Đóng
              </button>
            </div>
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
          borderRadius:'4px',
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
  fontFamily:'Inter, Arial, sans-serif',
  minWidth:'160px',
  borderRadius:'2px',
}
const btnStyle = {
  background:'#631521', color:'#fff',
  border:'none', padding:'8px 16px',
  fontSize:'12px', fontWeight:600,
  letterSpacing:'0.5px', cursor:'pointer',
  fontFamily:'Inter, Arial, sans-serif',
  textTransform:'uppercase',
  borderRadius:'2px',
}
const modalTitle    = { fontFamily:'Georgia,serif', fontSize:'20px', marginBottom:'10px', color:'#631521' }
const modalDesc     = { fontSize:'13px', color:'#5A5050', lineHeight:1.7, marginBottom:'16px' }
const textareaStyle = { width:'100%', padding:'10px 12px', fontSize:'13px', border:'1px solid #D9CFC4', resize:'vertical', fontFamily:'Inter, Arial, sans-serif', marginBottom:'16px', boxSizing:'border-box', borderRadius:'2px' }
const modalActions  = { display:'flex', gap:'10px' }
