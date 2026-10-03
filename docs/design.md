# Magical Valley Adventures: Game Design and Build Package

3 October 2026 · @Mert

Magical Valley Adventures is a three-lane endless runner in the browser: a plush hero runs through Magical Valley in daylight, jumps over, slides under or goes around desserts and pink clouds, and collects stars to spend on revives, new characters and cosmetics.

## Start here

To begin building, jump to Prompt 0: project setup, copy the grey box under that heading into Claude Code, and paste this whole document where it says to. The nine prompts are about two thirds of the way down, in the section Claude Code prompts.

## Game at a glance

Everything below follows from these decisions. Rows marked "proposed" are the team's suggestion and are listed again under Open questions.

| Topic | Decision | Source |
|---|---|---|
| Genre | Three-lane endless runner, camera fixed behind the hero | Mert |
| World | One never-ending world, Magical Valley | Mert |
| Enemies and power-ups | None in this version | Mert |
| Barriers | Candies, desserts and pink clouds, in pink and soft colours; jump over, slide under or go around | Mert |
| Collectible | Stars | Mert |
| Goal | Collect the most stars in a run | Mert |
| Stars buy | Revives, new characters, accessories and signature moves | Mert |
| Lives | Three hearts per run | Mert |
| Characters | Strawberry, Ginza, Chity, Kusto, plus Sugar the rainbow unicorn as the fifth to unlock | Mert |
| Character looks | Kusto wears a red beanie; Chity wears jeans and a black T-shirt with no hat or cymbals; Ginza and Sugar run on four legs; Strawberry's eyes stay closed | Mert |
| Player | Asya, age band 9 to 12, so pacing close to Hero Dash | Mert |
| Controls | Swipe on touch screens, arrow keys or WASD on a keyboard | Mert |
| Platform | Browser, built with Claude Code; art from Blender and Higgsfield | Mert |
| Tech stack | Vite, TypeScript, React Three Fiber, Zustand; no physics engine | Proposed |
| Relationship to Plushopolis | A separate new game that reuses the characters | Mert |
| Time of day | The run happens in daylight | Mert |
| Audience | A public game, open to anyone with the link | Mert |
| Audio | Created separately and added in Phase 7 | Mert |
| Hosting | GitHub Pages; players are in Türkiye and around the world | Proposed |
| Language | All buttons, menus and text in English only | Mert |

## Screens and flow

The game has seven screens, and a player can go from opening the page to running in two taps.

| Screen | What the player sees | Actions | Leads to |
|---|---|---|---|
| Landing | Daytime sky, drifting clouds and ribbons, the five plush characters floating around a big PLAY button, star total in a corner | PLAY | Character select |
| Character select | Night forest with fireflies, a glowing round stage with a raised centre podium, CHOOSE button | Swipe or arrow keys to rotate the stage; CHOOSE; tap a locked character to see its price | Run, or Shop for a locked character |
| Run | The hero from behind on a three-lane path through Magical Valley; hearts top left, star count top centre, pause top right | Swipe or keys to move; pause | Pause, or Out at zero hearts |
| Pause | Dimmed run with Resume, Restart and Home | Tap a button | Run, or Landing |
| Out | The hero sits down dizzy; "Keep going?" with the revive price and a 5-second countdown | Revive, or No thanks | Run, or Results |
| Results | Stars collected this run, best run, distance, total stars; the hero celebrates on a new best | Play again, Shop, Home | Run, Shop, or Landing |
| Shop | Three tabs: Characters, Accessories, Signature moves; star total at the top | Buy, equip | Back to where the player came from |

Screen behaviour agreed from the two reference images:

- **Landing motion:** characters bob gently, clouds drift, the PLAY button pulses. It is layered 2D artwork, so it loads fast.
- **Sky to forest transition:** tapping PLAY moves the camera down from the sky into the night forest in about 0.8 seconds.
- **Stage carousel:** the stage rotates one character per swipe. The character in focus hops onto the centre podium and plays its signature pose.
- **Locked characters:** they stand on the stage as dark silhouettes with a star price tag. The unicorn starts locked.
- **Run setting:** the run takes place in daylight. When CHOOSE is tapped, the night forest brightens to day as the stage dissolves into the track.

## Run rules

The hero runs forward automatically and the player makes four moves: lane left, lane right, jump and slide. All numbers here are starting values held in one config file, so they can be tuned after Asya plays.

### Moves

| Move | Touch | Keyboard | Effect | Duration |
|---|---|---|---|---|
| Lane left | Swipe left | Left arrow or A | Move one lane left | 0.12 s |
| Lane right | Swipe right | Right arrow or D | Move one lane right | 0.12 s |
| Jump | Swipe up | Up arrow, W or Space | Leap 1.6 m high | 0.6 s in the air |
| Slide | Swipe down | Down arrow or S | Duck to half height | 0.7 s |

- **Lanes:** three lanes, each 2 m wide, centred at x = -2, 0 and +2.
- **Input buffer:** a move made up to 0.15 s early is remembered and played as soon as it is allowed. This makes the controls feel forgiving.
- **Fast fall:** swiping down in the air drops the hero straight into a slide.
- **Lane change in the air:** allowed.

