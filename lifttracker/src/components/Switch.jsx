// A 44×26 toggle. The knob slides; the track takes the accent when on.
export default function Switch({ checked, onChange, label, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className="relative h-11 w-14 shrink-0 disabled:opacity-40"
    >
      <span className={`absolute inset-x-1 top-1/2 h-[26px] -translate-y-1/2 rounded-full transition-colors ${checked ? 'bg-act' : 'border border-rule bg-raised'}`} />
      <span
        className={`absolute top-1/2 h-[22px] w-[22px] -translate-y-1/2 rounded-full transition-transform ${checked ? 'translate-x-[26px] bg-on-act' : 'translate-x-[6px] bg-ink-3'}`}
      />
    </button>
  )
}
