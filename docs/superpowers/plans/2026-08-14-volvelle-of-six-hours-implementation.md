# Volvelle of Six Hours Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the algorithmic ORIGIN solver with an authored six-phase Skyrim-lore volvelle puzzle and visible symbol-value ledger.

**Architecture:** Keep the existing React/Vite app and cipher wheel visuals. Move puzzle data into a focused module, expose raw frame-detection signatures from `CipherWheel`, and let `App` compare current signatures against the active Volvelle phase. Zone A^3 renders only a matched phase answer or an unsettled state.

**Tech Stack:** React, TypeScript, Vite, CSS, GitHub Pages PWA deployment.

## Global Constraints

- Keep the black frame artifact and its Zone C, Zone B, Zone A^1, Zone A^2, and Zone A^3 behavior.
- The ORIGIN answer is six phases: O, R, I, G, I, N.
- A letter only counts after pressing Validate A^3.
- Six false validations reset ORIGIN progress.
- Keep the inner wheel at 22 runes.
- Add a visible Volvelle Ledger for outer, middle, and inner symbol values.
- Push the app behavior commit and update generated PWA version.

---

### Task 1: Volvelle Data Module

**Files:**
- Create: `src/volvelle.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces: `VOLVELLE_PHASES`, `VOLVELLE_STAR_LEDGER`, `VOLVELLE_HOUR_LEDGER`, `VOLVELLE_HORIZON_LEDGER`, `VOLVELLE_ATTEMPT_LIMIT`, and `type VolvelleSignature`.
- Consumes: `ALPHABET`, `GLYPH_RING`, `SYMBOL_RING` from `src/wheel.ts`.

- [x] **Step 1: Create the data module**

Add the ledger and phase data exactly from the approved spec.

- [x] **Step 2: Import phase constants in App**

Replace inline ORIGIN constants with imports from `src/volvelle.ts`.

- [x] **Step 3: Build**

Run: `npm run build`

---

### Task 2: Frame Signature Detection

**Files:**
- Modify: `src/components/CipherWheel.tsx`

**Interfaces:**
- Produces: `detectProbeSignature(offsets: RingOffsets): VolvelleSignature`
- Produces: `probeSignatureMatches(current: VolvelleSignature, expected: VolvelleSignature): boolean`
- Modifies: `CipherWheel` props to accept an optional `answerSymbol`

- [x] **Step 1: Replace arithmetic result with raw signature detection**

Use existing Zone C, B, A^1, and A^2 detector geometry, but return the detected values and symbols instead of calculating a letter.

- [x] **Step 2: Render Zone A^3 conditionally**

If `answerSymbol` is supplied, show its large white script-symbol image. If not, show an unsettled mark.

- [x] **Step 3: Build**

Run: `npm run build`

---

### Task 3: App Validation and Guide UI

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `VOLVELLE_PHASES`, ledger arrays, `detectProbeSignature`, `probeSignatureMatches`, and `scriptSymbolSrc`.

- [x] **Step 1: Compare active phase signature**

Use the active phase from `originHits.length` and compare it to `detectProbeSignature(offsets)`.

- [x] **Step 2: Render the Volvelle Ledger**

Add Horizon Atlas, Hour Gate, and Star Ledger sections near the ORIGIN guide.

- [x] **Step 3: Render six lore phases**

Show phase clue, ledger lookup cue, and locked/unlocked state.

- [x] **Step 4: Preserve reset/stamp/completion behavior**

Keep validation-gated hits, bottom-right stamps, six-false reset, and premise popup.

- [x] **Step 5: Build**

Run: `npm run build`

---

### Task 4: Verification and Publish

**Files:**
- Modify only if verification finds a bug.

**Interfaces:**
- Consumes app behavior from Tasks 1-3.

- [x] **Step 1: Verify signatures are reachable**

Run a local script or app-level check to confirm every phase signature can be produced.

- [x] **Step 2: Browser verify six validations**

Use Playwright if bundled Browser tools are unavailable. Confirm six true validations stamp O, R, I, G, I, N and open the premise modal.

- [x] **Step 3: Commit behavior**

Run `git status`, `git diff --check`, then commit app behavior.

- [x] **Step 4: Update PWA version and push**

Run `npm run build` after the commit, commit the generated PWA version if changed, push to `main`, wait for GitHub Pages deploy, and verify `pwa-version.json`.