### Obstacles

| Type | Examples | How to pass | Size |
|---|---|---|---|
| Low | Candy pile, cupcake, macaron stack, lollipop log | Jump over | One lane wide, 0.8 m tall |
| High | Pink cloud bar, donut arch, candy-floss banner | Slide under | One or more lanes wide, 0.9 m clearance |
| Tall | Giant layer cake, jelly tower | Change lane | One lane wide, 3 m tall |

The tall type was the team's proposal and Mert approved it. It makes changing lanes matter; without it a player could stay in one lane.

### Stars

- Stars float in lines of 5 to 10 along a lane, 1.5 m apart, and in arcs over low obstacles.
- Each star is worth 1. A rare big star, about one every 30 seconds, is worth 10.
- The run score is the number of stars collected. Distance is shown as a secondary number.
- Stars collected are added to the saved total even when the run ends.

### Hearts and revive

- A run starts with 3 hearts.
- Hitting a barrier costs 1 heart, pops the barrier in a puff of sprinkles and makes the hero blink and stay safe for 1.5 s.
- At 0 hearts the hero is out, and the Out screen offers a revive for 5 seconds.
- A revive restores 3 hearts, clears barriers for the next 30 m and gives 2 s of safety.
- Revives cost 100 stars the first time in a run, then 200, then 400. A run allows 3 revives at most.
- Hearts do not refill during a run, because there are no power-ups.

## Difficulty curve

Speed climbs from 12 m/s to a cap of 28 m/s over the first 160 seconds, and the time between barrier rows shrinks from 1.4 s to 0.85 s. These are first-pass values for the 9 to 12 age band.

Two formulas drive everything:

- **Speed:** speed = min(28, 12 + 0.1 × seconds since the run started), in m/s.
- **Row gap:** gap time = 1.4 − 0.55 × progress, where progress = (speed − 12) / 16. Distance between rows = speed × gap time.

| Time into run | Speed (m/s) | Reaction time between rows (s) | Distance between rows (m) | Jump length (m) | Barrier mix |
|---|---|---|---|---|---|
| 0 s | 12 | 1.40 | 16.8 | 7.2 | One barrier per row, low or high only |
| 40 s | 16 | 1.26 | 20.2 | 9.6 | One or two lanes blocked; tall barriers appear |
| 80 s | 20 | 1.13 | 22.5 | 12.0 | Two lanes blocked is common |
| 120 s | 24 | 0.99 | 23.7 | 14.4 | Rows with a barrier in every lane begin |
| 160 s and after | 28 | 0.85 | 23.8 | 16.8 | Full mix at constant speed |

Fairness rules the spawner must never break:

1. Every row leaves at least one lane the hero can pass, by running, jumping or sliding.
2. A row never has tall barriers in all three lanes.
3. When reaction time is under 1.0 s, the safe lane of the next row is at most one lane away from the safe lane of the current row.
4. The first 3 seconds of a run, and the 30 m after a revive, have no barriers.
5. Stars never sit inside a barrier; a star line that crosses a low barrier arcs over it.

After a hit, speed drops by 20% for the 1.5 s of safety and then returns. This gives the player a moment to recover.

## Star economy

The spawner is tuned so a clean run earns about 120 stars per minute, and all prices are set against that target. All prices are proposals for Mert and Asya to adjust.

The target comes from placing about 180 stars per minute on the track and expecting a player to collect two thirds of them. It is a design target, not a measurement; the first playtests will show the real rate.

### Characters

| Character | Look | Personality | Runs on | Price (stars) | Play time to earn |
|---|---|---|---|---|---|
| Strawberry | Pink rabbit in a floral dress, eyes closed | Smart, flexible, kind | Two legs | Free | Start |
| Ginza | Purple pony | Funny, clumsy, friendly | Four legs | Free | Start |
| Chity | Simple yellow rabbit with a cheeky, menacing face, in jeans and a black T-shirt | A cheeky little menace; Sugar's brother | Two legs | 500 | About 4 minutes |
| Kusto | Seagull in a red beanie | Courageous | Two legs | 1,500 | About 13 minutes |
| Sugar | White unicorn with a rainbow mane | Very friendly, loves adventures; Chity's sister, but nothing like him | Four legs | 4,000 | About 33 minutes |

All characters run at the same speed with the same hitbox. They differ only in looks, animation and sound, so no character is the "best" one.

### Signature moves

A signature move is a cosmetic animation that replaces a character's normal jump or slide. It changes nothing about timing or hitboxes. Each costs 800 stars.

| Character | Move | Replaces | What it looks like |
|---|---|---|---|
| Strawberry | Stretchy leap | Jump | Ears and legs stretch long at the top of the jump |
| Ginza | Clumsy tumble | Slide | Trips and rolls through as a purple ball |
| Chity | Victory punch | Jump | Freezes like a statue at the top of the jump, right arm punching the air in celebration |
| Kusto | Brave glide | Jump | Spreads both wings and glides the second half |
| Sugar | Rainbow dash | Slide | Skids low and leaves a rainbow trail |

