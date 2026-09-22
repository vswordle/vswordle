export type GameMode = 'practice' | 'public' | 'private'

export type TileStatus = 'empty' | 'correct' | 'present' | 'absent'

export interface GuessResult {
  word: string
  statuses: TileStatus[]
}

export interface OpponentRow {
  statuses: Exclude<TileStatus, 'empty'>[]
}

export interface PlayerProfile {
  id: string
  username: string
  email: string
  elo: number
  gamesPlayed: number
  wins: number
  losses: number
  draws: number
  currentWinStreak: number
  bestWinStreak: number
  createdAt: string
}

export interface MatchSummary {
  id: string
  mode: GameMode
  status: 'waiting' | 'active' | 'finished'
  opponentName?: string
  opponentElo?: number
  secretWord?: string
  winnerId?: string
  result?: 'win' | 'loss' | 'draw'
}
