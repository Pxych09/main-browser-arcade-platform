# Fruit Game 2026 — File Structure

## JS Files (place all in the same folder as index.html)

```
├── index.html          ← unchanged, just update the script tag (see below)
├── style.css           ← unchanged
│
├── app.js              ← ENTRY POINT. Auth + navigation + event bindings only.
│                          This is the only file your HTML loads.
│
├── config.js           ← All constants: FIREBASE_CONFIG, GAME_CONFIG,
│                          FRUITS, FIXED_LAYOUT, PM_PRESETS, POP_MATCH_CONFIG.
│                          No imports — pure data.
│
├── utils.js            ← Shared helpers: $(), cls, formatCurrency,
│                          getWeightedFruit, GridUtils, sleep, etc.
│                          Imports only from config.js.
│
├── state.js            ← Global State object, Toast, Router.
│                          Imports only from utils.js.
│
├── db.js               ← Firebase init + all Firestore operations (DB object).
│                          Imports from config.js only.
│
├── fruit-game.js       ← GridModule, HistoryModule, CreditsModule,
│                          DailyReward, Sound, SpinModule.
│                          The complete fruit game logic.
│
├── pop-match.js        ← ShopModule + PopMatchGame class.
│                          The complete pop match logic.
│
├── leaderboard.js      ← LeaderboardModule (dashboard + sidebar rendering).
│
└── nickname.js         ← NicknameModule (dual top-bar editor).
```

## Dependency graph (no circular deps)

```
config.js
    ↓
utils.js
    ↓
state.js
    ↓
db.js          ←──────────────────────────────────┐
    ↓                                              │
fruit-game.js  (imports config, utils, state, db) │
    ↓                                              │
pop-match.js   (imports fruit-game for Credits)   │
                                                   │
leaderboard.js (imports db, state, utils)          │
nickname.js    (imports utils, state, db)  ────────┘
    ↓
app.js         (imports everything — entry point only)
```

## One change needed in index.html

Find the last line in your HTML body and update it:

```html
<!-- BEFORE -->
<script type="module" src="app.js"></script>

<!-- AFTER — no change needed! The script tag stays exactly the same. -->
<script type="module" src="app.js"></script>
```

Since app.js uses ES module imports, the browser loads all other files
automatically via the import chain. No bundler, no build step required.

## Adding a new game in the future

1. Create `your-game.js` with your game logic
2. Import what you need: `config.js`, `utils.js`, `state.js`, `db.js`, `fruit-game.js` (for CreditsModule)
3. Add navigation buttons in `app.js` only — no other files need to change
4. Add your screen HTML to `index.html`

## Notes on the combo bug fix

The original `handleMismatch()` in pop-match.js did not reset the combo counter.
This has been fixed — `this.state.combo = 0` is now called on every miss,
matching the intended design where one miss resets the chain to zero.
