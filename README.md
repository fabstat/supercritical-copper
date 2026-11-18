# A Topological Fingerprint of the Frenkel Line

Fabiana Ferracina · Tohoku University · TDA Week 2026, Sendai

This is a talk of 27 slides: 23 in the talk and 4 held in reserve. It is plain HTML, CSS and
JavaScript, with no build step, no libraries and no requests to any server. You can see the slides at 
[fabstat.github.io/supercritical-copper](https://fabstat.github.io/supercritical-copper/)

| Key | Action |
|---|---|
| → Space PageDown / ← PageUp | next / previous slide |
| Home / End, digits | first / last slide, jump to a slide |
| **S** | speaker window for a second screen: notes, next slide, timer, clock. The two windows stay in step. |
| **N** | notes beside the slide, on one screen |
| O or Esc | overview of all slides |
| F | full screen |
| T | start / pause the timer |
| B or . | black screen |
| ? | key help |

You can link to a slide with `index.html#/12`. To make a PDF, choose Print → Save as PDF, set
margins to none and turn on background graphics; you get one slide per page.

## What is where

| Path | Contents |
|---|---|
| `index.html` | All slides, one `<section>` each, at 1920 × 1080, in the same order as the talk. Speaker notes are in `<aside class="notes">`. Sections marked `data-backup` are the reserve slides. |
| `css/deck.css`, `js/deck.js` | The presentation engine: scaling, navigation, speaker window, overview, print. It works like reveal.js but is self-contained. |
| `fonts/` | Latin Modern Roman and Latin Modern Math (GUST Font License). |
| `apps/cycles/` | The interactive cycle viewer on slide 12: `index.html`, `cycles.css`, `cycles.js`, `data.js`. |
| `figures/corrected/` | Persistence-diagram figures used on slides 1, 10 and 11, as SVG (used by the slides) and PNG. |
| `figures/legacy/` | The old, incorrect pictures. |

Paper: F. Ferracina, A. K. A. Lu, X. N. Du, N. Chen, M. I. Ojovan, H. Suito, D. V. Louzguine-Luzgin,
"Viscosity rise of supercritical liquid copper above the Frenkel line and related structural
features: a molecular dynamics and topological data analysis study", *J. Phys.: Condens. Matter* (2026).
