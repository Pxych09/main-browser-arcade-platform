// ═══════════════════════════════════════════════════
// fruit-game.js — Fruit Game: Grid, History, Credits,
//                 Daily Reward, Sound, Spin
// ═══════════════════════════════════════════════════

import { updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { GAME_CONFIG, FRUITS, FIXED_LAYOUT }  from "./config.js";
import { $, cls, showEl, hideEl, sleep,
         formatCurrency, formatTime,
         animateBump, getWeightedFruit,
         GridUtils }                           from "./utils.js";
import { State, Toast }                        from "./state.js";
import { DB }                                  from "./db.js";

// ── Grid Module ──────────────────────────────────────

const borderIdx   = GridUtils.borderIndices();
const fruitLayout = {};

borderIdx.forEach(idx => {
  const emoji = FIXED_LAYOUT[idx];
  fruitLayout[idx] = FRUITS.find(f => f.emoji === emoji);
});

let cells = [];

export const GridModule = {
  render() {
    const grid = $("fruit-grid");
    grid.innerHTML = "";
    cells = [];

    for (let i = 0; i < GridUtils.TOTAL; i++) {
      const el       = document.createElement("div");
      const isBorder = GridUtils.isBorder(i);
      el.className   = isBorder ? "cell fruit" : "cell inner";

      if (isBorder) {
        const fruit    = fruitLayout[i];
        el.textContent = fruit.emoji;
        el.dataset.index = i;
        if (fruit.emoji === "💣") el.classList.add("bomb");
        if (fruit.emoji === "🍫") el.classList.add("jackpot");
      } else {
        el.textContent = "X";
      }

      grid.appendChild(el);
      cells.push(el);
    }
  },

  clearHighlights() {
    borderIdx.forEach(i => cls.remove(cells[i], "lit", "winner"));
  },

  setLit(idx)    { this.clearHighlights(); cls.add(cells[idx], "lit");    },
  setWinner(idx) { this.clearHighlights(); cls.add(cells[idx], "winner"); },
  getFruitAt(idx)       { return fruitLayout[idx]; },
  getBorderIndices()    { return borderIdx; },
};

// ── History Module ───────────────────────────────────

const todayStart = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const todayEnd   = () => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()+1); return d; };

const buildHistoryItem = ({ result, reward, createdAt }, isNew = false) => {
  const el     = document.createElement("div");
  el.className = "history-item" + (isNew ? " is-new" : "");
  const time   = createdAt?.toDate ? formatTime(createdAt.toDate()) : formatTime(new Date());
  const isBomb = result === "💣";
  el.innerHTML = `
    <span class="hi-fruit">${result}</span>
    <span class="hi-middle">
      <span class="hi-reward ${isBomb ? "hi-bomb" : ""}">
        ${isBomb ? "💥 Nothing" : "+" + formatCurrency(reward)}
      </span>
      <span class="hi-label">${isBomb ? "Bomb hit!" : "Collected"}</span>
    </span>
    <span class="hi-time">${time}</span>`;
  return el;
};

