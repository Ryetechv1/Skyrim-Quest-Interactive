# Volvelle of Six Hours Design

## Status

Approved concept, pending implementation plan.

This design replaces the current arithmetic-based ORIGIN solver with an authored six-phase volvelle puzzle. The black frame artifact remains the detector: it reads the symbols currently inside Zone C, Zone B, Zone A^1, Zone A^2, and displays the answer only in Zone A^3.

## Goal

Make the cipher wheel feel like an antique manuscript instrument rather than a visible calculator. The player should solve six chained phases, one for each letter of ORIGIN, using Skyrim and Elder Scrolls lore clues. Each solved phase reveals the next clue, and a phase only counts when the player presses Validate A^3 while the correct alignment is present.

## Scope

In scope:

- Remove the visible and hidden arithmetic process for ORIGIN.
- Keep the 3-layer wheel, frame artifact, detection zones, A^3 answer box, validation button, six-attempt reset, completion modal, and bottom-right stamps.
- Replace ORIGIN guide text with a Skyrim-lore chain.
- Use authored phase signatures instead of formula output.
- Add a visible Volvelle Ledger that teaches what value each ring symbol holds.
- Show only the final A^3 answer symbol; C, B, A^1, and A^2 remain invisible computations/detections.

Out of scope:

- Changing the visual shape of the black frame artifact.
- Changing the 22-symbol inner wheel count.
- Reworking authentication, vault, MEGA, PDF, or Skyrim archive tabs.
- Adding external lore fetches at runtime.

## Lore Basis

The clues should feel like field notes an archivist could write while studying Skyrim artifacts. The chain uses these lore anchors:

- Dragonstone and the return of dragons.
- High Hrothgar, the Greybeards, and the Voice.
- Blackreach and the Elder Scroll.
- The Time-Wound at the Throat of the World.
- Sovngarde and the Nordic dead.
- Ada-Mantia, Lorkhan, Red Mountain, and the first fixed points of Mundus.

Reference links for flavor and terminology:

- https://en.uesp.net/wiki/Skyrim:Dragonstone_(item)
- https://en.uesp.net/wiki/Skyrim:High_Hrothgar
- https://en.uesp.net/wiki/Skyrim:Blackreach
- https://en.uesp.net/wiki/Skyrim:Elder_Scroll
- https://en.uesp.net/wiki/Skyrim:The_Throat_of_the_World_(quest)
- https://en.uesp.net/wiki/Skyrim:Sovngarde_(place)
- https://en.uesp.net/wiki/Lore:The_Towers
- https://en.uesp.net/wiki/Lore:Lorkhan
- https://en.uesp.net/wiki/Lore:Red_Mountain

## Puzzle Model

Each phase is a record in an authored table:

- `target`: the ORIGIN letter being sought.
- `hour`: the volvelle hour name.
- `loreClue`: the clue shown to the player.
- `unlockText`: the text revealed after validation.
- `requiredSignature`: the exact detected contents required in the frame.
- `answerSymbol`: the letter rendered in Zone A^3 using the script-symbol image style.

The required signature compares the detector output:

- Zone C: two adjacent inner runes, called the star pair.
- Zone B: one middle number, called the hour gate.
- Zone A^1 and A^2: two adjacent outer Daedric letters, called the horizon pair.

No formula turns those symbols into the answer. The app only asks: does the current detected signature match the current phase's authored signature? If yes, Zone A^3 displays the phase answer and Validate A^3 stamps it. If no, Zone A^3 stays unsettled/fogged and validation logs a false attempt.

## Symbol Value Ledger

Players must not be expected to identify required symbols by guessing from the riddle alone. The UI needs a persistent Volvelle Ledger near the ORIGIN guide that maps every symbol to its value and meaning.

The ledger has three sections:

- Horizon Atlas: the outer Daedric ring. It shows each capital letter value `A-Z`, its Daedric/script symbol, and the static lowercase wheel coordinate that helps the player find it around the wheel.
- Hour Gate: the middle ring. It shows values `1-9`, with the visible middle-ring mark for each number and a short hour name.
- Star Ledger: the inner ring. It shows values `1-22`, the rune symbol, and a Skyrim-flavored epithet used by the clues.

The clue chain should use those ledger names directly. For example, "take Nordic Song beside Hall Echo" means the player opens the Star Ledger, finds `Nordic Song = value 11 = ᛁ` and `Hall Echo = value 12 = ᛃ`, then rotates the inner wheel until those two runes sit in Zone C.

### Star Ledger Values