### Accessories

Accessories are cosmetic items any character can wear, in three price tiers. The launch set is ten items.

| Tier | Price (stars) | Items at launch | Examples |
|---|---|---|---|
| Simple | 150 | 4 | Bow, scarf, flower crown, star glasses |
| Fancy | 300 | 4 | Cape, wizard hat, backpack, party hat |
| Special | 600 | 2 | Sparkle trail, glowing wings |

### Totals

- Unlocking all characters costs 6,000 stars, about 50 minutes of play.
- All signature moves cost 4,000 stars and all accessories cost 3,000 stars.
- Everything together costs 13,000 stars, about 1 hour 50 minutes of play before any stars are spent on revives.
- Progress is saved in the browser on the device being used. It does not follow the player to another device in this version.

## Algorithms

The game is eight small systems, and the key trick is that the hero never moves forward: the world scrolls toward the camera. This keeps the numbers small and makes collision a simple lane-and-box check with no physics engine.

Conventions: 1 unit = 1 m. The hero stays at z = 0. Lanes are at x = -2, 0, +2. Objects spawn at z = -120 and move toward +z at the current speed. Objects are recycled when z > 10. The camera sits at (0, 3.2, 6.5) and looks at (0, 1, -8).

### A1. Game state machine

```
states: LANDING, SELECT, RUN, PAUSE, OUT, RESULTS, SHOP

LANDING  --PLAY-->            SELECT
SELECT   --CHOOSE (owned)-->  RUN
SELECT   --tap locked-->      SHOP
RUN      --pause-->           PAUSE
PAUSE    --resume-->          RUN
PAUSE    --home-->            LANDING
RUN      --hearts == 0-->     OUT
OUT      --revive paid-->     RUN      (hearts = 3, clear 30 m, 2 s safe)
OUT      --decline/timeout--> RESULTS  (bank stars, update best)
RESULTS  --play again-->      RUN
RESULTS  --shop-->            SHOP
RESULTS  --home-->            LANDING
SHOP     --back-->            previous state
```

Only RUN advances the simulation. Every other state freezes it.

### A2. Input

```
on touchstart: record start point and time
on touchend:
    dx, dy = end - start
    if max(|dx|, |dy|) < 30 px: ignore (it was a tap)
    if |dx| > |dy|: action = dx > 0 ? RIGHT : LEFT
    else:           action = dy > 0 ? SLIDE : JUMP
on keydown (no key repeat): map arrows / WASD / Space to the same four actions

buffer: store (action, timestamp). The player controller consumes it
        if it is no older than 0.15 s; otherwise it is dropped.
```

### A3. Player controller

```
constants: GRAVITY = 35.6, JUMP_VELOCITY = 10.67   (gives 1.6 m height, 0.6 s air time)
           LANE_TIME = 0.12, SLIDE_TIME = 0.7
           STAND_HEIGHT = 1.2, SLIDE_HEIGHT = 0.6

state: lane (0..2), x, y, vy, slideTimer, safeTimer

each frame (dt):
    action = buffer.take()
    LEFT / RIGHT: lane = clamp(lane -/+ 1, 0, 2)
    JUMP  (if on ground): vy = JUMP_VELOCITY; slideTimer = 0
    SLIDE (on ground):    slideTimer = SLIDE_TIME
    SLIDE (in the air):   vy = -20; slideTimer = SLIDE_TIME   # fast fall

    targetX = (lane - 1) * 2
    x = moveToward(x, targetX, (2 / LANE_TIME) * dt)

    vy -= GRAVITY * dt;  y += vy * dt
    if y <= 0: y = 0; vy = 0

    slideTimer = max(0, slideTimer - dt)
    height = slideTimer > 0 ? SLIDE_HEIGHT : STAND_HEIGHT
    safeTimer = max(0, safeTimer - dt)
```

### A4. Difficulty

```
baseSpeed = min(28, 12 + 0.1 * runTime)
speed     = safeTimer > 0 and wasHit ? baseSpeed * 0.8 : baseSpeed
progress  = (baseSpeed - 12) / 16            # 0..1
gapTime   = 1.4 - 0.55 * progress            # seconds between rows
tier      = runTime < 40 ? 0 : runTime < 80 ? 1 : runTime < 120 ? 2 : 3
```

### A5. Spawner

