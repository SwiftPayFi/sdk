import './ModeSelector.css'

type CheckoutMode = 'popup' | 'iframe' | 'redirect'

interface ModeSelectorProps {
  currentMode: CheckoutMode
  onModeChange: (mode: CheckoutMode) => void
}

const MODES: CheckoutMode[] = ['popup', 'iframe', 'redirect']

export default function ModeSelector({ currentMode, onModeChange }: ModeSelectorProps) {
  return (
    <div className="checkout-modes">
      <h2>Checkout Mode</h2>
      <div className="mode-buttons">
        {MODES.map((mode) => (
          <button
            key={mode}
            className={`mode-btn ${currentMode === mode ? 'active' : ''}`}
            onClick={() => onModeChange(mode)}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>
    </div>
  )
}