| Value | Rune | Epithet | Player meaning |
| --- | --- | --- | --- |
| 1 | `ᚠ` | First Ember | the first waking mark |
| 2 | `ᚢ` | Dragon Breath | the return of dragons |
| 3 | `ᚦ` | Barrow Thorn | Nordic ruin danger |
| 4 | `ᚨ` | Grey Voice | the Greybeards' call |
| 5 | `ᚱ` | Mountain Road | the climb to High Hrothgar |
| 6 | `ᚲ` | Deep Key | the way into hidden depths |
| 7 | `ᚷ` | Blackreach Glow | the false sun below Skyrim |
| 8 | `ᚹ` | Elder Witness | the scroll that remembers |
| 9 | `ᚺ` | Time Wound | the wound at the throat of the world |
| 10 | `ᚾ` | Frost Need | the cold necessity of fate |
| 11 | `ᛁ` | Nordic Song | Sovngarde's remembered song |
| 12 | `ᛃ` | Hall Echo | the echo inside Shor's hall |
| 13 | `ᛇ` | Hidden Yew | a concealed old path |
| 14 | `ᛈ` | Scroll Lot | the reading of a sealed fate |
| 15 | `ᛉ` | Watcher Fork | a forked guard-mark |
| 16 | `ᛊ` | Snow Serpent | a winding Skyrim trail |
| 17 | `ᛏ` | Tower Spear | the upright tower sign |
| 18 | `ᛒ` | Red Betrayal | the judgment of Lorkhan |
| 19 | `ᛖ` | Ash March | the road toward Red Mountain |
| 20 | `ᛗ` | Mundus Stone | the mortal world's fixed weight |
| 21 | `ᛚ` | Lorkhan Spark | the heart-wound principle |
| 22 | `ᛜ` | Origin Seal | the closing sign |

### Hour Gate Values

| Value | Hour name | Player meaning |
| --- | --- | --- |
| 1 | Dawn | first light / beginning |
| 2 | Prime | disciplined voice |
| 3 | Return | first fixed point |
| 4 | Watch | patient observation |
| 5 | Zenith | hidden sun |
| 6 | Ash | Red Mountain omen |
| 7 | Dusk | time turning back on itself |
| 8 | Deep | underground witness |
| 9 | Midnight | Sovngarde and the dead |

### Horizon Atlas Values

The Horizon Atlas is direct: `A = 1`, `B = 2`, through `Z = 26`. The outer ring still displays Daedric/script symbols, but the atlas must show the Latin value next to each symbol so clues can say things like "split the horizon at N and O" without forcing the player to infer the symbol shapes unaided.

## Player Method

Each phase should teach a repeatable 4-step method:

1. Read the lore clue and identify the named ledger epithets or letter pair.
2. Look up those names in the Volvelle Ledger to get exact rune, number, and horizon values.
3. Rotate the wheels until the frame catches those values in Zone C, Zone B, Zone A^1, and Zone A^2.
4. Press Validate A^3 only after the large white answer symbol appears in the final box.

## Phase Chain

The exact authored signatures should use naturally adjacent pairs because the frame windows currently sample neighboring positions.