export const HistoryModule = {
  prepend(entry) {
    const list = $("history-list");
    if (!list) return;

    list.prepend(buildHistoryItem(entry, true));
    while (list.children.length > 50) list.lastChild.remove();
    setTimeout(() => list.firstChild?.classList.remove("is-new"), 1500);

    // Update today stats (optimistic)
    const todaySpinsEl = $("stat-today-spins");
    const todayWonEl   = $("stat-today-won");
    if (todaySpinsEl) {
      todaySpinsEl.textContent = (parseInt(todaySpinsEl.textContent) || 0) + 1;
      animateBump(todaySpinsEl, "stat-bump");
    }
    if (todayWonEl && entry.reward > 0) {
      const prev = parseFloat((todayWonEl.textContent || "0").replace("₱","")) || 0;
      todayWonEl.textContent = formatCurrency(prev + entry.reward);
      animateBump(todayWonEl, "stat-bump");
    }

    const badge = $("history-count");
    if (badge) {
      badge.textContent = (parseInt(badge.textContent || "0")) + 1;
      animateBump(badge, "stat-bump");
    }

    cls.add($("history-empty"), "hidden");
  },

  async load(uid) {
    const list = $("history-list");
    if (!list) return;
    list.innerHTML = "";

    DB.purgeOldHistory(uid).catch(err => console.warn("[Purge] failed:", err));
    ["stat-today-spins","stat-today-won"].forEach(id => {
      const el = $(id); if (el) el.textContent = "…";
    });

    try {
      const [todayItems, recentItems] = await Promise.all([
        DB.getDayHistory(uid, todayStart(), todayEnd()),
        DB.getRecentHistory(uid, 50),
      ]);

      const sum = (items) => items.reduce((s, i) => s + (i.reward || 0), 0);
      const todaySpinsEl = $("stat-today-spins");
      const todayWonEl   = $("stat-today-won");
      const badge        = $("history-count");

      if (todaySpinsEl) todaySpinsEl.textContent = todayItems.length;
      if (todayWonEl)   todayWonEl.textContent   = sum(todayItems) > 0
        ? formatCurrency(sum(todayItems)) : "₱0.00";
      if (badge)        badge.textContent         = recentItems.length;

      recentItems.forEach(item => list.appendChild(buildHistoryItem(item)));
      const empty = $("history-empty");
      if (empty) cls.toggle(empty, "hidden", recentItems.length > 0);

    } catch (err) {
      console.error("History load failed:", err);
      ["stat-today-spins","stat-today-won"]
        .forEach(id => { const el = $(id); if (el) el.textContent = "—"; });
    }
  },
};

// ── Credits Module ───────────────────────────────────

export const CreditsModule = {
  setDisplay(val) {
    const v = Math.floor(val);
    $("hdr-credits").textContent   = v;
    $("game-credits").textContent  = v;
    $("match-credits").textContent = v;
    $("l7-credits").textContent    = v;   // ← ADD THIS LINE
  },

  bump() {
    animateBump($("hdr-credits"),  "bump");
    animateBump($("game-credits"), "bump");
  },

  flashInsufficient() { animateBump($("game-credits"), "flash-red"); },

  async deduct(amount) {
    const current = State.userData.credits;
    if (current < amount) return false;
    const updated = current - amount;
    State.userData.credits = updated;
    this.setDisplay(updated);
    await DB.updateCredits(State.user.uid, updated);
    return true;
  },

  async add(amount) {
    const updated = State.userData.credits + amount;
    State.userData.credits = updated;
    this.setDisplay(updated);
    this.bump();
    await DB.updateCredits(State.user.uid, updated);
  },
};

// ── Daily Reward Module ──────────────────────────────

const REWARD_PER_DAY = 100;
const MS_PER_DAY     = 24 * 60 * 60 * 1000;

let _countdownInterval = null;

const getLastClaim = () => {
  const raw = State.userData.lastClaimAt;
  if (!raw) return null;
  if (raw.toDate) return raw.toDate();
  if (raw instanceof Date) return raw;
  return new Date(raw);
};

const getAvailableReward = () => {
  const last = getLastClaim();
  if (!last) return REWARD_PER_DAY;
  return Math.floor((Date.now() - last.getTime()) / MS_PER_DAY) * REWARD_PER_DAY;
};

const getMsUntilNext = () => {
  const last = getLastClaim();
  if (!last) return 0;
  const elapsed = Date.now() - last.getTime();
  return MS_PER_DAY - (elapsed % MS_PER_DAY);
};

const fmtCountdown = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return [Math.floor(s/3600), Math.floor((s%3600)/60), s%60]
    .map(v => String(v).padStart(2,"0")).join(":");
};

const dailyContainer = () => document.querySelector(".daily-reward");

const renderClaimable = (amount) => {
  const c = dailyContainer();
  if (!c) return;
  c.innerHTML = `
    <span class="credits-label">
      🎉 Daily Rewards <b id="daily-reward-amount" class="credits-val">${amount}</b>
    </span>
    <button id="btn-claim-reward" class="btn btn-claim-reward">🎁 Claim</button>`;
  c.querySelector("#btn-claim-reward").addEventListener("click", claimReward);
};