```
A row is three cells, one per lane: '.' empty, 'L' low, 'H' high, 'T' tall.

pattern library, by tier (each pattern is shuffled across lanes unless noted):
    tier 0: "L.."  "H.."
    tier 1: tier 0 + "T.."  "LL."  "LH."  "HH."
    tier 2: tier 1 + "TL."  "TH."  "TT."
    tier 3: tier 2 + "TTL"  "TTH"  "LLL"  "TLH"  "HHH" (one wide cloud bar)

distanceToNextRow -= speed * dt
if distanceToNextRow <= 0 and runTime > 3 and not inReviveClearZone:
    repeat up to 10 times:
        row = shuffle(pick(library[tier]))
        if isFair(row, previousRow, gapTime): break
    spawn each barrier of row at z = -120 from the object pool
    spawnStars(row)
    previousRow = row
    distanceToNextRow = speed * gapTime

isFair(row, prev, gapTime):
    open = lanes where row[lane] != 'T'
    if open is empty: return false
    if gapTime < 1.0 and prev exists:
        prevOpen = lanes where prev[lane] != 'T'
        if no lane in open is within 1 lane of a lane in prevOpen: return false
    return true

spawnStars(row):
    rowDistance = speed * gapTime
    n = clamp(floor((rowDistance - 6) / 1.5), 5, 10)
    rowsPerMinute = 60 / gapTime
    chance = clamp(180 / (rowsPerMinute * n), 0.2, 0.9)   # holds about 180 stars/min on the track
    if random() < chance:
        lane = random lane where row[lane] != 'T'
        place n stars from 4 m behind the row, 1.5 m apart, at y = 0.8
        if row[lane] == 'L': place 5 extra stars in an arc over the barrier, peak y = 2.0
    every 30 s: replace one star with a big star worth 10
```

Use a seeded random generator so a run can be replayed in tests.

### A6. Collision

```
player box: half-width 0.35, depth 0.6, from y to y + height

for each active barrier b whose z-range was crossed this frame
        (check the swept range [z - speed*dt, z] so fast frames cannot skip it):
    if |player.x - b.x| > b.halfWidth + 0.35: continue
    hit =  b.type == 'T'
        or (b.type == 'L' and player.y < 0.7)                  # 0.1 m of forgiveness
        or (b.type == 'H' and player.y + player.height > 0.9)
    if hit and safeTimer == 0: onHit(b)

for each active star s within 0.9 m of the player's centre: collect(s)

onHit(b):
    hearts -= 1; safeTimer = 1.5; wasHit = true
    pop b with a sprinkle effect and return it to the pool
    if hearts == 0: state = OUT
```

### A7. Revive and economy

```
reviveCost = 100 * 2^(revivesThisRun)        # 100, 200, 400
canRevive  = revivesThisRun < 3 and totalStars + runStars >= reviveCost

on revive: pay from runStars first, then from totalStars
           hearts = 3; safeTimer = 2; remove all barriers with z > -30
on run end: totalStars += runStars; bestRun = max(bestRun, runStarsCollected)
buy(item): if totalStars >= price and not owned: totalStars -= price; owned.add(item); save()
```

### A8. Pooling, world scroll and save

```
pools: create 40 barriers, 150 stars and 6 ground chunks once at load; never create or destroy during a run.
ground: chunks are 40 m long; when a chunk passes z > 40 it jumps to the far end of the line.
scenery: instanced meshes (trees, flowers, mushrooms, fireflies) recycled the same way.
frame step: dt = min(real dt, 1/30) so a slow frame cannot cause a huge jump.

save (localStorage key "mvr-save-v1"):
{ version: 1, totalStars, bestRun,
  owned:    { characters: [], accessories: [], moves: [] },
  equipped: { character, accessory, moves: {} },
  settings: { music: true, sound: true } }
save on: run end, purchase, equip, settings change.
```

## Claude Code prompts

Run these nine prompts in order, one per Claude Code session, and do not start the next until the acceptance checks of the current one pass. The first four use grey boxes instead of art, so the game is playable before any Blender work is finished.

| Phase | Result | Needs art? |
|---|---|---|
| 0 | Empty project, rules file, config file | No |
| 1 | A capsule that runs, changes lanes, jumps and slides | No |
| 2 | Barriers, collision, three hearts | No |
| 3 | Stars, HUD, difficulty curve | No |
| 4 | All screens, revive, saved progress | Landing and selection images |
| 5 | Shop, characters, accessories, signature moves | No |
| 6 | Real characters, barriers and Magical Valley | All Blender exports |
| 7 | Sound, music, effects | Audio files |
| 8 | Performance pass and publishing | No |

### Prompt 0: project setup

```
Create a new browser game project called magical-valley-adventures.

Stack: Vite, TypeScript (strict), React, React Three Fiber, drei, Zustand, Vitest. No physics engine.

1. Save the design document I paste below this prompt as docs/design.md. It is the source of truth.
2. Create CLAUDE.md with these rules:
   - Read docs/design.md before changing gameplay.
   - Every gameplay number lives in src/config.ts. Never hard-code a number elsewhere.
   - Game logic lives in src/game/ as plain TypeScript with no React or three.js imports, so it can be unit tested.
   - Rendering lives in src/scene/, screens and HUD in src/ui/, state in src/store/.
   - The hero stays at z = 0 and the world scrolls toward +z.
   - Never create or destroy objects during a run; use pools.
   - Run npm run test and npm run build before saying a task is done.
3. Create src/config.ts with every constant from the Run rules, Difficulty curve, Star economy and Algorithms sections of the design document.
4. Show a blank scene with a ground plane and the text "Magical Valley Adventures".

Acceptance:
- npm run dev shows the scene on a desktop browser and on an iPad.
- npm run test and npm run build pass.
- src/config.ts contains the lane, jump, slide, speed, gap, heart, revive and price values from the design document.

[PASTE THE DESIGN DOCUMENT HERE]
```