| Phase | Letter | Hour | Player-facing clue | Ledger lookup cue | Required frame signature | Matching offsets | Reveal after validation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | O | Dawn | "Where the dragon-map first lay under Nordic stone, set the first hour. In the Star Ledger, wake First Ember beside Dragon Breath; split the Horizon Atlas at the Dragonborn's beginning after C." | Star Ledger values `1-2`; Hour Gate `Dawn = 1`; Horizon Atlas `D-E`. | C: `ᚠ` + `ᚢ`; B: `1`; A^1/A^2: `D` + `E` | outer `5`, middle `3`, inner `7` | "Dawn names the answer box: only A^3 speaks. The next road climbs to the mountain of the Voice." |
| 2 | R | Prime | "At High Hrothgar, breath is counted before it is shouted. Take Grey Voice beside Mountain Road, set the Prime gate, and split the horizon at the initials of High Hrothgar's climb." | Star Ledger values `4-5`; Hour Gate `Prime = 2`; Horizon Atlas `H-I`. | C: `ᚨ` + `ᚱ`; B: `2`; A^1/A^2: `H` + `I` | outer `1`, middle `2`, inner `4` | "Prime teaches the hour gate. Numbers do not solve the lock; they choose which hour may be heard." |
| 3 | I | Zenith | "Below Skyrim, the false sun of Blackreach crowns the deep. Join Deep Key to Blackreach Glow, set Zenith, and let the cavern's first two letters form the horizon." | Star Ledger values `6-7`; Hour Gate `Zenith = 5`; Horizon Atlas `B-C`. | C: `ᚲ` + `ᚷ`; B: `5`; A^1/A^2: `B` + `C` | outer `7`, middle `8`, inner `2` | "Zenith teaches the star pair. Two inner signs must sit together before the lens has memory." |
| 4 | G | Dusk | "At the Time-Wound, old battle and present breath overlap. Pair Time Wound with Frost Need, set Dusk, and split the horizon where the throat's storm turns." | Star Ledger values `9-10`; Hour Gate `Dusk = 7`; Horizon Atlas `S-T`. | C: `ᚺ` + `ᚾ`; B: `7`; A^1/A^2: `S` + `T` | outer `16`, middle `6`, inner `21` | "Dusk teaches the split horizon. A^1 and A^2 are two halves of the same sightline." |
| 5 | I | Midnight | "In Sovngarde, the dead do not count years; they keep the song. Take Nordic Song beside Hall Echo, set Midnight, and split the horizon at the two letters that begin the Nordic oath." | Star Ledger values `11-12`; Hour Gate `Midnight = 9`; Horizon Atlas `N-O`. | C: `ᛁ` + `ᛃ`; B: `9`; A^1/A^2: `N` + `O` | outer `21`, middle `4`, inner `19` | "Midnight proves recurrence. The same answer may return, but only from a new alignment." |
| 6 | N | Return | "When the path leaves Skyrim, seek the first fixed point. Bring Mundus Stone beside Lorkhan Spark, set Return, and split the horizon at the first two letters before any road." | Star Ledger values `20-21`; Hour Gate `Return = 3`; Horizon Atlas `A-B`. | C: `ᛗ` + `ᛚ`; B: `3`; A^1/A^2: `A` + `B` | outer `8`, middle `1`, inner `10` | "Return seals ORIGIN and opens the premise record." |

The matching offsets above were checked against the current detector geometry and are reachable with the 26-letter outer ring, 9-symbol middle ring, and 22-rune inner ring.

## User Flow

1. The player sees only the Dawn clue at first.
2. They use the Volvelle Ledger to translate clue terms into exact symbol values.
3. They rotate the three wheels until the frame detects Dawn's required signature.
4. Zone A^3 changes from unsettled/fogged to the large white script answer symbol.
5. The player presses Validate A^3.
6. If true, the answer is stamped in the bottom-right ledger and the next lore clue unlocks.
7. If false, the attempt counter advances; six false validations reset ORIGIN progress and return the chain to Dawn.
8. After the sixth true validation, the antique premise modal opens.

## Component Design

`src/components/CipherWheel.tsx`

- Keep the frame geometry and detection zones.
- Replace `computeProbeResult` arithmetic with a detector function that can return the raw zone signature.
- Render Zone A^3 from the current phase state: matched answer symbol or unsettled visual state.

`src/App.tsx`

- Replace `ORIGIN_GUIDE_STEPS` with the Volvelle phase table.
- Add Volvelle Ledger data for Horizon Atlas, Hour Gate, and Star Ledger.
- Track current phase by validated hit count.
- Validation compares current detector signature against the active phase signature.
- Existing stamp ledger and six-attempt reset stay.

`src/wheel.ts`

- Keep ring arrays and offsets.
- No ORIGIN answer formula belongs here.

## Error Handling

- If a signature is impossible due to detector geometry, the app should not silently ship it; implementation verification must assert that every phase can be reached.
- If Zone A^3 is unmatched, validation must log a false attempt with a clear message: "The hour is not yet witnessed."
- If ORIGIN is complete, Validate A^3 reopens the premise modal rather than adding extra stamps.
- If a player has not found the values, the clue panel should direct them to the Volvelle Ledger rather than exposing the hidden detection result directly.

## Testing

Required verification before implementation is considered done:

- Unit or script check that all six phase signatures are reachable by some outer/middle/inner offsets.
- Render check that the Volvelle Ledger exposes all outer, middle, and inner symbol values.
- Render check that every phase clue includes a ledger lookup cue.
- Render check that A^3 is large, white, and uses the script-symbol style when a phase is matched.
- Browser check that each phase validates only by pressing Validate A^3.
- Browser check that false attempts reset progress after six tries.
- Browser check that the completion modal opens after O, R, I, G, I, N are stamped.
- Public Pages verification if changes are pushed.

## Open Decision

The user approved the Volvelle of Six Hours direction and requested Skyrim-lore-based cryptic clues. Before implementation, the user should review this spec and confirm whether the proposed lore chain and phase names feel right.
