import { illustrationUrl } from '../lib/illustrations.js'

const TONE = {
  'ink-2': 'text-ink-2',
  'ink-3': 'text-ink-3',
  act: 'text-act',
}

// Order matters: the current pose (frame 2) is painted last so it sits on top
// of its ghosts. Each layer is a CSS mask over currentColor, so the figure
// takes whatever tone the surface asks for. Animation and opacities live in
// index.css under `.ill`.
const LAYER_FRAMES = [1, 3, 2]

export default function Illustration({ slug, size, tone = 'ink-2', live = false, glow = false, label = '' }) {
  if (!slug) return null
  const classes = ['ill', TONE[tone] ?? TONE['ink-2'], live ? 'live' : '', glow ? 'glow' : ''].filter(Boolean).join(' ')
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': 'true' }
  return (
    <span className={classes} style={{ width: size, height: size }} {...a11y}>
      {LAYER_FRAMES.map((frame) => (
        <i key={frame} style={{ '--mm': `url("${illustrationUrl(slug, frame)}")` }} />
      ))}
    </span>
  )
}
