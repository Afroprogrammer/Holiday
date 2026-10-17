// Home's bottom area while a workout runs (gym round 2, 3.3): one tap back
// in, with the live count, elapsed time and rest state in the button, and
// Discard behind a sheet the screen owns. `flash` is the rest-end moment.
export default function ResumeCard({ summary, dayName, flash = false, onResume, onDiscard }) {
  const caption = [`${summary.done} / ${summary.total} sets`, summary.elapsedText, summary.restText].filter(Boolean).join(' · ')
  return (
    <>
      <button
        type="button"
        onClick={onResume}
        className={`flex h-[60px] w-full flex-col items-center justify-center rounded-2xl bg-act text-on-act ${flash ? 'ring-4 ring-act/40' : ''}`}
      >
        <span className="text-lg font-semibold leading-tight">Resume {dayName}</span>
        <span className={`font-num text-[13px] leading-tight ${flash ? 'font-semibold' : 'font-medium opacity-80'}`}>{caption}</span>
      </button>
      <button type="button" onClick={onDiscard} className="h-[52px] rounded-2xl border border-rule font-semibold text-ink-2">
        Discard workout
      </button>
    </>
  )
}
