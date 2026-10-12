// A rest duration in seconds, edited with a number field.
export default function SecondsField({ label, value, onChange }) {
  return (
    <label className="flex items-center justify-between gap-3 border-b border-rule py-2">
      <span className="text-ink-2">{label}</span>
      <span className="flex items-baseline gap-1">
        <input
          type="text"
          inputMode="numeric"
          value={value}
          aria-label={label}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
          className="w-16 rounded-md border border-rule bg-raised px-2 py-1 text-right font-num text-base font-semibold tabular-nums outline-none"
        />
        <span className="text-sm text-ink-2">s</span>
      </span>
    </label>
  )
}
