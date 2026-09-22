import type { GuessResult, TileStatus } from './types'

export const WORD_LENGTH = 5
export const MAX_GUESSES = 6

export function scoreGuess(guess: string, answer: string): TileStatus[] {
  const normalizedGuess = guess.toLowerCase()
  const normalizedAnswer = answer.toLowerCase()
  const statuses = Array<TileStatus>(WORD_LENGTH).fill('absent')
  const remaining = normalizedAnswer.split('')

  for (let index = 0; index < WORD_LENGTH; index += 1) {
    if (normalizedGuess[index] === normalizedAnswer[index]) {
      statuses[index] = 'correct'
      remaining[index] = ''
    }
  }

  for (let index = 0; index < WORD_LENGTH; index += 1) {
    if (statuses[index] === 'correct') continue
    const matchIndex = remaining.indexOf(normalizedGuess[index])
    if (matchIndex >= 0) {
      statuses[index] = 'present'
      remaining[matchIndex] = ''
    }
  }

  return statuses
}

export function isWinningGuess(result: GuessResult): boolean {
  return result.statuses.every((status) => status === 'correct')
}

export function expectedScore(playerRating: number, opponentRating: number): number {
  return 1 / (1 + 10 ** ((opponentRating - playerRating) / 400))
}

export function calculateElo(
  playerRating: number,
  opponentRating: number,
  actualScore: 0 | 0.5 | 1,
  kFactor = 32,
): number {
  return Math.round(playerRating + kFactor * (actualScore - expectedScore(playerRating, opponentRating)))
}
