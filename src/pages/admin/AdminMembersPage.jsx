// src/pages/admin/AdminMembersPage.jsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  Award,
  Coins,
  Ticket,
  AlertTriangle,
  Search,
  Eye,
  RefreshCw,
  Download,
  CheckCircle2,
  XCircle,
  PlusCircle,
  MinusCircle,
  Sliders,
  Calendar,
  Sparkles,
  ShieldCheck,
  FileText,
  Clock,
  ArrowRight,
} from 'lucide-react'

export default function AdminMembersPage() {
  const [activeTab, setActiveTab] = useState('list') // 'list' | 'detail' | 'alerts' | 'config'
  const [summary, setSummary] = useState(null)
  const [members, setMembers] = useState([])
  const [totalMembers, setTotalMembers] = useState(0)
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [tierFilter, setTierFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(0)
  const limit = 20

  // Selected Member Detail
  const [selectedMemberId, setSelectedMemberId] = useState(null)
  const [memberDetail, setMemberDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [unmaskedPhones, setUnmaskedPhones] = useState({})

  // Adjust Points Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false)
  const [pointsDelta, setPointsDelta] = useState(5)
  const [adjustReason, setAdjustReason] = useState('')
  const [adjustSubmitting, setAdjustSubmitting] = useState(false)
  const [adjustError, setAdjustError] = useState(null)

  // Alerts
  const [alerts, setAlerts] = useState([])
  const [loadingAlerts, setLoadingAlerts] = useState(false)
  const [resolvingId, setResolvingId] = useState(null)

  const getAdminHeaders = () => {
    const token = sessionStorage.getItem('qns_admin_token') || ''
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  // Tải thống kê tổng quan
  const fetchSummary = async () => {
    try {
      const res = await fetch('/api/admin/loyalty/summary', { credentials: 'include', headers: getAdminHeaders() })
      if (res.ok) {
        const data = await res.json()
        setSummary(data.summary)
      }
    } catch (err) {
      console.error('Lỗi tải summary:', err)
    }
  }

  // Tải danh sách hội viên
  const fetchMembers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(page * limit),
      })
      if (searchQuery.trim()) params.append('search', searchQuery.trim())
      if (tierFilter) params.append('tier', tierFilter)
      if (statusFilter) params.append('status', statusFilter)

      const res = await fetch(`/api/admin/loyalty/members?${params.toString()}`, {
        credentials: 'include',
        headers: getAdminHeaders(),
      })
      if (res.ok) {
        const data = await res.json()
        setMembers(data.members || [])
        setTotalMembers(data.total || 0)
      }
    } catch (err) {
      console.error('Lỗi tải danh sách hội viên:', err)
    } finally {
      setLoading(false)
    }
  }

  // Tải chi tiết một hội viên
  const fetchMemberDetail = async (id) => {
    if (!id) return
    setLoadingDetail(true)
    try {
      const res = await fetch(`/api/admin/loyalty/members/${id}`, {
        credentials: 'include',
        headers: getAdminHeaders(),
      })
      if (res.ok) {
        const data = await res.json()
        setMemberDetail(data)
        setActiveTab('detail')
      }
    } catch (err) {
      console.error('Lỗi tải chi tiết hội viên:', err)
    } finally {
      setLoadingDetail(false)
    }
  }

  // Mở che số điện thoại (Unmask phone)
  const handleUnmaskPhone = async (id) => {
    try {
      const res = await fetch(`/api/admin/loyalty/members/${id}/unmask-phone`, {
        method: 'POST',
        credentials: 'include',
        headers: getAdminHeaders(),
      })
      if (res.ok) {
        const data = await res.json()
        setUnmaskedPhones((prev) => ({ ...prev, [id]: data.phone }))
      }
    } catch (err) {
      console.error('Lỗi mở che SĐT:', err)
    }
  }

  // Tải danh sách cảnh báo bất thường
  const fetchAlerts = async () => {
    setLoadingAlerts(true)
    try {
      const res = await fetch('/api/admin/loyalty/alerts?status=open', {
        credentials: 'include',
        headers: getAdminHeaders(),
      })
      if (res.ok) {
        const data = await res.json()
        setAlerts(data.alerts || [])
      }
    } catch (err) {
      console.error('Lỗi tải alerts:', err)
    } finally {
      setLoadingAlerts(false)
    }
  }

  // Xử lý đóng cảnh báo
  const handleResolveAlert = async (id) => {
    setResolvingId(id)
    try {
      const res = await fetch(`/api/admin/loyalty/alerts/${id}/resolve`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ notes: 'Đã xử lý bởi Admin' }),
      })
      if (res.ok) {
        setAlerts((prev) => prev.filter((a) => a.id !== id))
        fetchSummary()
      }
    } catch (err) {
      console.error('Lỗi resolve alert:', err)
    } finally {
      setResolvingId(null)
    }
  }

  // Xử lý điều chỉnh điểm
  const handleAdjustPoints = async (e) => {
    e.preventDefault()
    if (!selectedMemberId || !adjustReason.trim()) return

    setAdjustSubmitting(true)
    setAdjustError(null)

    try {
      const res = await fetch(`/api/admin/loyalty/members/${selectedMemberId}/adjust-points`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          pointsDelta: Number(pointsDelta),
          reason: adjustReason.trim(),
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setAdjustModalOpen(false)
        setAdjustReason('')
        fetchMemberDetail(selectedMemberId)
        fetchSummary()
      } else {
        setAdjustError(data.error || 'Không thể điều chỉnh điểm')
      }
    } catch (err) {
      setAdjustError(err.message)
    } finally {
      setAdjustSubmitting(false)
    }
  }

  // Chạy jobs thủ công
  const handleRunJobs = async () => {
    if (!confirm('Bạn có chắc chắn muốn kích hoạt chạy đồng bộ Loyalty Jobs ngay bây giờ?')) return
    try {
      const res = await fetch('/api/admin/loyalty/jobs/run', {
        method: 'POST',
        headers: getAdminHeaders(),
      })
      if (res.ok) {
        alert('Đã chạy xong các tác vụ đồng bộ thành công!')
        fetchSummary()
        fetchMembers()
      }
    } catch (err) {
      alert('Lỗi: ' + err.message)
    }
  }

  // Xuất file CSV
  const handleExportCsv = () => {
    window.open('/api/admin/loyalty/export-csv', '_blank')
  }

  useEffect(() => {
    fetchSummary()
    fetchMembers()
  }, [page, tierFilter, statusFilter])

  useEffect(() => {
    if (activeTab === 'alerts') {
      fetchAlerts()
    }
  }, [activeTab])

  const getTierBadge = (tier) => {
    const config = {
      MEMBER: { label: 'Thân Thiết', bg: '#FAF8F5', color: '#631521', border: '#D4AF37' },
      SILVER: { label: 'Bạc', bg: '#F4F4F5', color: '#52525B', border: '#A1A1AA' },
      GOLD: { label: 'Vàng', bg: '#FEF3C7', color: '#B45309', border: '#F59E0B' },
      DIAMOND: { label: 'Kim Cương', bg: '#E0F2FE', color: '#0369A1', border: '#38BDF8' },
    }
    const current = config[tier] || config.MEMBER
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 8px',
          borderRadius: '9999px',
          fontSize: '11px',
          fontWeight: 600,
          background: current.bg,
          color: current.color,
          border: `1px solid ${current.border}`,
        }}
      >
        <Award size={12} />
        {current.label}
      </span>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAF8F5', color: '#27272A', padding: '24px 32px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* ── HEADER NAVIGATION ───────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: '#71717A', fontWeight: 600 }}>
            HỆ THỐNG QUẢN TRỊ QUANNGUYENS
          </div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '28px', fontWeight: 600, margin: '4px 0 0', color: '#631521' }}>
            Ưu Đãi Hội Viên & Điểm Thưởng
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Link
            to="/admin/orders"
            style={{
              background: '#FFFFFF',
              color: '#631521',
              border: '1px solid #E4E4E7',
              padding: '8px 14px',
              fontSize: '12px',
              textDecoration: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            📦 Quản Lý Đơn Hàng
          </Link>
          <Link
            to="/admin/broadcast"
            style={{
              background: '#FFFFFF',
              color: '#631521',
              border: '1px solid #E4E4E7',
              padding: '8px 14px',
              fontSize: '12px',
              textDecoration: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            📢 Gửi Broadcast
          </Link>
          <button
            onClick={handleExportCsv}
            style={{
              background: '#FFFFFF',
              color: '#27272A',
              border: '1px solid #E4E4E7',
              padding: '8px 14px',
              fontSize: '12px',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Download size={14} /> Xuất CSV
          </button>
          <button
            onClick={handleRunJobs}
            style={{
              background: '#631521',
              color: '#FFFFFF',
              border: 'none',
              padding: '8px 14px',
              fontSize: '12px',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <RefreshCw size={14} /> Chạy Đồng Bộ
          </button>
        </div>
      </div>

      {/* ── STATS CARDS ─────────────────────────────────────────── */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: '#FFFFFF', padding: '16px 20px', borderRadius: '8px', border: '1px solid #E4E4E7', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#71717A', fontSize: '13px', fontWeight: 500 }}>
              <span>Tổng hội viên</span>
              <Users size={18} color="#631521" />
            </div>
            <div style={{ fontSize: '26px', fontWeight: 700, color: '#631521', margin: '8px 0 4px' }}>
              {summary.totalMembers}
            </div>
            <div style={{ fontSize: '12px', color: '#16A34A', fontWeight: 500 }}>
              + {summary.new7d} hội viên mới trong 7 ngày
            </div>
          </div>

          <div style={{ background: '#FFFFFF', padding: '16px 20px', borderRadius: '8px', border: '1px solid #E4E4E7', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#71717A', fontSize: '13px', fontWeight: 500 }}>
              <span>Điểm lưu hành</span>
              <Coins size={18} color="#B45309" />
            </div>
            <div style={{ fontSize: '26px', fontWeight: 700, color: '#B45309', margin: '8px 0 4px' }}>
              {summary.totalPointsInCirculation.toLocaleString('vi-VN')} điểm
            </div>
            <div style={{ fontSize: '12px', color: '#71717A' }}>
              Nợ tương đương: <strong>{summary.pointsLiabilityVnd.toLocaleString('vi-VN')}đ</strong>
            </div>
          </div>

          <div style={{ background: '#FFFFFF', padding: '16px 20px', borderRadius: '8px', border: '1px solid #E4E4E7', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#71717A', fontSize: '13px', fontWeight: 500 }}>
              <span>Phân bổ 4 hạng</span>
              <Award size={18} color="#631521" />
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', margin: '12px 0 4px', fontSize: '12px' }}>
              <span title="Thân thiết">TT: <strong>{summary.tierCounts?.MEMBER || 0}</strong></span> ·
              <span title="Bạc">Bạc: <strong>{summary.tierCounts?.SILVER || 0}</strong></span> ·
              <span title="Vàng">Vàng: <strong>{summary.tierCounts?.GOLD || 0}</strong></span> ·
              <span title="Kim cương" style={{ color: '#0369A1' }}>KC: <strong>{summary.tierCounts?.DIAMOND || 0}</strong></span>
            </div>
            <div style={{ fontSize: '12px', color: '#71717A' }}>
              Hạng Kim Cương có ưu đãi Private Party
            </div>
          </div>

          <div style={{ background: '#FFFFFF', padding: '16px 20px', borderRadius: '8px', border: '1px solid #E4E4E7', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#71717A', fontSize: '13px', fontWeight: 500 }}>
              <span>Cảnh báo cần xử lý</span>
              <AlertTriangle size={18} color={summary.openAlertsCount > 0 ? '#DC2626' : '#16A34A'} />
            </div>
            <div style={{ fontSize: '26px', fontWeight: 700, color: summary.openAlertsCount > 0 ? '#DC2626' : '#16A34A', margin: '8px 0 4px' }}>
              {summary.openAlertsCount}
            </div>
            <div style={{ fontSize: '12px', color: '#71717A' }}>
              {summary.openAlertsCount > 0 ? 'Có cảnh báo quà tặng / đối soát mở' : 'Hệ thống vận hành an toàn'}
            </div>
          </div>
        </div>
      )}

      {/* ── TABS NAVIGATION ─────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E4E4E7', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('list')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'list' ? '2px solid #631521' : '2px solid transparent',
            color: activeTab === 'list' ? '#631521' : '#71717A',
            cursor: 'pointer',
          }}
        >
          📋 Danh Sách Hội Viên
        </button>
        {memberDetail && (
          <button
            onClick={() => setActiveTab('detail')}
            style={{
              padding: '10px 18px',
              fontSize: '14px',
              fontWeight: 600,
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'detail' ? '2px solid #631521' : '2px solid transparent',
              color: activeTab === 'detail' ? '#631521' : '#71717A',
              cursor: 'pointer',
            }}
          >
            👤 Chi Tiết: {memberDetail.member?.full_name}
          </button>
        )}
        <button
          onClick={() => setActiveTab('alerts')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'alerts' ? '2px solid #631521' : '2px solid transparent',
            color: activeTab === 'alerts' ? '#631521' : '#71717A',
            cursor: 'pointer',
          }}
        >
          🚨 Bất Thường & Quà Hạng 4 ({summary?.openAlertsCount || 0})
        </button>
        <button
          onClick={() => setActiveTab('config')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'config' ? '2px solid #631521' : '2px solid transparent',
            color: activeTab === 'config' ? '#631521' : '#71717A',
            cursor: 'pointer',
          }}
        >
          ⚙️ Quy Tắc Chương Trình (Chỉ Đọc)
        </button>
      </div>

      {/* ── TAB 1: DANH SÁCH HỘI VIÊN ────────────────────────────── */}
      {activeTab === 'list' && (
        <div style={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E4E4E7', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          {/* Controls bar */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
              <input
                type="text"
                placeholder="Tìm theo SĐT, Họ tên hoặc Email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchMembers()}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  borderRadius: '6px',
                  border: '1px solid #D4D4D8',
                  fontSize: '13px',
                }}
              />
              <Search size={16} color="#A1A1AA" style={{ position: 'absolute', left: '10px', top: '11px' }} />
            </div>

            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              style={{ padding: '9px 12px', borderRadius: '6px', border: '1px solid #D4D4D8', fontSize: '13px', background: '#FFFFFF' }}
            >
              <option value="">Tất cả hạng</option>
              <option value="MEMBER">Thân Thiết</option>
              <option value="SILVER">Bạc</option>
              <option value="GOLD">Vàng</option>
              <option value="DIAMOND">Kim Cương</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '9px 12px', borderRadius: '6px', border: '1px solid #D4D4D8', fontSize: '13px', background: '#FFFFFF' }}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="active">Hoạt động (Active)</option>
              <option value="frozen">Tạm khóa (Frozen)</option>
              <option value="closed">Đã đóng (Closed)</option>
            </select>

            <button
              onClick={() => { setPage(0); fetchMembers(); }}
              style={{
                background: '#631521',
                color: '#FFFFFF',
                border: 'none',
                padding: '9px 16px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Tìm kiếm
            </button>
          </div>

          {/* Members Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#FAF8F5', borderBottom: '1px solid #E4E4E7', color: '#71717A' }}>
                  <th style={{ padding: '10px 12px' }}>Họ Và Tên</th>
                  <th style={{ padding: '10px 12px' }}>Số Điện Thoại</th>
                  <th style={{ padding: '10px 12px' }}>Hạng</th>
                  <th style={{ padding: '10px 12px' }}>Điểm Thưởng</th>
                  <th style={{ padding: '10px 12px' }}>Trạng Thái</th>
                  <th style={{ padding: '10px 12px' }}>Ngày Đăng Ký</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Hành Động</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#71717A' }}>
                      Đang tải danh sách hội viên...
                    </td>
                  </tr>
                ) : members.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#71717A' }}>
                      Không tìm thấy hội viên nào phù hợp với bộ lọc
                    </td>
                  </tr>
                ) : (
                  members.map((m) => (
                    <tr key={m.id} style={{ borderBottom: '1px solid #F4F4F5' }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 600, color: '#27272A' }}>{m.fullName}</div>
                        {m.email && <div style={{ fontSize: '11px', color: '#71717A' }}>{m.email}</div>}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                            {unmaskedPhones[m.id] || m.maskedPhone}
                          </span>
                          {!unmaskedPhones[m.id] && (
                            <button
                              onClick={() => handleUnmaskPhone(m.id)}
                              title="Hiện số điện thoại đầy đủ (ghi nhật ký kiểm toán)"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#71717A' }}
                            >
                              <Eye size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>{getTierBadge(m.tier)}</td>
                      <td style={{ padding: '12px' }}>
                        <strong style={{ color: '#B45309' }}>{m.pointsBalance}</strong> điểm
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            background: m.status === 'active' ? '#DCFCE7' : m.status === 'frozen' ? '#FEF3C7' : '#F4F4F5',
                            color: m.status === 'active' ? '#166534' : m.status === 'frozen' ? '#92400E' : '#71717A',
                          }}
                        >
                          {m.status === 'active' ? 'Hoạt động' : m.status === 'frozen' ? 'Tạm khóa' : 'Đã đóng'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: '#71717A', fontSize: '12px' }}>
                        {new Date(m.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <button
                          onClick={() => {
                            setSelectedMemberId(m.id)
                            fetchMemberDetail(m.id)
                          }}
                          style={{
                            background: '#FAF8F5',
                            color: '#631521',
                            border: '1px solid #D4AF37',
                            padding: '5px 10px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Xem chi tiết
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', fontSize: '12px', color: '#71717A' }}>
            <div>
              Hiển thị <strong>{members.length}</strong> / <strong>{totalMembers}</strong> hội viên
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                style={{ padding: '4px 10px', borderRadius: '4px', border: '1px solid #D4D4D8', background: '#FFFFFF', cursor: page === 0 ? 'not-allowed' : 'pointer' }}
              >
                Trang trước
              </button>
              <span style={{ padding: '4px 8px' }}>Trang {page + 1}</span>
              <button
                disabled={(page + 1) * limit >= totalMembers}
                onClick={() => setPage((p) => p + 1)}
                style={{ padding: '4px 10px', borderRadius: '4px', border: '1px solid #D4D4D8', background: '#FFFFFF', cursor: (page + 1) * limit >= totalMembers ? 'not-allowed' : 'pointer' }}
              >
                Trang sau
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: CHI TIẾT HỘI VIÊN & SỔ CÁI ────────────────────── */}
      {activeTab === 'detail' && memberDetail && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
          {/* Cột trái: Thông tin hội viên & Thao tác */}
          <div style={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E4E4E7', padding: '20px', height: 'fit-content' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#631521', borderBottom: '1px solid #E4E4E7', paddingBottom: '8px' }}>
              Hồ Sơ Hội Viên
            </h3>

            <div style={{ fontSize: '13px', lineHeight: 1.8 }}>
              <div><strong>Họ tên:</strong> {memberDetail.member?.full_name}</div>
              <div><strong>SĐT:</strong> {memberDetail.member?.maskedPhone}</div>
              <div><strong>Email:</strong> {memberDetail.member?.email || '(Chưa cung cấp)'}</div>
              <div><strong>Ngày sinh:</strong> {memberDetail.member?.birth_day ? `${memberDetail.member.birth_day}/${memberDetail.member.birth_month}` : '(Chưa thiết lập)'}</div>
              <div><strong>Hạng hiện hành:</strong> {getTierBadge(memberDetail.member?.tier)}</div>
              <div><strong>Số dư điểm:</strong> <strong style={{ color: '#B45309' }}>{memberDetail.member?.pointsBalance}</strong> điểm</div>
              <div><strong>Chi tiêu 365 ngày:</strong> {(memberDetail.member?.rollingSpend || 0).toLocaleString('vi-VN')}đ</div>
              <div><strong>Trạng thái:</strong> {memberDetail.member?.status}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '20px' }}>
              <button
                onClick={() => {
                  setSelectedMemberId(memberDetail.member?.id)
                  setAdjustModalOpen(true)
                }}
                style={{
                  background: '#B45309',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Sliders size={14} /> Điều Chỉnh Điểm (Tối đa ±20 điểm)
              </button>
            </div>
          </div>

          {/* Cột phải: Toàn bộ Sổ cái chỉ-ghi-thêm (Append-only Ledger) */}
          <div style={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E4E4E7', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#631521', borderBottom: '1px solid #E4E4E7', paddingBottom: '8px' }}>
              Sổ Cái Biến Động Điểm (Append-only Ledger)
            </h3>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#FAF8F5', color: '#71717A', borderBottom: '1px solid #E4E4E7' }}>
                    <th style={{ padding: '8px' }}>Loại</th>
                    <th style={{ padding: '8px' }}>Điểm</th>
                    <th style={{ padding: '8px' }}>Chi Tiêu</th>
                    <th style={{ padding: '8px' }}>Mã Đơn</th>
                    <th style={{ padding: '8px' }}>Lý Do</th>
                    <th style={{ padding: '8px' }}>Thời Gian</th>
                  </tr>
                </thead>
                <tbody>
                  {memberDetail.ledgerHistory?.map((row) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid #F4F4F5' }}>
                      <td style={{ padding: '8px' }}>
                        <span
                          style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: 600,
                            fontSize: '10px',
                            background: row.type === 'EARN' ? '#DCFCE7' : row.type === 'REDEEM' ? '#FEE2E2' : '#FEF3C7',
                            color: row.type === 'EARN' ? '#166534' : row.type === 'REDEEM' ? '#991B1B' : '#92400E',
                          }}
                        >
                          {row.type}
                        </span>
                      </td>
                      <td style={{ padding: '8px', fontWeight: 600, color: row.points_delta > 0 ? '#16A34A' : '#DC2626' }}>
                        {row.points_delta > 0 ? `+${row.points_delta}` : row.points_delta}
                      </td>
                      <td style={{ padding: '8px' }}>{row.spend_delta ? `${row.spend_delta.toLocaleString('vi-VN')}đ` : '—'}</td>
                      <td style={{ padding: '8px', fontFamily: 'monospace' }}>{row.order_id || '—'}</td>
                      <td style={{ padding: '8px' }}>{row.reason}</td>
                      <td style={{ padding: '8px', color: '#71717A' }}>
                        {new Date(row.created_at).toLocaleString('vi-VN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: HÀNG ĐỢI XỬ LÝ BẤT THƯỜNG (ALERTS) ───────────── */}
      {activeTab === 'alerts' && (
        <div style={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E4E4E7', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#631521' }}>
            Hàng Đợi Cảnh Báo Bất Thường & Nhiệm Vụ Quà Hạng 4 (Private Party)
          </h3>

          {loadingAlerts ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#71717A' }}>Đang tải cảnh báo...</div>
          ) : alerts.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#16A34A' }}>
              <CheckCircle2 size={36} style={{ margin: '0 auto 12px' }} />
              <div>Không có cảnh báo bất thường nào chưa xử lý!</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {alerts.map((alt) => (
                <div
                  key={alt.id}
                  style={{
                    border: '1px solid #E4E4E7',
                    borderRadius: '8px',
                    padding: '16px',
                    background: alt.type === 'TIER_4_GIFT' ? '#F0F9FF' : '#FFFBEB',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: alt.type === 'TIER_4_GIFT' ? '#0284C7' : '#D97706',
                          color: '#FFFFFF',
                        }}
                      >
                        {alt.type === 'TIER_4_GIFT' ? 'ĐẶC QUYỀN KIM CƯƠNG' : alt.type}
                      </span>
                      <strong style={{ fontSize: '14px', color: '#27272A' }}>{alt.title}</strong>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#52525B' }}>
                      {typeof alt.details === 'string' ? alt.details : JSON.stringify(alt.details)}
                    </p>
                    <div style={{ fontSize: '11px', color: '#71717A', marginTop: '4px' }}>
                      Thời gian: {new Date(alt.created_at).toLocaleString('vi-VN')}
                    </div>
                  </div>

                  <button
                    disabled={resolvingId === alt.id}
                    onClick={() => handleResolveAlert(alt.id)}
                    style={{
                      background: '#16A34A',
                      color: '#FFFFFF',
                      border: 'none',
                      padding: '8px 14px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {resolvingId === alt.id ? 'Đang xử lý...' : 'Đánh dấu đã hoàn thành'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: QUY TẮC CHƯƠNG TRÌNH (CHỈ ĐỌC) ───────────────── */}
      {activeTab === 'config' && (
        <div style={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E4E4E7', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#631521' }}>
              Thông Số Cấu Hình Chương Trình (Phiên bản 1.0.0 — Ngày 25/10/2026)
            </h3>
            <span style={{ fontSize: '12px', background: '#DCFCE7', color: '#166534', padding: '3px 10px', borderRadius: '4px', fontWeight: 600 }}>
              Chỉ đọc (Bất biến)
            </span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginTop: '16px' }}>
            <thead>
              <tr style={{ background: '#FAF8F5', color: '#71717A', borderBottom: '1px solid #E4E4E7' }}>
                <th style={{ padding: '10px' }}>Hạng Hội Viên</th>
                <th style={{ padding: '10px' }}>Ngưỡng Chi Tiêu (365 ngày)</th>
                <th style={{ padding: '10px' }}>Giảm Giá Hạng</th>
                <th style={{ padding: '10px' }}>Voucher Sinh Nhật</th>
                <th style={{ padding: '10px' }}>Voucher Thăng Hạng</th>
                <th style={{ padding: '10px' }}>Đặc Quyền Quà Tặng</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #F4F4F5' }}>
                <td style={{ padding: '10px' }}>{getTierBadge('MEMBER')}</td>
                <td style={{ padding: '10px' }}>0đ (Ngay khi đăng ký)</td>
                <td style={{ padding: '10px' }}>0%</td>
                <td style={{ padding: '10px' }}>50.000đ</td>
                <td style={{ padding: '10px' }}>—</td>
                <td style={{ padding: '10px' }}>Tích điểm 100k = 1 điểm</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #F4F4F5' }}>
                <td style={{ padding: '10px' }}>{getTierBadge('SILVER')}</td>
                <td style={{ padding: '10px' }}>5.000.000đ</td>
                <td style={{ padding: '10px', color: '#16A34A', fontWeight: 600 }}>5%</td>
                <td style={{ padding: '10px' }}>200.000đ</td>
                <td style={{ padding: '10px' }}>200.000đ</td>
                <td style={{ padding: '10px' }}>Ưu đãi Bạc</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #F4F4F5' }}>
                <td style={{ padding: '10px' }}>{getTierBadge('GOLD')}</td>
                <td style={{ padding: '10px' }}>10.000.000đ</td>
                <td style={{ padding: '10px', color: '#16A34A', fontWeight: 600 }}>10%</td>
                <td style={{ padding: '10px' }}>300.000đ</td>
                <td style={{ padding: '10px' }}>300.000đ</td>
                <td style={{ padding: '10px' }}>Ưu tiên xử lý đơn</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #F4F4F5' }}>
                <td style={{ padding: '10px' }}>{getTierBadge('DIAMOND')}</td>
                <td style={{ padding: '10px' }}>25.000.000đ</td>
                <td style={{ padding: '10px', color: '#16A34A', fontWeight: 600 }}>15%</td>
                <td style={{ padding: '10px' }}>500.000đ</td>
                <td style={{ padding: '10px' }}>500.000đ</td>
                <td style={{ padding: '10px', color: '#0284C7', fontWeight: 600 }}>Private Party & Bộ quà đặc biệt BST</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ── MODAL: ĐIỀU CHỈNH ĐIỂM THỦ CÔNG (ADMIN ADJUST) ──────── */}
      {adjustModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#FFFFFF', borderRadius: '8px', padding: '24px', width: '100%', maxWidth: '420px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '18px', color: '#631521' }}>
              Điều Chỉnh Điểm Hội Viên
            </h3>
            <p style={{ fontSize: '12px', color: '#71717A', margin: '0 0 16px' }}>
              Tuân thủ Q8: Tối đa ±20 điểm/lần. Mọi biến động được ghi nhận vào Sổ cái và Nhật ký an ninh.
            </p>

            <form onSubmit={handleAdjustPoints}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                  Số điểm điều chỉnh (+ hoặc −)
                </label>
                <input
                  type="number"
                  min="-20"
                  max="20"
                  value={pointsDelta}
                  onChange={(e) => setPointsDelta(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D4D4D8', fontSize: '14px' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                  Lý do điều chỉnh (Bắt buộc)
                </label>
                <textarea
                  rows={3}
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Ví dụ: Bù điểm sự cố bưu tá giao trễ..."
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D4D4D8', fontSize: '13px' }}
                  required
                />
              </div>

              {adjustError && (
                <div style={{ padding: '8px 12px', background: '#FEE2E2', color: '#991B1B', borderRadius: '4px', fontSize: '12px', marginBottom: '14px' }}>
                  {adjustError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #D4D4D8', background: '#FFFFFF', cursor: 'pointer', fontSize: '13px' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={adjustSubmitting}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#631521', color: '#FFFFFF', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}
                >
                  {adjustSubmitting ? 'Đang lưu...' : 'Xác nhận điều chỉnh'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
