// The large weight and reps steppers of the active set. Minus and plus are
// 64 px columns; the value is editable by tapping it. See the spec's
// "Workout" section for sizes.
export default function Stepper({ value, onChange, step, size, unit, onFlipUnit, caption, label, inputMode }) {
  const num = value === '' ? 0 : Number(value)
  const bump = (delta) => onChange(String(Math.max(0, Math.round((num + delta) * 100) / 100)))
  const tall = size === 'weight'
  const valueClass = tall ? 'text-[56px]' : 'text-[44px]'
  return (
    <div className={`grid grid-cols-[64px_1fr_64px] overflow-hidden rounded-2xl border border-rule bg-card ${tall ? 'h-[92px]' : 'h-[76px]'}`}>
      <button type="button" aria-label={`${label} minus`} onClick={() => bump(-step)} className="border-r border-rule font-num text-[40px] leading-none text-ink-2">
        −
      </button>
      <div className="flex flex-col items-center justify-center">
        <div className="flex items-baseline">
          <input
            type="text"
            inputMode={inputMode}
            aria-label={label}
            value={value}
            onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
            size={Math.max(1, value.length)}
            className={`m-0 h-[1em] w-auto min-w-[3ch] bg-transparent p-0 text-center font-num font-bold leading-none tracking-tight outline-none ${valueClass}`}
          />
          {unit &&
            (onFlipUnit ? (
              <button type="button" onClick={onFlipUnit} aria-label={`Unit ${unit}, tap to switch`} className="ml-1.5 inline-flex min-h-11 min-w-11 items-center justify-center font-num text-[22px] font-semibold text-act">
                {unit}
              </button>
            ) : (
              <span className="ml-1.5 font-num text-[22px] font-semibold text-act">{unit}</span>
            ))}
        </div>
        {caption && <span className="mt-1 text-[13px] leading-none font-medium text-ink-3">{caption}</span>}
      </div>
      <button type="button" aria-label={`${label} plus`} onClick={() => bump(step)} className="border-l border-rule font-num text-[40px] leading-none text-ink-2">
        +
      </button>
    </div>
  )
}
