// A settings row with a numeric field on the right: "Rest after a set  [90] s".
export default function NumberField({ label, caption, value, suffix, onChange, inputMode = 'numeric' }) {
  const pattern = inputMode === 'decimal' ? /[^0-9.]/g : /[^0-9]/g
  return (
    <label className="flex min-h-14 items-center justify-between gap-3 border-b border-rule py-2">
      <span className="min-w-0">
        <span className="block text-base">{label}</span>
        {caption && <span className="block text-[13px] text-ink-2">{caption}</span>}
      </span>
      <span className="flex shrink-0 items-center gap-1.5">
        <input
          type="text"
          inputMode={inputMode}
          value={value}
          aria-label={label}
          onChange={(e) => onChange(e.target.value.replace(pattern, ''))}
          className="h-11 w-16 rounded-lg border border-rule bg-raised px-2 text-right font-num text-2xl font-semibold outline-none focus:border-act"
        />
        <span className="w-5 text-sm text-ink-2">{suffix}</span>
      </span>
    </label>
  )
}
