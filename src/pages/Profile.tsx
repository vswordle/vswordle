import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { PlayerStats } from '../types/game'

interface ProfileProps {
  onLogin?: () => void
}

export function Profile({ onLogin }: ProfileProps) {
  const [profile, setProfile] = useState<PlayerStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    const loadProfile = async () => {
      if (!supabase) { if (mounted) { setError('Connect Supabase to load your profile.'); setLoading(false) }; return }
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) { if (mounted) { setError('Log in to view your profile.'); setLoading(false) }; return }
      const { data, error: profileError } = await supabase.from('profiles').select('id, username, avatar_url, elo, games_played, wins, losses, draws, current_streak, best_streak, created_at').eq('id', user.id).single()
      if (profileError || !data) { if (mounted) { setError(profileError?.message ?? 'Profile not found. Apply the Supabase profile migration before using this page.'); setLoading(false) }; return }
      if (mounted) {
        setProfile({ playerId: data.id, username: data.username, email: user.email, avatarUrl: data.avatar_url ?? undefined, elo: data.elo, gamesPlayed: data.games_played, wins: data.wins, losses: data.losses, draws: data.draws, currentWinStreak: data.current_streak, bestWinStreak: data.best_streak, createdAt: data.created_at })
        setLoading(false)
      }
    }
    void loadProfile()
    return () => { mounted = false }
  }, [])

  const uploadAvatar = async (file: File) => {
    if (!supabase || !profile) return
    if (!file.type.startsWith('image/')) { setError('Choose an image file.'); return }
    if (file.size > 2 * 1024 * 1024) { setError('Profile pictures must be 2 MB or smaller.'); return }
    setUploading(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Your session has expired.'); setUploading(false); return }
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${user.id}/${crypto.randomUUID()}.${extension}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { cacheControl: '3600', upsert: false })
    if (uploadError) { setError(uploadError.message); setUploading(false); return }
    const { data: publicFile } = supabase.storage.from('avatars').getPublicUrl(path)
    const { error: updateError } = await supabase.from('profiles').update({ avatar_url: publicFile.publicUrl }).eq('id', user.id)
    if (updateError) setError(updateError.message)
    else setProfile((previous) => previous ? { ...previous, avatarUrl: publicFile.publicUrl } : previous)
    setUploading(false)
  }

  if (loading) return <main className="page-shell profile-page"><p className="loading-state">Loading profile...</p></main>
  if (error || !profile) return <main className="page-shell profile-page"><div className="error-state"><h1>Profile unavailable</h1><p>{error}</p>{onLogin && <button className="button button--primary" onClick={onLogin}>Log in</button>}</div></main>

  return <main className="page-shell profile-page"><div className="profile-header"><div><span className="kicker">PLAYER PROFILE</span><h1>{profile.username}</h1><p>{profile.email ?? 'Authenticated player'} · Member since {new Date(profile.createdAt).toLocaleDateString()}</p><label className="avatar-upload">{uploading ? 'Uploading...' : 'Change picture'}<input accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAvatar(file); event.currentTarget.value = '' }} type="file" /></label>{error && <p className="form-error" role="alert">{error}</p>}</div><div className="profile-avatar">{profile.avatarUrl ? <img alt={`${profile.username} profile`} src={profile.avatarUrl} /> : <span>{profile.username.slice(0, 2).toUpperCase()}</span>}</div></div><div className="profile-stat-grid"><Stat label="ELO RATING" value={profile.elo.toLocaleString()} /><Stat label="GAMES PLAYED" value={profile.gamesPlayed.toString()} /><Stat label="WINS" value={profile.wins.toString()} /><Stat label="LOSSES" value={profile.losses.toString()} /><Stat label="DRAWS" value={profile.draws.toString()} /><Stat label="CURRENT STREAK" value={profile.currentWinStreak.toString()} /><Stat label="BEST STREAK" value={profile.bestWinStreak.toString()} /></div></main>
}

function Stat({ label, value }: { label: string; value: string }) { return <div className="profile-stat"><span>{label}</span><strong>{value}</strong></div> }

export type { ProfileProps }
export default Profile
