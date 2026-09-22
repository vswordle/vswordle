import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseJwksUrl = import.meta.env.VITE_SUPABASE_JWKS_URL

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export const isSupabaseConfigured = Boolean(supabase)

export async function ensureAnonymousSession() {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data: current } = await supabase.auth.getSession()
  if (current.session) return current.session

  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) throw error
  if (!data.session) throw new Error('Could not start a guest session.')
  return data.session
}
