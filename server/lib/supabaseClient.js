import { createClient } from '@supabase/supabase-js'

let supabaseInstance = null

/**
 * Kiểm tra xem Supabase đã được cấu hình hợp lệ trong biến môi trường chưa
 */
export function isSupabaseConfigured() {
  const url = (process.env.SUPABASE_URL || '').trim()
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '').trim()

  return Boolean(
    url &&
    key &&
    !url.includes('[project]') &&
    !key.includes('eyJ...') &&
    url.startsWith('https://')
  )
}

/**
 * Lấy Supabase Admin Client (sử dụng Service Role Key để bypass RLS trên Server)
 */
export function getSupabase() {
  if (supabaseInstance) return supabaseInstance

  if (!isSupabaseConfigured()) {
    return null
  }

  const url = process.env.SUPABASE_URL.trim()
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY).trim()

  supabaseInstance = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return supabaseInstance
}
