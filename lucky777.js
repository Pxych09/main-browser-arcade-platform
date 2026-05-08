// ═══════════════════════════════════════════════════
// lucky777.js — Lucky 777 Classic Slot Machine
// 3 reels · player-chosen bet · jackpot bonus round
// win streak tracker · daily free spins · leaderboard
// ═══════════════════════════════════════════════════

import { updateDoc, addDoc, collection, query, where,
         orderBy, limit, getDocs, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { db, DB }         from "./db.js";
import { $, cls, sleep, animateBump } from "./utils.js";
import { State, Toast }   from "./state.js";
import { CreditsModule }  from "./fruit-game.js";

// ─────────────────────────────────────────────────
// SYMBOLS CONFIG
// ─────────────────────────────────────────────────

export const SLOT_SYMBOLS = [
  { id: "seven",   emoji: "7️⃣",  weight: 3,  label: "Seven"    },
  { id: "bar",     emoji: "🎰",  weight: 5,  label: "Bar"      },
  { id: "diamond", emoji: "💎",  weight: 8,  label: "Diamond"  },
  { id: "bell",    emoji: "🔔",  weight: 12, label: "Bell"     },
  { id: "cherry",  emoji: "🍒",  weight: 20, label: "Cherry"   },
  { id: "lemon",   emoji: "🍋",  weight: 22, label: "Lemon"    },
  { id: "grape",   emoji: "🍇",  weight: 18, label: "Grape"    },
  { id: "blank",   emoji: "💨",  weight: 12, label: "Blank"    },
];

const TOTAL_WEIGHT = SLOT_SYMBOLS.reduce((s, sym) => s + sym.weight, 0);

// Payout multipliers for 3-of-a-kind (applied to bet amount)
export const PAYOUTS = {
  seven:   0,   // handled by jackpot bonus round
  bar:     50,
  diamond: 20,
  bell:    10,
  cherry:  5,
  lemon:   3,
  grape:   4,
  blank:   0,
};

// 2-of-a-kind partial payouts (multiplied by bet)
export const PARTIAL_PAYOUTS = {
  seven:   10,
  bar:     4,
  diamond: 3,
  bell:    2,
  cherry:  1,
  lemon:   0,
  grape:   1,
  blank:   0,
};

// Bet options
export const BET_OPTIONS = [1, 5, 10, 25, 50, 100];

// Daily free spins
export const FREE_SPINS_PER_DAY = 5;
export const FREE_SPIN_BET      = 5; // credits awarded per free spin win

// ─────────────────────────────────────────────────
// WEIGHTED RANDOM
// ─────────────────────────────────────────────────

const getRandomSymbol = () => {
  let r = Math.random() * TOTAL_WEIGHT;
  for (const sym of SLOT_SYMBOLS) {
    r -= sym.weight;
    if (r <= 0) return sym;
  }
  return SLOT_SYMBOLS[SLOT_SYMBOLS.length - 1];
};

// ─────────────────────────────────────────────────
// AUDIO
// ─────────────────────────────────────────────────

const Audio777 = (() => {
  let ctx;
  const get = () => {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  };

  const tone = (freq, dur, type = "sine", vol = 0.08) => {
    try {
      const c = get();
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type; o.frequency.value = freq; g.gain.value = vol;
      o.connect(g); g.connect(c.destination);
      o.start(); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
      o.stop(c.currentTime + dur);
    } catch(e) {}
  };

  return {
    tick:    () => tone(600, 0.04, "square", 0.05),
    reelStop:() => tone(440, 0.12, "sine",   0.1),
    win:     () => {
      [523, 659, 784, 1047].forEach((f, i) =>
        setTimeout(() => tone(f, 0.3, "sine", 0.12), i * 80));
    },
    jackpot: () => {
      [523,659,784,1047,1319,1568].forEach((f, i) =>
        setTimeout(() => tone(f, 0.5, "sine", 0.15), i * 60));
    },
    lose:    () => tone(200, 0.4, "sawtooth", 0.07),
    spin:    () => tone(800, 0.06, "square",  0.04),
    freeSpin:() => {
      [800, 1000, 1200].forEach((f, i) =>
        setTimeout(() => tone(f, 0.2, "sine", 0.1), i * 60));
    },
  };
})();

// ─────────────────────────────────────────────────
// FIRESTORE HELPERS (777-specific)
// ─────────────────────────────────────────────────

const DB777 = {
  async getDailyFreeSpins(uid) {
    const data = await DB.getUser(uid);
    if (!data) return FREE_SPINS_PER_DAY;
    const raw = data.lucky777FreeSpinDate;
    if (!raw) return FREE_SPINS_PER_DAY;
    const stored = raw.toDate ? raw.toDate() : new Date(raw);
    if (stored.toDateString() !== new Date().toDateString())
      return FREE_SPINS_PER_DAY;
    const used = data.lucky777FreeSpinsUsed ?? 0;
    return Math.max(0, FREE_SPINS_PER_DAY - used);
  },

  async useFreeSpins(uid, count = 1) {
    const data = await DB.getUser(uid);
    const raw  = data?.lucky777FreeSpinDate;
    const stored = raw?.toDate ? raw.toDate() : (raw ? new Date(raw) : null);
    const isToday = stored?.toDateString() === new Date().toDateString();
    const used  = isToday ? (data?.lucky777FreeSpinsUsed ?? 0) : 0;
    await updateDoc(DB.userRef(uid), {
      lucky777FreeSpinsUsed: used + count,
      lucky777FreeSpinDate:  new Date(),
    });
  },

  async getStreak(uid) {
    const data = await DB.getUser(uid);
    return {
      streak:    data?.lucky777Streak    ?? 0,
      bestStreak:data?.lucky777BestStreak ?? 0,
    };
  },

  async updateStreak(uid, streak) {
    const data = await DB.getUser(uid);
    const best = Math.max(data?.lucky777BestStreak ?? 0, streak);
    await updateDoc(DB.userRef(uid), {
      lucky777Streak:     streak,
      lucky777BestStreak: best,
    });
  },

  async logSpin(uid, result, bet, payout) {
    await addDoc(collection(db, "lucky777History"), {
      userId: uid, result, bet, payout, createdAt: serverTimestamp(),
    });
  },

  async getLeaderboard(topN = 20) {
    const q = query(
      collection(db, "users"),
      orderBy("lucky777BestStreak", "desc"),
      limit(topN)
    );
    const snap = await getDocs(q);
    return snap.docs
      .map(d => ({ uid: d.id, ...d.data() }))
      .filter(d => (d.lucky777BestStreak ?? 0) > 0);
  },
};

// ─────────────────────────────────────────────────
// LUCKY 777 GAME CLASS
// ─────────────────────────────────────────────────

export class Lucky777Game {
  constructor() {
    this.spinning    = false;
    this.bet         = 5;
    this.streak      = 0;
    this.bestStreak  = 0;
    this.freeSpins   = 0;
    this.usingFree   = false;
    this.inJackpot   = false;

    // Reel strip elements (3 reels × 3 visible rows)
    this.reelEls = [
      $("l7-reel-0"),
      $("l7-reel-1"),
      $("l7-reel-2"),
    ];
  }

  // ── Mount / Unmount ────────────────────────────

  async mount() {
    await this._loadState();
    this._renderBetSelector();
    this._renderPayTable();
    this._renderFreeSpins();
    this._renderStreak();
    this._updateSpinBtn();
    this._initReels();
    this._bindEvents();
    this.loadLeaderboard();
  }

  unmount() {
    this.spinning = false;
  }

  // ── Init ───────────────────────────────────────

  async _loadState() {
    if (!State.user) return;
    const [freeSpins, streakData] = await Promise.all([
      DB777.getDailyFreeSpins(State.user.uid),
      DB777.getStreak(State.user.uid),
    ]);
    this.freeSpins  = freeSpins;
    this.streak     = streakData.streak;
    this.bestStreak = streakData.bestStreak;
  }

  _initReels() {
    this.reelEls.forEach(reel => {
      if (!reel) return;
      reel.innerHTML = "";
      // 3 visible rows per reel, pre-fill with random symbols
      for (let i = 0; i < 3; i++) {
        const sym = getRandomSymbol();
        const cell = document.createElement("div");
        cell.className   = "l7-cell";
        cell.textContent = sym.emoji;
        reel.appendChild(cell);
      }
    });
  }

  _bindEvents() {
    // Spin button
    $("l7-spin-btn")?.addEventListener("click", () => this.spin());

    // Free spin button
    $("l7-freespin-btn")?.addEventListener("click", () => this.spin(true));

    // Bet selector — delegated
    $("l7-bet-selector")?.addEventListener("click", (e) => {
      const btn = e.target.closest(".l7-bet-btn");
      if (!btn || this.spinning) return;
      this.bet = parseInt(btn.dataset.bet);
      document.querySelectorAll(".l7-bet-btn").forEach(b =>
        b.classList.toggle("l7-bet-active", b === btn));
      this._updateSpinBtn();
    });

    // Jackpot bonus buttons (delegated from bonus overlay)
    $("l7-bonus-overlay")?.addEventListener("click", (e) => {
      const pick = e.target.closest(".l7-bonus-pick");
      if (!pick || !this.inJackpot) return;
      this._resolveBonusRound(parseInt(pick.dataset.multiplier));
    });
  }

  // ── Render helpers ─────────────────────────────

  _renderBetSelector() {
    const el = $("l7-bet-selector");
    if (!el) return;
    el.innerHTML = BET_OPTIONS.map(b => `
      <button class="l7-bet-btn${b === this.bet ? " l7-bet-active" : ""}"
              data-bet="${b}">${b}</button>
    `).join("");
  }

  _renderPayTable() {
    const el = $("l7-paytable-body");
    if (!el) return;
    const rows = [
      { sym: SLOT_SYMBOLS.find(s => s.id === "seven"),   x3: "JACKPOT 🎉", x2: `${PARTIAL_PAYOUTS.seven}×` },
      { sym: SLOT_SYMBOLS.find(s => s.id === "bar"),     x3: `${PAYOUTS.bar}×`,    x2: `${PARTIAL_PAYOUTS.bar}×` },
      { sym: SLOT_SYMBOLS.find(s => s.id === "diamond"), x3: `${PAYOUTS.diamond}×`,x2: `${PARTIAL_PAYOUTS.diamond}×` },
      { sym: SLOT_SYMBOLS.find(s => s.id === "bell"),    x3: `${PAYOUTS.bell}×`,   x2: `${PARTIAL_PAYOUTS.bell}×` },
      { sym: SLOT_SYMBOLS.find(s => s.id === "cherry"),  x3: `${PAYOUTS.cherry}×`, x2: `${PARTIAL_PAYOUTS.cherry}×` },
      { sym: SLOT_SYMBOLS.find(s => s.id === "grape"),   x3: `${PAYOUTS.grape}×`,  x2: `${PARTIAL_PAYOUTS.grape}×` },
      { sym: SLOT_SYMBOLS.find(s => s.id === "lemon"),   x3: `${PAYOUTS.lemon}×`,  x2: "—" },
      { sym: SLOT_SYMBOLS.find(s => s.id === "blank"),   x3: "—",                  x2: "—" },
    ];
    el.innerHTML = rows.map(r => `
      <tr>
        <td class="l7-pt-sym">${r.sym.emoji} ${r.sym.label}</td>
        <td class="l7-pt-val">${r.x3}</td>
        <td class="l7-pt-val">${r.x2}</td>
      </tr>
    `).join("");
  }

  _renderFreeSpins() {
    const el = $("l7-freespins-count");
    if (el) el.textContent = this.freeSpins;
    const btn = $("l7-freespin-btn");
    if (btn) btn.disabled = this.freeSpins <= 0 || this.spinning;
  }

  _renderStreak() {
    const streakEl = $("l7-streak");
    const bestEl   = $("l7-best-streak");
    if (streakEl) streakEl.textContent = this.streak;
    if (bestEl)   bestEl.textContent   = this.bestStreak;

    // Highlight streak fire
    const fire = $("l7-streak-fire");
    if (fire) {
      fire.textContent = this.streak >= 5 ? "🔥🔥🔥" :
                         this.streak >= 3 ? "🔥🔥"   :
                         this.streak >= 1 ? "🔥"     : "";
    }
  }

  _updateSpinBtn() {
    const btn = $("l7-spin-btn");
    if (!btn) return;
    const canAfford = State.userData?.credits >= this.bet;
    btn.disabled = this.spinning || !canAfford;
    btn.textContent = this.spinning ? "SPINNING…" : `🎰 SPIN  ·  ${this.bet} cr`;
  }

  // ── Spin logic ─────────────────────────────────

  async spin(useFree = false) {
    if (this.spinning) return;

    if (useFree) {
      if (this.freeSpins <= 0) return;
      this.usingFree = true;
    } else {
      this.usingFree = false;
      if ((State.userData?.credits ?? 0) < this.bet) {
        Toast.show("Not enough credits!", "error");
        return;
      }
      await CreditsModule.deduct(this.bet);
    }

    this.spinning = true;
    this._updateSpinBtn();
    $("l7-result-banner")?.classList.remove("l7-banner-win","l7-banner-lose","l7-banner-jackpot","l7-banner-visible");

    // Generate final symbols for all 3 reels
    const results = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];

    // Animate reels with staggered stops
    await this._animateReels(results);

    // Evaluate outcome
    const { payout, outcome } = this._evaluate(results, this.usingFree ? FREE_SPIN_BET : this.bet);

    // Jackpot: all 7s — trigger bonus round
    if (outcome === "jackpot") {
      this._showJackpotBonus();
      return; // bonus round takes over from here
    }

    await this._applyOutcome(results, payout, outcome);
  }

  // ── Reel animation ─────────────────────────────

  async _animateReels(finalSymbols) {
    const SPIN_TICKS = [18, 22, 26]; // each reel spins different number of ticks
    const TICK_MS    = 80;

    const promises = this.reelEls.map((reel, i) =>
      this._spinReel(reel, finalSymbols[i], SPIN_TICKS[i], TICK_MS)
    );

    await Promise.all(promises);
  }

  async _spinReel(reelEl, finalSym, ticks, tickMs) {
    if (!reelEl) return;
    const cells = reelEl.querySelectorAll(".l7-cell");

    for (let t = 0; t < ticks; t++) {
      const sym = t === ticks - 1 ? finalSym : getRandomSymbol();
      // Shift display: row 0 ← row 1 ← row 2 ← new symbol
      if (cells[0]) cells[0].textContent = cells[1]?.textContent ?? "?";
      if (cells[1]) cells[1].textContent = cells[2]?.textContent ?? "?";
      if (cells[2]) cells[2].textContent = sym.emoji;

      Audio777.spin();
      reelEl.classList.add("l7-reel-spinning");
      await sleep(tickMs);
    }

    reelEl.classList.remove("l7-reel-spinning");
    Audio777.reelStop();

    // Highlight the middle (payline) row
    if (cells[1]) {
      cells[1].classList.add("l7-cell-payline");
      setTimeout(() => cells[1].classList.remove("l7-cell-payline"), 600);
    }
  }

  // ── Evaluate outcome ───────────────────────────

  _evaluate(symbols, bet) {
    const ids = symbols.map(s => s.id);

    // Triple 7 — jackpot bonus
    if (ids.every(id => id === "seven")) {
      return { payout: 0, outcome: "jackpot" };
    }

    // 3-of-a-kind
    if (ids[0] === ids[1] && ids[1] === ids[2]) {
      const multi = PAYOUTS[ids[0]] ?? 0;
      return { payout: multi * bet, outcome: multi > 0 ? "win3" : "lose" };
    }

    // 2-of-a-kind (any pair in the 3 reels)
    const counts = {};
    ids.forEach(id => counts[id] = (counts[id] || 0) + 1);
    const pairId = Object.entries(counts).find(([, c]) => c >= 2)?.[0];
    if (pairId) {
      const multi = PARTIAL_PAYOUTS[pairId] ?? 0;
      return { payout: multi * bet, outcome: multi > 0 ? "win2" : "lose" };
    }

    return { payout: 0, outcome: "lose" };
  }

  // ── Apply result ───────────────────────────────

  async _applyOutcome(symbols, payout, outcome) {
    const isWin = payout > 0;

    // Update streak
    if (isWin) {
      this.streak++;
      if (this.streak > this.bestStreak) this.bestStreak = this.streak;
    } else {
      this.streak = 0;
    }

    // Streak bonus multiplier (cosmetic label, actual math below)
    const streakBonus = this.streak >= 5 ? 2 :
                        this.streak >= 3 ? 1.5 : 1;
    const finalPayout = isWin ? Math.floor(payout * streakBonus) : 0;

    // Credit update
    if (this.usingFree) {
      if (isWin) await CreditsModule.add(finalPayout);
      this.freeSpins--;
      await DB777.useFreeSpins(State.user.uid);
    } else {
      if (isWin) await CreditsModule.add(finalPayout);
    }

    // Persist streak
    await DB777.updateStreak(State.user.uid, this.streak).catch(() => {});

    // Log
    DB777.logSpin(
      State.user.uid,
      symbols.map(s => s.emoji).join(""),
      this.usingFree ? 0 : this.bet,
      finalPayout
    ).catch(() => {});

    // UI feedback
    this._showResultBanner(outcome, finalPayout, streakBonus);
    this._renderStreak();
    this._renderFreeSpins();
    this.loadLeaderboard();

    if (isWin) Audio777.win(); else Audio777.lose();

    this.spinning = false;
    this._updateSpinBtn();
  }

  // ── Result banner ──────────────────────────────

  _showResultBanner(outcome, payout, streakBonus) {
    const banner = $("l7-result-banner");
    const text   = $("l7-result-text");
    if (!banner || !text) return;

    const streakNote = streakBonus > 1 ? ` (🔥 ${streakBonus}× streak bonus!)` : "";

    let msg = "", cls2 = "";
    switch (outcome) {
      case "win3":
        msg  = `🎉 THREE OF A KIND! +${payout} credits${streakNote}`;
        cls2 = "l7-banner-win"; break;
      case "win2":
        msg  = `✨ PAIR! +${payout} credits${streakNote}`;
        cls2 = "l7-banner-win"; break;
      case "lose":
        msg  = this.streak === 0
          ? `😤 No match. Streak reset.`
          : `😤 No match.`;
        cls2 = "l7-banner-lose"; break;
    }

    text.textContent = msg;
    banner.className = `l7-result-banner ${cls2} l7-banner-visible`;
  }

  // ── Jackpot bonus round ────────────────────────

  _showJackpotBonus() {
    this.inJackpot = true;
    Audio777.jackpot();

    const overlay = $("l7-bonus-overlay");
    if (!overlay) return;

    // Generate 5 mystery boxes with hidden multipliers
    const multipliers = this._shuffleArray([10, 25, 50, 100, 200]);
    const picks = $("l7-bonus-picks");
    if (picks) {
      picks.innerHTML = multipliers.map((m, i) => `
        <button class="l7-bonus-pick" data-multiplier="${m}" data-index="${i}">
          <span class="l7-bonus-box-icon">🎁</span>
          <span class="l7-bonus-box-label">Pick Me!</span>
        </button>
      `).join("");
    }

    const betDisplay = $("l7-bonus-bet");
    if (betDisplay) betDisplay.textContent = this.bet;

    overlay.classList.add("l7-bonus-visible");
  }

  async _resolveBonusRound(multiplier) {
    this.inJackpot = false;
    const overlay  = $("l7-bonus-overlay");

    // Reveal all boxes
    document.querySelectorAll(".l7-bonus-pick").forEach(btn => {
      const m = parseInt(btn.dataset.multiplier);
      btn.querySelector(".l7-bonus-box-icon").textContent = m === multiplier ? "💰" : "💸";
      btn.querySelector(".l7-bonus-box-label").textContent = `${m}×`;
      if (m === multiplier) btn.classList.add("l7-bonus-chosen");
      btn.disabled = true;
    });

    await sleep(1200);
    overlay?.classList.remove("l7-bonus-visible");

    // Pay out
    const payout = this.bet * multiplier;
    await CreditsModule.add(payout);

    // Streak update — jackpot counts as a win
    this.streak++;
    if (this.streak > this.bestStreak) this.bestStreak = this.streak;
    await DB777.updateStreak(State.user.uid, this.streak).catch(() => {});

    DB777.logSpin(
      State.user.uid,
      "7️⃣7️⃣7️⃣",
      this.bet,
      payout
    ).catch(() => {});

    // Banner
    const banner = $("l7-result-banner");
    const text   = $("l7-result-text");
    if (banner && text) {
      text.textContent = `🎰 JACKPOT! ${multiplier}× = +${payout} credits! 🎰`;
      banner.className = "l7-result-banner l7-banner-jackpot l7-banner-visible";
    }

    this._renderStreak();
    this.loadLeaderboard();

    this.spinning = false;
    this._updateSpinBtn();
  }

  // ── Leaderboard ────────────────────────────────

  async loadLeaderboard() {
    const el = $("l7-leaderboard-list");
    if (!el) return;
    el.innerHTML = `<div class="l7-lb-loading">Loading…</div>`;

    try {
      const entries = await DB777.getLeaderboard(10);
      if (entries.length === 0) {
        el.innerHTML = `<div class="l7-lb-empty">No scores yet.</div>`;
        return;
      }
      const medals = ["🥇","🥈","🥉"];
      el.innerHTML = entries.map((e, i) => {
        const isMe = e.uid === State.user?.uid;
        const name = e.nickname?.trim() || e.email?.split("@")[0] || "Player";
        return `
          <div class="l7-lb-row${isMe ? " l7-lb-row-me" : ""}">
            <span class="l7-lb-rank">${medals[i] ?? "#" + (i + 1)}</span>
            <span class="l7-lb-name">${name}${isMe ? " <span class='lb-you'>YOU</span>" : ""}</span>
            <span class="l7-lb-val">${e.lucky777BestStreak ?? 0} 🔥</span>
          </div>`;
      }).join("");
    } catch(err) {
      el.innerHTML = `<div class="l7-lb-empty">Could not load.</div>`;
    }
  }

  // ── Util ───────────────────────────────────────

  _shuffleArray(arr) { return [...arr].sort(() => Math.random() - 0.5); }
}