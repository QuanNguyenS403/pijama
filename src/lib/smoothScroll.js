import Lenis from 'lenis'
import 'lenis/dist/lenis.css'

let lenisInstance = null
let rafId = null

/**
 * Đường cong giảm tốc mượt mà chuẩn phong cách thượng lưu (Luxury Silk Deceleration).
 * Tạo cảm giác lướt êm ái, đầm và nhẹ nhàng như nhung khi cuộn từ đầu trang đến cuối trang.
 */
export const luxurySilkEasing = (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))

/**
 * Khởi tạo engine cuộn mượt Lenis cho toàn bộ website QuanNguyenS.
 */
export function initSmoothScroll() {
  if (typeof window === 'undefined') return null
  if (lenisInstance) return { lenis: lenisInstance, destroy: destroySmoothScroll }

  try {
    lenisInstance = new Lenis({
      duration: 1.2, // Thời gian trôi quán tính êm ái
      easing: luxurySilkEasing,
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.2,
      infinite: false,
      autoToggle: true, // Tự động tạm dừng khi body overflow là hidden (mở modal/drawer)
    })

    window.__lenis = lenisInstance

    function raf(time) {
      if (lenisInstance) {
        lenisInstance.raf(time)
        rafId = requestAnimationFrame(raf)
      }
    }
    rafId = requestAnimationFrame(raf)

    // Bắt các liên kết neo (anchor #section-...) trên trang để cuộn mượt mà có bù trừ header
    const handleAnchorClick = (e) => {
      const anchor = e.target.closest('a[href^="#"]')
      if (!anchor) return
      const href = anchor.getAttribute('href')
      if (!href || href === '#' || href.length <= 1) return

      const targetEl = document.querySelector(href)
      if (targetEl) {
        e.preventDefault()
        smoothScrollTo(targetEl, { offset: -70, duration: 1.3 })
      }
    }

    document.addEventListener('click', handleAnchorClick, { passive: false })

    return {
      lenis: lenisInstance,
      destroy: () => {
        document.removeEventListener('click', handleAnchorClick)
        destroySmoothScroll()
      },
    }
  } catch (err) {
    console.warn('Không thể khởi tạo Lenis smooth scroll:', err.message)
    return null
  }
}

/**
 * Hủy instance Lenis khi unmount.
 */
export function destroySmoothScroll() {
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  if (lenisInstance) {
    try {
      lenisInstance.destroy()
    } catch (_) {}
    lenisInstance = null
    if (typeof window !== 'undefined') {
      window.__lenis = null
    }
  }
}

/**
 * Lấy instance Lenis đang hoạt động.
 */
export function getLenis() {
  return lenisInstance || (typeof window !== 'undefined' ? window.__lenis : null)
}

/**
 * Cuộn trang siêu êm ái, mượt mà tới mục tiêu (element, selector, hoặc vị trí pixel).
 * Dùng cho cả di chuyển từ đầu trang đến cuối trang, nhảy tới section, hoặc về đầu trang.
 *
 * @param {string | HTMLElement | number} target Selector (#section-footer), DOM Element, hoặc số px (0)
 * @param {object} options Các tùy chọn duration, offset, immediate
 */
export function smoothScrollTo(target, options = {}) {
  const lenis = getLenis()
  const duration = options.duration ?? 1.3
  const offset = options.offset ?? 0
  const immediate = options.immediate ?? false
  const easing = options.easing || luxurySilkEasing

  if (lenis && typeof lenis.scrollTo === 'function') {
    lenis.scrollTo(target, {
      offset,
      duration: immediate ? 0 : duration,
      easing,
      immediate,
      lock: options.lock ?? false,
    })
    return
  }

  // Fallback an toàn nếu Lenis chưa sẵn sàng
  if (typeof window !== 'undefined') {
    if (typeof target === 'number') {
      window.scrollTo({
        top: Math.max(0, target + offset),
        behavior: immediate ? 'instant' : 'smooth',
      })
    } else {
      const el = typeof target === 'string' ? document.querySelector(target) : target
      if (el) {
        if (offset !== 0) {
          const y = el.getBoundingClientRect().top + window.pageYOffset + offset
          window.scrollTo({
            top: Math.max(0, y),
            behavior: immediate ? 'instant' : 'smooth',
          })
        } else {
          el.scrollIntoView({ behavior: immediate ? 'instant' : 'smooth' })
        }
      }
    }
  }
}