### Prompt 1: grey-box movement

```
Implement sections A2 (Input) and A3 (Player controller) of docs/design.md, plus the scrolling ground from A8.

- Player: a capsule 1.2 m tall. Ground: six 40 m chunks with three visible lane stripes, recycled as they pass the camera.
- Camera fixed at (0, 3.2, 6.5) looking at (0, 1, -8). It does not follow lane changes exactly; it eases toward 30% of the player's x.
- Touch swipes and keyboard both produce the four actions, through one input buffer of 0.15 s.
- World scrolls at a constant 12 m/s for now.
- Add a small debug panel (toggle with the backtick key) showing fps, speed, lane, y and current action.

Unit tests: jump peaks at 1.6 m (+/- 0.05) and lands after 0.6 s (+/- 0.02); a lane change completes in 0.12 s; a buffered input older than 0.15 s is dropped; lane index never leaves 0..2.

Acceptance:
- On an iPad, swipes in all four directions respond on the same frame they end.
- On desktop, arrows, WASD and Space work, and holding a key does not repeat the action.
- Swiping down in mid-air drops straight into a slide.
- Holds 60 fps on the iPad.
```

### Prompt 2: barriers, collision and hearts

```
Implement sections A5 (Spawner, barriers only, no stars yet), A6 (Collision) and the hearts rule from docs/design.md.

- Three grey-box barrier types: low (0.8 m box), high (bar with 0.9 m clearance), tall (3 m box). Colour them differently.
- Pattern library, tiers, shuffling and the isFair check exactly as specified. Use a seeded random generator.
- Object pool of 40 barriers. Swept collision check so no barrier is skipped at low frame rates.
- Hit: lose a heart, barrier pops, 1.5 s of safety with the player blinking, speed x0.8 during safety.
- At zero hearts, freeze the simulation and show a temporary "OUT - press R" text that restarts the run.
- Debug panel: add tier, gap time and a "force tier" selector.

Unit tests: over 10,000 generated rows per tier, no row has tall barriers in all three lanes; the rule for gaps under 1.0 s is never broken; the first 3 seconds have no barriers; jumping clears a low barrier; sliding clears a high barrier; standing or jumping into a high barrier is a hit.

Acceptance:
- A run with no input loses three hearts and ends.
- Every row can be passed; play each forced tier for 60 seconds to confirm.
- No objects are allocated during a run (check with the browser memory profiler).
```

### Prompt 3: stars, HUD and difficulty

```
Implement section A4 (Difficulty), the star part of A5, and the run HUD from docs/design.md.

- Speed and gap time follow the formulas. Tier follows run time.
- Stars: instanced mesh, pool of 150, spinning. Star lines, arcs over low barriers, and a big star worth 10 about every 30 s.
- Star chance uses the formula that keeps about 180 stars per minute on the track.
- HUD (HTML overlay, not 3D): hearts top left, star count top centre, pause button top right, distance small under the star count. Large touch targets, at least 48 px.
- Collecting a star gives a small pop and makes the counter bounce.

Unit tests: speed is 12 at 0 s, 20 at 80 s, 28 at 160 s and 28 at 300 s; gap time is 1.40 at 0 s and 0.85 at 160 s; no star is ever placed inside a barrier; simulated star placement averages 150 to 220 stars per minute at 0 s, 80 s and 160 s.

Acceptance:
- A 3-minute run visibly speeds up and stops accelerating after about 160 s.
- The debug panel shows stars placed per minute and stars collected per minute.
- Still 60 fps on the iPad at top speed.
```

### Prompt 4: screens, revive and saving

```
Implement section A1 (state machine), A7 (revive and economy) and the save format in A8 of docs/design.md, with every screen in the Screens and flow table except the Shop.

- Landing: layered image from public/ui/landing/ (sky, clouds, five characters as separate PNGs). Characters bob, clouds drift, PLAY pulses. Star total shown in a corner.
- Transition: camera moves down from the sky into the night forest in 0.8 s.
- Character select: 3D round stage with a centre podium. Swipe or arrow keys rotate one character per step. Use coloured capsules as placeholders. Locked characters are dark silhouettes with a price tag. CHOOSE starts the run with an owned character.
- Pause: Resume, Restart, Home. The game also pauses automatically when the browser tab is hidden.
- Out: revive price, 5-second countdown, Revive and No thanks. Revive is disabled if the player cannot afford it or has used 3.
- Results: stars this run, best run, distance, total stars. Play again, Shop (disabled for now), Home.
- Save to localStorage under "mvr-save-v1". Handle a missing or corrupt save by starting fresh.

Unit tests: every transition in A1; revive costs 100, 200, 400 and is refused the fourth time; revive pays from run stars before total stars; total stars survive a page reload; a corrupt save does not crash.

Acceptance:
- From page load to running takes two taps.
- Reloading the page keeps total stars and best run.
- After a revive there are no barriers for 30 m and the hero is safe for 2 s.
```

