import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { GameMode, OpponentProgress } from '../types/game'

export interface SubmitGuessResponse {
  statuses: string[]
  solved: boolean
  guessNumber: number
  matchFinished: boolean
  result?: 'player_one' | 'player_two' | 'draw'
  opponentProgress: OpponentProgress
}

export interface MatchUpdate {
  id: string
  status: string
  player_one_guesses: number
  player_two_guesses: number
  player_one_solved: boolean
  player_two_solved: boolean
  result: string | null
  winner_id: string | null
}

async function invoke<T>(functionName: string, body: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.functions.invoke(functionName, { body })
  if (error) throw error
  return data as T
}

export function createPrivateLobby(): Promise<{ lobbyId: string; lobbyCode: string }> {
  return invoke('lobby', { action: 'create', mode: 'private' })
}

export function joinPrivateLobby(lobbyCode: string): Promise<{ matchId: string }> {
  return invoke('lobby', { action: 'join', lobbyCode: lobbyCode.trim().toUpperCase() })
}

export function leaveLobby(lobbyId: string): Promise<{ success: boolean }> {
  return invoke('lobby', { action: 'leave', lobbyId })
}

export function joinMatchmaking(mode: Extract<GameMode, 'public'> = 'public'): Promise<{ matchId?: string; queued: boolean }> {
  return invoke('matchmaking', { action: 'join', mode })
}

export function leaveMatchmaking(): Promise<{ success: boolean }> {
  return invoke('matchmaking', { action: 'leave' })
}

export function submitGuess(matchId: string, guess: string): Promise<SubmitGuessResponse> {
  return invoke<{
    statuses: string[]
    solved: boolean
    guessNumber: number
    matchFinished: boolean
    result?: 'player_one' | 'player_two' | 'draw'
    opponentProgress: { guessesUsed: number; tileResults: OpponentProgress['rows']; hasSolved: boolean; isFinished: boolean }
  }>('submit-guess', { matchId, guess }).then((response) => ({
    ...response,
    opponentProgress: { guessesUsed: response.opponentProgress.guessesUsed, rows: response.opponentProgress.tileResults, hasSolved: response.opponentProgress.hasSolved, isFinished: response.opponentProgress.isFinished },
  }))
}

export function finishMatch(matchId: string): Promise<Record<string, unknown>> {
  return invoke('finish-match', { matchId })
}

export function requestRematch(matchId: string): Promise<{ matchId: string }> {
  return invoke('match', { action: 'rematch', matchId })
}

export function leaveMatch(matchId: string): Promise<{ success: boolean }> {
  return invoke('match', { action: 'leave', matchId })
}

export function subscribeToMatch(matchId: string, onUpdate: (update: MatchUpdate) => void): () => void {
  const client = supabase
  if (!client) return () => undefined
  const channel: RealtimeChannel = client
    .channel(`match:${matchId}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` }, (payload) => onUpdate(payload.new as MatchUpdate))
    .subscribe()
  return () => { void client.removeChannel(channel) }
}
