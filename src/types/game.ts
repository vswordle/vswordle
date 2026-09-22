export type TileState = 'empty' | 'filled' | 'green' | 'yellow' | 'gray'

export interface GuessResult {
  word: string
  tiles: TileState[]
  isCorrect: boolean
}

export interface PlayerGameState {
  playerId: string
  guesses: GuessResult[]
  currentGuess: string
  hasSolved: boolean
  solvedAtGuess?: number
  isFinished: boolean
}

export interface OpponentProgress {
  guessesUsed: number
  rows: Array<Exclude<TileState, 'empty' | 'filled'>[]>
  hasSolved: boolean
  isFinished: boolean
}

export type GameMode = 'practice' | 'public' | 'private'

export type MatchStatus = 'waiting' | 'active' | 'finished' | 'cancelled'

export type MatchResult = 'win' | 'loss' | 'draw'

export interface Lobby {
  id: string
  code: string
  hostId: string
  guestId?: string
  mode: Extract<GameMode, 'private'>
  status: 'waiting' | 'ready' | 'started' | 'closed'
  createdAt: string
  expiresAt?: string
}

export interface Match {
  id: string
  mode: GameMode
  status: MatchStatus
  playerOneId: string
  playerTwoId?: string
  lobbyId?: string
  playerOneState: PlayerGameState
  playerTwoState?: PlayerGameState
  opponentProgress?: OpponentProgress
  result?: MatchResult
  winnerId?: string
  createdAt: string
  startedAt?: string
  finishedAt?: string
}

export interface PlayerStats {
  playerId: string
  username: string
  email?: string
  elo: number
  gamesPlayed: number
  wins: number
  losses: number
  draws: number
  currentWinStreak: number
  bestWinStreak: number
  createdAt: string
}

export interface ELOInformation {
  rating: number
  opponentRating: number
  expectedScore: number
  actualScore: 0 | 0.5 | 1
  ratingChange: number
  newRating: number
  kFactor: number
}
