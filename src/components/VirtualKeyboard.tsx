const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM']

interface Props {
  onLetter: (letter: string) => void
  disabled: boolean
}

export default function VirtualKeyboard({ onLetter, disabled }: Props) {
  return <div className="virtual-keyboard" aria-label="Bàn phím chữ ảo">
    {ROWS.map(row => <div className="virtual-keyboard-row" key={row}>
      {[...row].map(letter => <button key={letter} type="button" disabled={disabled} data-no-button-sfx
        aria-label={`Bắn chữ ${letter}`} onClick={() => onLetter(letter)}>{letter}</button>)}
    </div>)}
  </div>
}
