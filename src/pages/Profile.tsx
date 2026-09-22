import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { PlayerStats } from '../types/game'

interface ProfileProps {
  onLogin?: () => void
}

export function Profile({ onLogin }: ProfileProps) {
  const [profile, setProfile] = useState<PlayerStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    const loadProfile = async () => {
      if (!supabase) { if (mounted) { setError('Connect Supabase to load your profile.'); setLoading(false) }; return }
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) { if (mounted) { setError('Log in to view your profile.'); setLoading(false) }; return }
      const { data, error: profileError } = await supabase.from('profiles').select('id, username, elo, games_played, wins, losses, draws, current_streak, best_streak, created_at').eq('id', user.id).single()
      if (profileError || !data) { if (mounted) { setError(profileError?.message ?? 'Profile not found.'); setLoading(false) }; return }
      if (mounted) {
        setProfile({ playerId: data.id, username: data.username, email: user.email, elo: data.elo, gamesPlayed: data.games_played, wins: data.wins, losses: data.losses, draws: data.draws, currentWinStreak: data.current_streak, bestWinStreak: data.best_streak, createdAt: data.created_at })
        setLoading(false)
      }
    }
    void loadProfile()
    return () => { mounted = false }
  }, [])

  if (loading) return <main className="page-shell profile-page"><p className="loading-state">Loading profile...</p></main>
  if (error || !profile) return <main className="page-shell profile-page"><div className="error-state"><h1>Profile unavailable</h1><p>{error}</p>{onLogin && <button className="button button--primary" onClick={onLogin}>Log in</button>}</div></main>

  return <main className="page-shell profile-page"><div className="profile-header"><div><span className="kicker">PLAYER PROFILE</span><h1>{profile.username}</h1><p>{profile.email ?? 'Authenticated player'} · Member since {new Date(profile.createdAt).toLocaleDateString()}</p></div><div className="avatar avatar--yellow avatar--large">{profile.username.slice(0, 2).toUpperCase()}</div></div><div className="profile-stat-grid"><Stat label="ELO RATING" value={profile.elo.toLocaleString()} /><Stat label="GAMES PLAYED" value={profile.gamesPlayed.toString()} /><Stat label="WINS" value={profile.wins.toString()} /><Stat label="LOSSES" value={profile.losses.toString()} /><Stat label="DRAWS" value={profile.draws.toString()} /><Stat label="CURRENT STREAK" value={profile.currentWinStreak.toString()} /><Stat label="BEST STREAK" value={profile.bestWinStreak.toString()} /></div></main>
}

function Stat({ label, value }: { label: string; value: string }) { return <div className="profile-stat"><span>{label}</span><strong>{value}</strong></div> }

export type { ProfileProps }
export default Profile
