# DESIGN.md — Black Belt Cut
# Per-project design contract. The skill obeys this file exactly.
# Fill it once per project; this is what stops output drifting between sessions.
# It describes the look as shipped. Existing CSS stays exactly as it is; these rules govern new UI.

---
aesthetic: "black-and-white training HUD: an ink-black mat under a faint grid, white type and hairlines, square panels with corner ticks, fight-poster headings, mono labels; ranks and quests open in a manhwa System window"
references:
  - "Solo Leveling's System status window (ranks, quests, the Awakening Trial)"
  - "fight-night poster type: condensed, uppercase, heavy"
  - "a dojo belt wall"

colors:
  palette: "the :root variables at the top of index.html, plus the colours written directly into its CSS"
  rule: "every existing colour stays exactly as shipped; new UI reuses the existing :root variables and adds no new colour"
  # No six-token cap on this project: one user, one dark theme (kern, 2026-10-12).
  # Belt colours are the real, universal belt colours.
  # Red (--danger) is for cravings and errors only.
  # Exception (his request, 2026-10-13, Questism-style): rank tiers carry colour, --t-F to --t-S
  # (grey, silver, sand, green, cyan, orange, blood red with a strong glow), on rank letters, rank badges and the
  # 7-segment status bars only. S is the one red that doesn't mean a craving or an error; he picked it to match the Red Gate.
  # manifest.webmanifest and the theme-color meta repeat --bg as a literal and must match it.

typography:
  display:
    family: "Big Shoulders Display"
    weights: [800, 900]
  body:
    family: "Barlow"
    size_px: 16
    line_height: 1.45
  scale_ratio: 1.25          # 10 / 13 / 16 / 20 / 25 / 31 / 39 / 49 / 61 / 76
  utility: "IBM Plex Mono 500/600, uppercase, letter-spaced .1-.2em: labels, eyebrows, tabs, axis text"

spacing:
  unit_px: 4                 # the HUD is dense; 4 keeps hairline detailing on the grid

radius:
  panel: 0                   # square panels; corner ticks do the work rounded corners usually do
  button: 2                  # buttons, inputs, chips, steppers, rank badges
  # One exception: week dots are circles.

motion:
  signature: "the belt tie: on promotion the new belt cinches out from the knot (scaleX .2 to 1, 700 ms) with a slight overshoot, the only overshoot in the app"
  easing: "ease-out; views rise 4 px over 250 ms; hovers 150 ms"
  never: "bounce/elastic on controls; scroll-fade on every section; any motion under prefers-reduced-motion"
---

## Rationale (prose — why these choices exist)

- **Aesthetic:** a fat-loss log for a kickboxer and self-taught taekwondo student, built to feel like a fighter's HUD rather than a wellness app, so logging a plate feels like training. Black and white keeps it serious; the belt, the thing he is working toward, carries the colour.
- **Layout:** phone first, with a sticky header and bottom tabs. From 960 px it switches to a left sidebar and a two-column panel flow.
- **Signature element:** the belt. It sits at the top of every screen, fills toward the next one, and the promotion tie is the one orchestrated moment. Ranks and quests get the System window.
- **Exercise figures:** stick pictograms from the rig in figure.js, on a --bg stage with a hairline floor. The near side is --ink and the far side --muted, unless that limb is the one working. Props are --muted line art; cue lines, arrows and labels are --muted and --ink-2 in the mono face. One figure per stage. They only move without reduced motion; otherwise they show the key positions as still frames.
- **What we refuse:**
  - New colours. New UI reuses the existing palette. (The rank tier colours are the one deliberate exception.)
  - Shame states: a missed day or a failed quest is never red. Red means a craving or an error.
  - Rounded panels and drop-shadow cards. Glow stays on the System window, the S rank and the running timers.
  - Emoji and colour icons. Icons are single-colour line SVGs in currentColor.
  - XP and a player level (he asked for neither). Stats show as rank letters and progress as belts; exercise levels in workouts are fine.
  - Calorie and macro numbers anywhere. He won't count them; the app works in plates and hands.
