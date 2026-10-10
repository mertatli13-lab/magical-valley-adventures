# Audio

The game plays these files from this folder. Any file that is missing is
silent (with a warning in the browser console), so the game always runs.
Use MP3: it plays everywhere, including older iPad Safari.

| File | When it plays |
|---|---|
| `music-sugar-dash.mp3` | "Sugar Dash", the game's song. It loops through every screen without restarting, from the first tap (quieter while paused). Streamed, not decoded whole. |
| `swipe.mp3` | Lane change |
| `jump.mp3` | Jump |
| `slide.mp3` | Slide |
| `star.mp3` | Star collected (pitch rises for stars in quick succession) |
| `big-star.mp3` | Big star collected |
| `hit.mp3` | Barrier hit |
| `out.mp3` | Out of hearts |
| `revive.mp3` | Revive bought |
| `button.mp3` | Any button |
| `purchase.mp3` | Shop purchase |
| `new-best.mp3` | New best run |

Nothing plays before the player's first tap or key press (a browser rule).