const renderCountdown = () => {
  stopCountdown();
  const c = dailyContainer();
  if (!c) return;
  c.innerHTML = `
    <span class="credits-label daily-waiting">
      Free +100 credits in <b id="daily-countdown" class="credits-val countdown-val"></b>
    </span>`;
  const tick = () => {
    const msLeft = getMsUntilNext();
    const el = document.getElementById("daily-countdown");
    if (el) el.textContent = fmtCountdown(msLeft);
    if (msLeft <= 1000) { stopCountdown(); DailyReward.updateUI(); }
  };
  tick();
  _countdownInterval = setInterval(tick, 1000);
};

const stopCountdown = () => {
  if (_countdownInterval !== null) {
    clearInterval(_countdownInterval);
    _countdownInterval = null;
  }
};

const claimReward = async () => {
  const amount = getAvailableReward();
  if (amount <= 0) return;
  const btn = document.getElementById("btn-claim-reward");
  if (btn) btn.disabled = true;
  await CreditsModule.add(amount);
  const now = new Date();
  State.userData.lastClaimAt = now;
  await updateDoc(DB.userRef(State.user.uid), { lastClaimAt: now });
  renderCountdown();
};

export const DailyReward = {
  updateUI() {
    const amount = getAvailableReward();
    if (amount > 0) { stopCountdown(); renderClaimable(amount); }
    else            { renderCountdown(); }
  },
  stopCountdown,
};

// ── Sound Module ─────────────────────────────────────

let _audioCtx;
const getAudioCtx = () => {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return _audioCtx;
};
const playTone = (freq = 800, duration = 0.05, type = "square", volume = 0.05) => {
  const ctx  = getAudioCtx();
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type; osc.frequency.value = freq; gain.gain.value = volume;
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  osc.stop(ctx.currentTime + duration);
};

export const Sound = {
  tick: () => playTone(900,  0.03),
  win:  () => playTone(1200, 0.15),
  bomb: () => playTone(120,  0.25, "sawtooth", 0.08),
};

// ── Spin Module ──────────────────────────────────────

export const SpinModule = {
  _setSpinning(v) {
    State.isSpinning        = v;
    $("btn-spin").disabled  = v;
  },

  _showResult(fruit) {
    const resultEl = $("result-text");
    if (fruit.emoji === "💣") {
      resultEl.textContent = "💥 BOOM! Fruit Bomb! You got nothing.";
      resultEl.style.color = "#ff4444";
    } else {
      resultEl.textContent = `You got ${fruit.emoji} = ${formatCurrency(fruit.value)}`;
      resultEl.style.color = "";
    }
    showEl($("result-display"));
  },

  async _animate(borders) {
    const ticks        = Math.floor(GAME_CONFIG.SPIN_DURATION_MS / GAME_CONFIG.TICK_MS);
    const winningFruit = getWeightedFruit();

    const matchingIndices = borders.filter(idx =>
      GridModule.getFruitAt(idx).emoji === winningFruit.emoji
    );
    const winnerIdx = matchingIndices[Math.floor(Math.random() * matchingIndices.length)];

    for (let t = 0; t < ticks; t++) {
      GridModule.setLit(borders[t % borders.length]);
      Sound.tick();
      await sleep(GAME_CONFIG.TICK_MS);
    }

    GridModule.setWinner(winnerIdx);
    if (winningFruit.emoji === "💣") Sound.bomb();
    else Sound.win();

    return winningFruit;
  },

  async spin() {
    if (State.isSpinning) return;
    this._setSpinning(true);

    if (State.userData.credits < GAME_CONFIG.SPIN_COST) {
      CreditsModule.flashInsufficient();
      $("result-text").textContent = "⚠️ Not enough credits!";
      $("result-text").style.color = "";
      showEl($("result-display"));
      this._setSpinning(false);
      return;
    }

    hideEl($("result-display"));
    await CreditsModule.deduct(GAME_CONFIG.SPIN_COST);

    const fruit = await this._animate(GridModule.getBorderIndices());
    this._showResult(fruit);

    if (fruit.value > 0) await CreditsModule.add(fruit.value);

    DB.logHistory(State.user.uid, fruit.emoji, fruit.value).catch(() => {});
    HistoryModule.prepend({ result: fruit.emoji, reward: fruit.value, createdAt: null });

    // Lazy import to avoid circular dep at module init time
    const { LeaderboardModule } = await import("./leaderboard.js");
    LeaderboardModule.refreshCurrentUser();

    this._setSpinning(false);
  },
};