### Prompt 5: shop and unlocks

```
Implement the Shop and the Star economy section of docs/design.md.

- Data-driven catalogue in src/game/catalogue.ts: five characters, five signature moves, ten accessories, with the ids, names and prices from the design document.
- Shop screen with three tabs. Each item shows a preview, price, and one of: Buy, Equip, Equipped. Buying asks for confirmation.
- Strawberry and Ginza are owned from the start.
- A signature move can be bought only for an owned character and is toggled on or off per character.
- An accessory attaches to a named bone or empty on the character ("acc_head", "acc_neck", "acc_back"). With placeholders, attach to the top of the capsule.
- Signature moves only swap the animation and add an effect. They must not change jump time, slide time or hitboxes.

Unit tests: cannot buy without enough stars; cannot buy twice; buying deducts the exact price; equip state persists after reload; jump and slide timings are identical with and without a signature move.

Acceptance:
- With 500 stars, Chity can be bought and then chosen on the selection stage.
- A debug command adds 1,000 stars for testing and is removed from production builds.
```

### Prompt 6: art integration

```
Replace the placeholders with the real assets in public/models/, following the Blender asset spec in docs/design.md.

- Load GLB files with useGLTF and preload them behind a loading bar on the landing screen.
- Characters: map animation clips by exact name: Idle, Run, Jump, Slide, Hit, Out, Celebrate, Signature. Cross-fade between clips in 0.1 s. Rotate models 180 degrees if they face the camera.
- Run animation playback speed scales with game speed, from 1.0 at 12 m/s to 1.6 at 28 m/s.
- Barriers: one GLB per barrier listed in the spec, mapped to low, high or tall. Hitboxes stay as defined in config, regardless of the mesh.
- Magical Valley: ground chunk, instanced side scenery recycled with the ground, sky dome, fog that hides the spawn point at 120 m, butterflies and floating sparkles as instanced points.
- Lighting: one soft directional light and one hemisphere light in a bright pastel daylight palette. Soft blob shadows under characters instead of real shadow maps.
- If a model is missing, fall back to the grey-box placeholder and log a warning.

Acceptance:
- All five characters appear on the selection stage and in the run with correct animations.
- No barrier pops into view; fog covers the spawn point.
- Draw calls stay under 100 and triangles on screen under 150,000 (show both in the debug panel).
- 60 fps on the iPad at top speed.
```

### Prompt 7: sound and effects

```
Add audio and feedback effects.

- Audio from public/audio/: one looping music track for menus, one for the run, and effects for swipe, jump, slide, star, big star, hit, out, revive, button, purchase and new best.
- Start audio only after the first tap (browser rule). Music and sound toggles on the pause and landing screens, saved in settings.
- Star pickups rise in pitch when collected in quick succession and reset after 1 s without a star.
- Effects: sprinkle burst on hit, sparkle on star, speed lines above 24 m/s, a short camera shake on hit (3 frames), dust puff on landing.
- Add a "reduce motion" setting that turns off camera shake and speed lines.

Acceptance:
- No sound plays before the first tap, and no errors appear in the console on iPad Safari.
- Toggles work and persist after reload.
- Frame rate is unchanged from Phase 6.
```

### Prompt 8: performance and publishing

```
Prepare the game for release.

- Measure on an iPad: load time, fps at top speed, memory after a 5-minute run. Report the numbers before and after changes.
- Compress textures and models, lazy-load the shop previews, and keep the first load under 15 MB.
- Lock the layout to work in both portrait and landscape; in landscape, keep the same field of view and add side scenery.
- Add a web app manifest and icons so the game can be added to the iPad home screen and opens full screen.
- Remove the debug panel and debug commands from production builds.
- Add a GitHub Actions workflow that builds and deploys to GitHub Pages on every push to main, set the Vite base path to match the repository name, and write the deploy steps in README.md. Keep the output as plain static files so the same build can be copied to a second host.

Acceptance:
- A cold load on the iPad reaches the landing screen in under 5 seconds on home Wi-Fi.
- A 5-minute run shows no growth in memory and no frame drops below 55 fps.
- The published link works on iPad Safari, a phone and a desktop browser.
```

## Blender asset spec

The game needs 5 characters, 9 barriers, 10 accessories, 1 star and a small Magical Valley scenery kit, all exported as GLB files. The budgets below keep the game at 60 fps in an iPad browser.

### Asset list and budgets

