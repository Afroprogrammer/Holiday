#!/usr/bin/env bash
# Copies the three SVG frames for each exercise we ship from the Workout Guide
# repository (CC BY-SA 4.0, see ATTRIBUTION.md). Run once; files are committed.
set -euo pipefail
cd "$(dirname "$0")/.."
BASE="https://raw.githubusercontent.com/bryllim/workout-guide/main/packages/workout-guide/assets"
SLUGS="bench-press machine-chest-press seated-dumbbell-press dip cable-crunch assisted-pull-up seated-row shrug dumbbell-shrug bicep-curl hanging-knee-raise cable-woodchop incline-dumbbell-press overhead-press tricep-pushdown decline-sit-up deadlift lat-pulldown barbell-row weighted-crunch"
for slug in $SLUGS; do
  mkdir -p "public/illustrations/$slug"
  for frame in 1 2 3; do
    out="public/illustrations/$slug/$frame.svg"
    curl -fsSL "$BASE/$slug/frame-$frame.svg" -o "$out"
    grep -q '<svg' "$out" || { echo "bad file $out" >&2; exit 1; }
  done
  echo "$slug"
done
