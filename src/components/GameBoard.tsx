import type { GameMode, OpponentProgress, TileState } from '../types/game'
import { Keyboard, type KeyboardState } from './Keyboard'
import { OpponentBoard } from './OpponentBoard'
import { WordleBoard } from './WordleBoard'

interface GameBoardProps {
  mode: GameMode
  guesses: string[]
  currentGuess: string
  tileResults: TileState[][]
  keyboardState: KeyboardState
  opponentProgress?: OpponentProgress
  status: string
  maximumGuesses?: number
  interactive?: boolean
  onKeyPress: (key: string) => void
}

export function GameBoard({
  mode,
  guesses,
  currentGuess,
  tileResults,
  keyboardState,
  opponentProgress,
  status,
  maximumGuesses = 6,
  interactive = true,
  onKeyPress,
}: GameBoardProps) {
  const isMultiplayer = mode !== 'practice'

  return (
    <section className={`game-board game-board--${mode}`} aria-label={`${mode} game`}>
      <div className="game-board__status">
        <span>{status}</span>
        <span>{guesses.length}/{maximumGuesses} guesses</span>
      </div>
      <div className={isMultiplayer ? 'game-board__layout game-board__layout--multiplayer' : 'game-board__layout'}>
        {isMultiplayer && opponentProgress && (
          <OpponentBoard
            guessesMade={opponentProgress.guessesUsed}
            hasFinished={opponentProgress.isFinished}
            maximumGuesses={maximumGuesses}
            tileResults={opponentProgress.rows}
          />
        )}
        <div className="game-board__player">
          <WordleBoard
            currentGuess={currentGuess}
            guesses={guesses}
            interactive={interactive}
            maximumGuesses={maximumGuesses}
            tileResults={tileResults}
          />
          {interactive && <Keyboard disabled={status.includes('Solved') || status.startsWith('The answer was')} keyStates={keyboardState} onKeyPress={onKeyPress} />}
        </div>
      </div>
    </section>
  )
}

export type { GameBoardProps }
