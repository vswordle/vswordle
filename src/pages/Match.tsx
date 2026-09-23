import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { GameBoard } from '../components/GameBoard'
import { finishMatch, submitGuess, subscribeToMatch, type MatchUpdate, type SubmitGuessResponse } from '../lib/multiplayer'
import type { KeyboardState } from '../components/Keyboard'
import type { TileState } from '../types/game'

export function Match() {
  const { matchId = '' } = useParams()
  const navigate = useNavigate()
  const [guesses, setGuesses] = useState<string[]>([])
  const [tileResults, setTileResults] = useState<TileState[][]>([])
  const [currentGuess, setCurrentGuess] = useState('')
  const [keyboardState, setKeyboardState] = useState<KeyboardState>({})
  const [status, setStatus] = useState('Match active. Find the word.')
  const [opponent, setOpponent] = useState<SubmitGuessResponse['opponentProgress']>({ guessesUsed: 0, rows: [], hasSolved: false, isFinished: false })
  const [finished, setFinished] = useState(false)

  useEffect(() => subscribeToMatch(matchId, (update: MatchUpdate) => {
    if (update.status === 'finished') { setFinished(true); setStatus(`Match finished: ${update.result ?? 'draw'}.`) }
  }), [matchId])

  const updateKeyboard = (word: string, results: TileState[]) => {
    const priority: Record<TileState, number> = { empty: 0, filled: 0, gray: 1, yellow: 2, green: 3 }
    setKeyboardState((previous) => word.split('').reduce<KeyboardState>((next, letter, index) => {
      if (priority[results[index]] > priority[next[letter] ?? 'empty']) next[letter] = results[index]
      return next
    }, { ...previous }))
  }

  const submit = async (word = currentGuess) => {
    if (finished || word.length !== 5) { if (word.length !== 5) setStatus('Enter five letters.'); return }
    try {
      const result = await submitGuess(matchId, word)
      const results = result.statuses as TileState[]
      setGuesses((previous) => [...previous, word.toLowerCase()])
      setTileResults((previous) => [...previous, results])
      updateKeyboard(word, results)
      setOpponent(result.opponentProgress)
      setCurrentGuess('')
      if (result.matchFinished) { setFinished(true); setStatus(`Match finished: ${result.result ?? 'draw'}.`) }
      else if (result.solved) setStatus('Solved. Waiting for the match result.')
      else setStatus('Guess recorded.')
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Could not submit guess.') }
  }

  const handleKey = (key: string) => {
    if (finished) return
    if (key === 'Enter') { void submit(); return }
    if (key === 'Backspace' || key === 'Delete') { setCurrentGuess((previous) => previous.slice(0, -1)); return }
    if (/^[A-Z]$/.test(key) && currentGuess.length < 5) setCurrentGuess((previous) => previous + key.toLowerCase())
  }

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      const key = event.key === 'Enter' || event.key === 'Backspace' || event.key === 'Delete' ? event.key : event.key.toUpperCase()
      if (key === 'Enter' || key === 'Backspace' || key === 'Delete' || /^[A-Z]$/.test(key)) { event.preventDefault(); handleKey(key) }
    }
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  })

  return <main className="page-shell practice-page"><button className="back-link" onClick={() => navigate('/')}>[ back ]</button><div className="page-heading"><span className="kicker">LIVE MATCH</span><h1>Make your move.</h1><p>{status}</p></div><GameBoard currentGuess={currentGuess} guesses={guesses} keyboardState={keyboardState} mode="public" onKeyPress={handleKey} opponentProgress={opponent} status={status} tileResults={tileResults} /><div className="practice-footer">{finished ? <button className="button button--primary" onClick={() => navigate('/')}>Back home</button> : <span>Guesses are verified by Supabase.</span>}{finished && <button className="button button--quiet" onClick={() => void finishMatch(matchId)}>Refresh result</button>}</div></main>
}

export default Match
