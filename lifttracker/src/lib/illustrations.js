// Exercise illustrations ship as three SVG frames per exercise under
// public/illustrations/<slug>/{1,2,3}.svg (start, middle, end of the
// movement). Frame 2 is the resting pose used wherever one frame is shown.
export const ILLUSTRATION_FRAMES = [1, 2, 3]

// Vite exposes the configured base as import.meta.env.BASE_URL ("/" locally,
// "/Holiday/" on GitHub Pages). Tests run in Node where it is undefined.
export function illustrationUrl(slug, frame) {
  const base = (import.meta.env && import.meta.env.BASE_URL) || '/'
  return `${base.replace(/\/$/, '')}/illustrations/${slug}/${frame}.svg`
}
