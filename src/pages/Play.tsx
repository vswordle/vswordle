import { useEffect, useState } from 'react'
import { joinMatchmaking, leaveMatchmaking, subscribeToMatch, type MatchUpdate } from '../lib/multiplayer'

export function Play() {
  const [matchId, setMatchId] = useState('')
  const [status, setStatus] = useState('Ready to find an opponent.')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!matchId) return undefined
    return subscribeToMatch(matchId, (update: MatchUpdate) => {
      setStatus(update.status === 'finished' ? `Match finished: ${update.result ?? 'draw'}.` : 'Opponent found. Match active.')
    })
  }, [matchId])

  const findMatch = async () => {
    setLoading(true); setStatus('Finding an opponent...')
    try {
      const result = await joinMatchmaking()
      if (result.matchId) { setMatchId(result.matchId); setStatus('Opponent found. Match active.') }
      else setStatus('You are in the queue. We are widening the search as you wait.')
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Could not join matchmaking.') }
    setLoading(false)
  }

  const leave = async () => { await leaveMatchmaking(); setMatchId(''); setStatus('You left the matchmaking queue.') }

  return <main className="page-shell match-page"><span className="kicker">PUBLIC 1V1</span><h1>Find your match.</h1><p className="match-copy">Players are paired by ELO proximity. The acceptable range expands while you wait.</p><div className="match-status"><strong>{status}</strong>{matchId && <small>Match ID: {matchId}</small>}</div><div className="hero-actions"><button className="button button--primary" disabled={loading || Boolean(matchId)} onClick={() => void findMatch}>{loading ? 'Searching...' : 'Find opponent'} <span>↗</span></button><button className="button button--quiet" onClick={() => void leave}>Leave queue</button></div></main>
}

export default Play