| Asset | Count | Triangles each (max) | Texture | File location |
|---|---|---|---|---|
| Character | 5 | 8,000 | One 1024 px set | public/models/characters/strawberry.glb, ginza.glb, chity.glb, kusto.glb, sugar.glb |
| Low barrier: candy pile, cupcake, macaron stack, lollipop log | 4 | 1,500 | Shared 2048 px atlas | public/models/barriers/ |
| High barrier: pink cloud bar, donut arch, candy-floss banner | 3 | 1,500 | Shared atlas | public/models/barriers/ |
| Tall barrier: giant layer cake, jelly tower | 2 | 1,500 | Shared atlas | public/models/barriers/ |
| Star and big star | 2 | 200 | Flat colour, glowing | public/models/star.glb |
| Accessory | 10 | 500 | Shared 1024 px atlas | public/models/accessories/ |
| Ground chunk, 40 m long, 10 m wide | 1 | 2,000 | Tiling 1024 px | public/models/valley/ground.glb |
| Scenery: 2 trees, 2 mushrooms, 2 flower clumps, rock, lantern | 8 | 800 | Shared 2048 px atlas | public/models/valley/ |
| Sky dome | 1 | 500 | 2048 px daytime gradient with soft clouds | public/models/valley/sky.glb |

### Character rules

- **Source of truth:** the real plush toys and the two approved screen images. Kusto has a red beanie. Chity wears jeans and a black T-shirt, with no hat and no cymbals, and has a simple yellow rabbit face with a cheeky, menacing look. Strawberry's eyes are closed.
- **Scale and origin:** 1 Blender unit = 1 m. Characters are about 1.2 m tall. Origin at the feet, centred.
- **Pose:** model Strawberry, Chity and Kusto upright in an A-pose. Model Ginza and Sugar standing on four legs, and animate their Run as a gallop.
- **Plush look:** real fur is too heavy for a browser. Bake the fuzzy fabric into the colour and normal textures and use one soft material per character.
- **Rig:** 30 bones at most, 4 bone influences per vertex at most. Ears, tail and mane get 2 or 3 bones each so they bounce.
- **Accessory points:** three empties parented to bones, named exactly acc_head, acc_neck and acc_back.
- **Hitbox:** the game uses a fixed box 0.7 m wide and 1.2 m tall (0.6 m when sliding), so keep each character's body inside it. Ears, wings and the back half of the four-legged characters may stick out.

### Animation clips

Every character needs the same eight clips with these exact names, at 30 frames per second. Jump and Slide lengths must match the game timings.

| Clip name | Length | Loops | Notes |
|---|---|---|---|
| Idle | 2.0 s | Yes | Used on the selection stage |
| Run | 0.53 s (16 frames) | Yes | Bouncy; the game speeds it up as the run gets faster |
| Jump | 0.6 s (18 frames) | No | Take-off, tuck, landing; animate in place, no upward movement of the root |
| Slide | 0.7 s (21 frames) | No | Body stays under 0.6 m |
| Hit | 0.5 s | No | Flinch and stumble |
| Out | 1.5 s | No | Sits down dizzy with stars circling |
| Celebrate | 2.0 s | Yes | New best run and selection confirm |
| Signature | 0.6 s or 0.7 s | No | Matches the move it replaces; see the Signature moves table |

### Barrier and scenery rules

- **Palette:** pinks, creams, mint, lilac and soft yellow. No dark or sharp shapes.
- Low barriers fit inside a box 1.8 m wide, 0.8 m tall and 0.8 m deep.
- High barriers leave 0.9 m of clear space under them. The cloud bar comes in a one-lane and a three-lane width.
- Tall barriers fit inside 1.8 m wide and 3 m tall.
- Each barrier must read at a glance as "jump", "slide" or "go around" from 40 m away. Keep low ones squat, high ones clearly floating, tall ones clearly towering.
- Scenery sits at least 5 m from the centre line so it never looks like a barrier.

### Export settings

1. Apply all transforms (Ctrl+A, All Transforms) before export.
2. Push each animation down to its own NLA track, named as in the table.
3. File, Export, glTF 2.0, format "glTF Binary (.glb)".
4. Turn on: +Y Up, Apply Modifiers, Animation, "NLA Tracks" animation mode, sampling at 30 fps.
5. Turn off: cameras, lights, compression. Claude Code compresses the files in Phase 8.
6. Textures as PNG or WebP at the sizes in the table, packed into the GLB.
7. Check each file by dragging it into the free online glTF viewer from Khronos or Don McCurdy before handing it to Claude Code.

### Faster route to a first model

Higgsfield can turn a character image into a 3D GLB mesh. That mesh is a good starting shape but usually arrives dense and without a rig, so it still needs reducing to the triangle budget, rigging and animating in Blender.

## Higgsfield prompt pack

Higgsfield has three jobs in this project: reference sheets for the Blender modelling, flat artwork for the menus, and the trailer. Every character prompt starts from an uploaded photo or approved image of that character, so the look stays the same across all outputs.

### Style line

Add this line to the end of every image prompt so all artwork matches the two approved screens:

> Soft plush toy materials with visible fabric fuzz and stitching, rounded friendly shapes, pastel palette of pink, lilac, mint, cream and soft yellow, gentle glowing light, soft shadows, dreamy storybook mood, high detail, no text, no logos.

### 1. Character turnaround sheets (for Blender)

Run once per character with that character's reference image attached.

