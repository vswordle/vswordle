import type { TileState } from '../types/game'

interface WordleBoardProps {
  guesses: string[]
  currentGuess: string
  tileResults: TileState[][]
  maximumGuesses?: number
  interactive?: boolean
}

const WORD_LENGTH = 5
const DEFAULT_MAXIMUM_GUESSES = 6

export function WordleBoard({
  guesses,
  currentGuess,
  tileResults,
  maximumGuesses = DEFAULT_MAXIMUM_GUESSES,
  interactive = false,
}: WordleBoardProps) {
  const rows = Array.from({ length: maximumGuesses }, (_, rowIndex) => {
    const guess = guesses[rowIndex] ?? (rowIndex === guesses.length ? currentGuess : '')
    const result = tileResults[rowIndex] ?? []

    return (
      <div className="board-row" key={`row-${rowIndex}`}>
        {Array.from({ length: WORD_LENGTH }, (_, columnIndex) => {
          const letter = guess[columnIndex] ?? ''
          const state = result[columnIndex] ?? (letter ? 'filled' : 'empty')
          const label = letter
            ? `${letter}, ${state} tile, row ${rowIndex + 1}, column ${columnIndex + 1}`
            : `Empty tile, row ${rowIndex + 1}, column ${columnIndex + 1}`

          return (
            <div
              aria-label={label}
              className={`tile tile--${state}`}
              data-interactive={interactive || undefined}
              key={`tile-${rowIndex}-${columnIndex}`}
              role="img"
            >
              {letter}
            </div>
          )
        })}
      </div>
    )
  })

  return <div aria-label="Wordle board" className="board">{rows}</div>
}

export type { WordleBoardProps }
