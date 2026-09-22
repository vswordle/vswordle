import { useState } from 'react'
import { createPrivateLobby, joinPrivateLobby } from '../lib/multiplayer'
import { ensureAnonymousSession } from '../lib/supabase'

export function Private() {
  const [lobbyCode, setLobbyCode] = useState('')
  const [createdCode, setCreatedCode] = useState('')
  const [matchId, setMatchId] = useState('')
  const [message, setMessage] = useState('Create a lobby or join a friend with their code.')
  const [loading, setLoading] = useState(false)

  const create = async () => {
    setLoading(true)
    try { await ensureAnonymousSession(); const result = await createPrivateLobby(); setCreatedCode(result.lobbyCode); setMessage('Share this code with your opponent.') }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not create lobby.') }
    setLoading(false)
  }
  const join = async () => {
    setLoading(true)
    try { await ensureAnonymousSession(); const result = await joinPrivateLobby(lobbyCode); setMatchId(result.matchId); setMessage('Lobby joined. Match active.') }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not join lobby.') }
    setLoading(false)
  }

  return <main className="page-shell private-page"><span className="kicker">PRIVATE MATCH</span><h1>Bring your rivalry.</h1><p className="match-copy">Create a private lobby and share its five-character code. The server creates one shared secret word when the second player joins.</p><div className="private-actions"><section><h2>Create lobby</h2>{createdCode ? <strong className="lobby-code">{createdCode}</strong> : <button className="button button--primary" disabled={loading} onClick={() => void create}>Create lobby <span>↗</span></button>}</section><section><h2>Join lobby</h2><input aria-label="Lobby code" maxLength={5} onChange={(event) => setLobbyCode(event.target.value.toUpperCase())} placeholder="ABCDE" value={lobbyCode} /><button className="button button--primary" disabled={loading || lobbyCode.length !== 5} onClick={() => void join}>Join <span>↗</span></button></section></div><p className="match-status"><strong>{message}</strong>{matchId && <small>Match ID: {matchId}</small>}</p></main>
}

export default Private