> Character turnaround sheet of the plush toy in the reference image. Four full-body views side by side at the same scale: front, three-quarter, side and back. Standing upright in a relaxed A-pose with arms slightly away from the body, feet flat on the ground. Keep every colour, proportion, clothing item and accessory exactly as in the reference. Plain light grey background, even studio lighting, no shadows on the background, orthographic look with no perspective distortion. [STYLE LINE]

Per-character additions:

- **Strawberry:** eyes closed in all views.
- **Kusto:** red beanie in all views.
- **Chity:** first make a new reference image of him in blue jeans and a plain black T-shirt, with no hat and nothing in his hands, and a simple yellow rabbit face with a cheeky, menacing expression. Use that image for every later prompt.
- **Ginza and Sugar:** replace the A-pose sentence with "Standing naturally on all four legs, head up".
- **Sugar:** horn and rainbow mane clearly visible from the side and back.

### 2. Barrier concept sheet

> Game asset sheet of nine dessert obstacles for a children's runner game, each separate on a plain light grey background, three-quarter view from slightly above. Row one, low and squat: a pile of wrapped candies, a cupcake with pink frosting, a stack of three macarons, a lollipop lying on its side like a log. Row two, floating overhead: a long fluffy pink cloud shaped like a bar, a giant glazed donut standing upright as an arch, a candy-floss banner hanging between two candy canes. Row three, tall towers: a giant three-layer cake, a wobbly jelly tower. Consistent scale and lighting. [STYLE LINE]

### 3. Magical Valley environment

> Wide view down a gently winding three-lane path through a magical valley in bright daylight, seen from just behind and above a runner's position. Smooth pale path, soft grass and pastel flowers on both sides, round trees with lilac leaves, pastel mushrooms, butterflies and small sparkles drifting in the air, distant rolling hills and a soft blue sky with fluffy clouds. The path is empty with no characters and no obstacles. [STYLE LINE]

Also generate, with the same prompt opening changed, a seamless ground texture seen from directly above, and a daytime sky gradient with soft clouds and no ground.

### 4. Menu artwork layers

The landing screen needs its pieces as separate images so the game can animate them.

> The plush toy in the reference image floating happily in mid-air, arms open, joyful pose, full body, isolated on a plain flat green background for easy cut-out, no shadow. [STYLE LINE]

> Bright daytime sky background with soft white and pink clouds, pale flowing ribbons and a few small pastel stars, sun glow in the centre, empty middle area for a button, no characters. 16:9 and 9:16 versions. [STYLE LINE]

### 5. Trailer shots

Six shots of 3 to 5 seconds each, about 25 seconds in total. Generate each as an image first, approve it, then animate that image.

| Shot | Start image | Motion prompt |
|---|---|---|
| 1. The valley wakes | Magical Valley environment image | Slow push forward along the path, butterflies drifting, morning light spreading across the hills |
| 2. The heroes arrive | All five characters standing on the glowing round stage | Camera circles the stage slowly, each character bounces or waves in turn |
| 3. The run begins | Strawberry seen from behind at the start of the path | She leaps forward and runs, camera follows low behind her, stars streak past |
| 4. Jump and slide | Chity in mid-air above a cupcake, right fist raised | He freezes in a statue-like victory pose with his right arm punching the air, sparkles burst, he lands running |
| 5. Star rush | Kusto gliding through an arc of glowing stars | Stars fly into him one by one with small flashes, wings spread wide |
| 6. Title | All five characters running toward the camera on the path | They run closer and jump together, freeze at the top, space above for the title |

Keep character motion simple in each shot. One clear action per shot gives more reliable results than several.

## Publishing

The team recommends GitHub Pages as the first home for the game. It is free, it serves plain static files, and it deploys from the same GitHub repository that Claude Code already works in.

Players will be in Türkiye and around the world, so GitHub Pages alone is enough and no second host is planned. One note for development: access to GitHub from Russia became less reliable in May 2026, according to Meduza. That can slow down building and testing from Saratov, but it does not affect players elsewhere.

## Open questions

Mert settled the nine questions below on 3 October 2026, and his answers are applied throughout this document. Four smaller questions remain under the list; none blocks Prompts 0 to 3.

- [x] Game name: "Magical Valley Runner" is a placeholder. What do Mert and Asya want to call it?
- [x] Unicorn: what is its name and personality?
- [x] Tall barriers: keep the proposed third type that forces a lane change, or stay with jump and slide only?
- [x] Time of day: does the run happen at night like the selection screen, or in daylight like the landing screen?
- [x] Starting roster: are Strawberry and Ginza the two free characters, and are 500, 1,500 and 4,000 stars the right prices for Chity, Kusto and the unicorn?
- [x] Four-legged characters: do Ginza and the unicorn run upright on two legs, or on four?
- [x] Private or public: is the game only for family, or will the link be shared openly? Chity is modelled on Bunzo Bunny from Poppy Playtime, so a public release needs a more distinct look for him.
- [x] Music and sound: where will the audio come from?
- [x] Hosting: where should the finished game be published?

Mert also settled Sugar's personality, Chity's signature move, Chity's face, the players' location and the language on 3 October 2026. No questions are open.
