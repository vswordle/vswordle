import type { TileState } from '../types/game'

export type KeyboardKey = 'Enter' | 'Backspace' | string
export type KeyboardState = Record<string, TileState>

interface KeyboardProps {
  keyStates?: KeyboardState
  onKeyPress: (key: KeyboardKey) => void
  disabled?: boolean
}

const KEY_ROWS: KeyboardKey[][] = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Enter', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Backspace'],
]

export function Keyboard({ keyStates = {}, onKeyPress, disabled = false }: KeyboardProps) {
  return (
    <div aria-label="On-screen keyboard" className="keyboard">
      {KEY_ROWS.map((row, rowIndex) => (
        <div className="keyboard-row" key={`keyboard-row-${rowIndex}`}>
          {row.map((key) => {
            const state = keyStates[key] ?? 'empty'
            const isActionKey = key === 'Enter' || key === 'Backspace'
            return (
              <button
                aria-label={key === 'Backspace' ? 'Backspace' : key}
                className={`keyboard-key keyboard-key--${state} ${isActionKey ? 'keyboard-key--wide' : ''}`}
                disabled={disabled}
                key={key}
                onClick={() => onKeyPress(key)}
                type="button"
              >
                {key === 'Backspace' ? '⌫' : key}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

export type { KeyboardProps }
