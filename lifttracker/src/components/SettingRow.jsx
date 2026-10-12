// One settings row: label and caption on the left, a control or chevron on
// the right. With `onClick` the whole row is the tap target.
export default function SettingRow({ label, caption, children, onClick }) {
  const inner = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block text-base">{label}</span>
        {caption && <span className="block text-[13px] text-ink-2">{caption}</span>}
      </span>
      {children}
    </>
  )
  const cls = 'flex min-h-14 w-full items-center gap-3 border-b border-rule py-2 text-left'
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cls}>
        {inner}
      </button>
    )
  }
  return <div className={cls}>{inner}</div>
}
