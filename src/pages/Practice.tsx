import { useEffect, useMemo, useState } from 'react'
import { GameBoard } from '../components/GameBoard'
import { evaluateGuess, hasFiveLetters, isAllowedWord, isGuessSolved, remainingGuesses } from '../lib/wordle'
import type { KeyboardState } from '../components/Keyboard'
import type { TileState } from '../types/game'

const ALLOWED_WORDS = ['apple', 'brave', 'crane', 'crisp', 'dream', 'flame', 'grape', 'house', 'light', 'ocean', 'plant', 'proud', 'quiet', 'river', 'scale', 'sharp', 'smile', 'stone', 'train', 'world']

function chooseAnswer(words: readonly string[]): string {
  return words[Math.floor(Math.random() * words.length)]
}

export function Practice() {
  const [answer, setAnswer] = useState(() => chooseAnswer(ALLOWED_WORDS))
  const [guesses, setGuesses] = useState<string[]>([])
  const [tileResults, setTileResults] = useState<TileState[][]>([])
  const [currentGuess, setCurrentGuess] = useState('')
  const [keyboardState, setKeyboardState] = useState<KeyboardState>({})
  const [message, setMessage] = useState('Find the hidden five-letter word.')

  const solved = tileResults.some(isGuessSolved)
  const finished = solved || guesses.length >= 6
  const guessesRemaining = remainingGuesses(guesses.length)
  const resultMessage = useMemo(() => {
    if (solved) return `Solved in ${guesses.length} ${guesses.length === 1 ? 'guess' : 'guesses'}.`
    if (finished) return `The answer was ${answer.toUpperCase()}.`
    return message
  }, [answer, finished, guesses.length, message, solved])

  const updateKeyboard = (guess: string, results: TileState[]) => {
    setKeyboardState((previous) => guess.split('').reduce<KeyboardState>((next, letter, index) => {
      const state = results[index]
      const priority = { empty: 0, filled: 0, gray: 1, yellow: 2, green: 3 }
      if ((priority[state] ?? 0) > (priority[next[letter] ?? 'empty'] ?? 0)) next[letter] = state
      return next
    }, { ...previous }))
  }

  const submitGuess = () => {
    const guess = currentGuess.toLowerCase()
    if (finished) return
    if (!hasFiveLetters(guess)) { setMessage('Guesses must contain five letters.'); return }
    if (!isAllowedWord(guess, ALLOWED_WORDS)) { setMessage('That word is not in the practice list.'); return }

    const results = evaluateGuess(guess, answer)
    setGuesses((previous) => [...previous, guess])
    setTileResults((previous) => [...previous, results])
    updateKeyboard(guess, results)
    setCurrentGuess('')
    setMessage(isGuessSolved(results) ? 'You found it.' : `${guessesRemaining - 1} guesses remaining.`)
  }

  const handleKeyPress = (key: string) => {
    if (finished) return
    const normalizedKey = key.toUpperCase()
    if (normalizedKey === 'ENTER') { submitGuess(); return }
    if (normalizedKey === 'BACKSPACE' || normalizedKey === 'DELETE') { setCurrentGuess((previous) => previous.slice(0, -1)); return }
    if (/^[A-Z]$/.test(normalizedKey) && currentGuess.length < 5) setCurrentGuess((previous) => previous + normalizedKey.toLowerCase())
  }

  useEffect(() => {
    const handlePhysicalKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (event.key === 'Enter' || event.key === 'Backspace' || event.key === 'Delete' || /^[a-zA-Z]$/.test(event.key)) {
        event.preventDefault()
        handleKeyPress(event.key)
      }
    }
    window.addEventListener('keydown', handlePhysicalKey)
    return () => window.removeEventListener('keydown', handlePhysicalKey)
  })

  const newGame = () => {
    setAnswer(chooseAnswer(ALLOWED_WORDS)); setGuesses([]); setTileResults([]); setCurrentGuess(''); setKeyboardState({}); setMessage('Find the hidden five-letter word.')
  }

  return (
    <main className="page-shell practice-page">
      <div className="page-heading"><span className="kicker">PRACTICE MODE</span><h1>Find the word.</h1><p>Six tries. No pressure. Nothing touches your rating.</p></div>
      <GameBoard
        currentGuess={currentGuess}
        guesses={guesses}
        keyboardState={keyboardState}
        mode="practice"
          onKeyPress={handleKeyPress}
        status={resultMessage}
        tileResults={tileResults}
      />
      <div className="practice-footer"><span>{guessesRemaining} guesses remaining</span>{finished && <button className="button button--primary" onClick={newGame}>New game <span>↗</span></button>}</div>
    </main>
  )
}

export default Practice
