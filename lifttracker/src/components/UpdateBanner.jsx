// Slim banner under the Home header. Only Home renders it; the update state
// comes from App so the service worker is registered on every screen.
export default function UpdateBanner({ ready, apply }) {
  if (!ready) return null
  return (
    <div className="mt-2 flex items-center gap-3 rounded-xl border border-act/50 bg-card px-4 py-2">
      <span className="min-w-0 flex-1 text-[15px] font-semibold">New version ready</span>
      <button type="button" onClick={apply} className="h-11 shrink-0 px-2 font-semibold text-act">
        Update
      </button>
    </div>
  )
}
