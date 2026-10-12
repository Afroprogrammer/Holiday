import { useEffect } from 'react'

// Scrim plus a sheet that rises from the bottom. Used instead of modals and
// window.confirm: pick a day, finish with sets remaining, reset the cycle.
export default function BottomSheet({ open, title, children, onClose }) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-20">
      <div data-testid="scrim" onClick={onClose} className="absolute inset-0 bg-canvas/80" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-rule bg-card px-5 pt-3.5 pb-[calc(24px+env(safe-area-inset-bottom,0px))]"
      >
        <div className="mx-auto mb-3.5 h-1 w-10 rounded-full bg-rule" />
        <h2 className="font-num text-[28px] font-bold uppercase leading-none">{title}</h2>
        {children}
      </div>
    </div>
  )
}
