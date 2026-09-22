import type { TileState } from '../types/game'

export const WORD_LENGTH = 5
export const DEFAULT_MAX_GUESSES = 6

export function evaluateGuess(guess: string, answer: string): TileState[] {
  const normalizedGuess = guess.toLowerCase()
  const normalizedAnswer = answer.toLowerCase()
  const result = Array<TileState>(WORD_LENGTH).fill('gray')
  const remainingAnswer = normalizedAnswer.split('')

  for (let index = 0; index < WORD_LENGTH; index += 1) {
    if (normalizedGuess[index] === normalizedAnswer[index]) {
      result[index] = 'green'
      remainingAnswer[index] = ''
    }
  }

  for (let index = 0; index < WORD_LENGTH; index += 1) {
    if (result[index] === 'green') continue
    const answerIndex = remainingAnswer.indexOf(normalizedGuess[index])
    if (answerIndex >= 0) {
      result[index] = 'yellow'
      remainingAnswer[answerIndex] = ''
    }
  }

  return result
}

export function hasFiveLetters(word: string): boolean {
  return /^[a-zA-Z]{5}$/.test(word)
}

export function isAllowedWord(word: string, allowedWords: readonly string[]): boolean {
  const normalizedWord = word.toLowerCase()
  return hasFiveLetters(normalizedWord) && allowedWords.some((allowedWord) => allowedWord.toLowerCase() === normalizedWord)
}

export function isSolved(guess: string, answer: string): boolean {
  return hasFiveLetters(guess) && guess.toLowerCase() === answer.toLowerCase()
}

export function isGuessSolved(tileStates: readonly TileState[]): boolean {
  return tileStates.length === WORD_LENGTH && tileStates.every((state) => state === 'green')
}

export function remainingGuesses(usedGuesses: number, maximumGuesses = DEFAULT_MAX_GUESSES): number {
  return Math.max(0, maximumGuesses - Math.max(0, usedGuesses))
}
