import type { OpponentProgress, TileState } from '../types/game'

interface OpponentBoardProps {
  guessesMade: number
  tileResults: OpponentProgress['rows']
  hasFinished?: boolean
  maximumGuesses?: number
}

const WORD_LENGTH = 5
const DEFAULT_MAXIMUM_GUESSES = 6

export function OpponentBoard({
  guessesMade,
  tileResults,
  hasFinished = false,
  maximumGuesses = DEFAULT_MAXIMUM_GUESSES,
}: OpponentBoardProps) {
  return (
    <section aria-label="Opponent progress" className="opponent-board">
      <div className="opponent-board__header">
        <span>OPPONENT</span>
        <span>{hasFinished ? 'FINISHED' : `${guessesMade}/${maximumGuesses} GUESSES`}</span>
      </div>
      <div className="opponent-board__grid" aria-label="Opponent tile colors only">
        {Array.from({ length: maximumGuesses }, (_, rowIndex) => {
          const row = tileResults[rowIndex] ?? []
          return (
            <div className="opponent-board__row" key={`opponent-row-${rowIndex}`}>
              {Array.from({ length: WORD_LENGTH }, (_, columnIndex) => {
                const isUnplayed = row[columnIndex] === undefined
                const state: TileState = isUnplayed ? 'empty' : row[columnIndex]
                return (
                  <span
                    aria-label={isUnplayed ? 'Unplayed opponent tile' : `Opponent ${state} tile`}
                    className={`opponent-tile opponent-tile--${state}`}
                    key={`opponent-tile-${rowIndex}-${columnIndex}`}
                    role="img"
                  />
                )
              })}
            </div>
          )
        })}
      </div>
    </section>
  )
}

export type { OpponentBoardProps }
