// ═══════════════════════════════════════════════════
// pop-match.js — Shop Module + Pop Match Game
// ═══════════════════════════════════════════════════

import { updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { PM_PRESETS, POP_MATCH_CONFIG } from "./config.js";
import { $, cls, animateBump }          from "./utils.js";
import { State, Toast }                 from "./state.js";
import { DB }                           from "./db.js";
import { CreditsModule }                from "./fruit-game.js";

// ═══════════════════════════════════════════════════
// SHOP MODULE
// ═══════════════════════════════════════════════════

let _inventory = {
  ownedPresets: ["default", "classic"],
  activeColor:  "default",
  activeEmoji:  "classic",
};
let _previewId   = null;
let _previewType = null;

// ── Inventory helpers ────────────────────────────────

const applyColorPreset = ({ cardBorder, matched, glow }) => {
  const board = $("pm-board");
  if (!board) return;
  board.style.setProperty("--pm-card-border",    cardBorder);
  board.style.setProperty("--pm-matched-bg",     matched);
  board.style.setProperty("--pm-matched-border", matched);
  board.style.setProperty("--pm-card-glow",      glow);
};

const applyActive = () => {
  const colorPreset = PM_PRESETS.colors.find(c => c.id === _inventory.activeColor)
    ?? PM_PRESETS.colors[0];
  applyColorPreset(colorPreset.preview);
};

const getActiveSymbols = () => {
  const pack = PM_PRESETS.emojis.find(e => e.id === _inventory.activeEmoji)
    ?? PM_PRESETS.emojis[0];
  return pack.symbols;
};

// ── Preview ──────────────────────────────────────────

const clearPreview = () => {
  _previewId   = null;
  _previewType = null;
  applyActive();
};

const togglePreview = (type, presetId) => {
  const alreadyPreviewing = _previewId === presetId && _previewType === type;
  if (alreadyPreviewing) {
    clearPreview();
  } else {
    _previewId   = presetId;
    _previewType = type;
    if (type === "color") {
      const p = PM_PRESETS.colors.find(c => c.id === presetId);
      if (p) applyColorPreset(p.preview);
    }
  }
  ShopModule.renderShopUI();
};

// ── Confirm dialog ────────────────────────────────────

const showConfirm = (preset) => new Promise((resolve) => {
  const overlay = $("pm-confirm-overlay");
  const titleEl = $("pm-confirm-title");
  const bodyEl  = $("pm-confirm-body");
  const yesBtn  = $("pm-confirm-yes");
  const noBtn   = $("pm-confirm-no");

  titleEl.textContent = `Purchase "${preset.name}"?`;
  bodyEl.innerHTML    = `You are about to buy <strong>${preset.name}</strong> for
    <strong>${preset.price} credits</strong>.<br><br>Are you sure?`;

  cls.remove(overlay, "hidden");

  const finish = (result) => {
    cls.add(overlay, "hidden");
    yesBtn.removeEventListener("click", onYes);
    noBtn.removeEventListener("click",  onNo);
    overlay.removeEventListener("click", onOverlay);
    resolve(result);
  };

  const onYes     = () => finish(true);
  const onNo      = () => finish(false);
  const onOverlay = (e) => { if (e.target === overlay) finish(false); };

  yesBtn.addEventListener("click",  onYes);
  noBtn.addEventListener("click",   onNo);
  overlay.addEventListener("click", onOverlay);
});

// ── Purchase / equip ──────────────────────────────────

const purchase = async (type, presetId) => {
  const list   = type === "color" ? PM_PRESETS.colors : PM_PRESETS.emojis;
  const preset = list.find(p => p.id === presetId);
  if (!preset) return;

  if (_inventory.ownedPresets.includes(presetId)) {
    await equipPreset(type, presetId);
    return;
  }

  if (State.userData.credits < preset.price) {
    Toast.show("Not enough credits!", "error");
    return;
  }

  const confirmed = await showConfirm(preset);
  if (!confirmed) { Toast.show("Purchase cancelled.", ""); return; }

  await CreditsModule.deduct(preset.price);
  _inventory.ownedPresets.push(presetId);
  await DB.saveInventory(State.user.uid, _inventory);
  await equipPreset(type, presetId);
  Toast.show(`✅ ${preset.name} purchased & equipped!`, "success");
};

const equipPreset = async (type, presetId) => {
  if (type === "color") _inventory.activeColor = presetId;
  else                  _inventory.activeEmoji = presetId;
  clearPreview();
  await DB.saveInventory(State.user.uid, _inventory);
  applyActive();
  ShopModule.renderShopUI();
  ShopModule.renderEquippedTheme();
  Toast.show("✅ Equipped!", "success");
};

// ── Render ────────────────────────────────────────────

const renderSection = (type) => {
  const container = $(`pm-shop-${type}-grid`);
  if (!container) return;
  container.innerHTML = "";

  const list     = type === "color" ? PM_PRESETS.colors : PM_PRESETS.emojis;
  const activeId = type === "color" ? _inventory.activeColor : _inventory.activeEmoji;

  list.forEach(preset => {
    const owned    = _inventory.ownedPresets.includes(preset.id);
    const isActive = preset.id === activeId;
    const isPrev   = preset.id === _previewId && type === _previewType;

    const card = document.createElement("div");
    card.className = [
      "pm-shop-card",
      isActive ? "pm-shop-card-active"  : "",
      isPrev   ? "pm-shop-card-preview" : "",
    ].filter(Boolean).join(" ");

    const visual = type === "color"
      ? `<div class="pm-shop-swatch" style="
            border-color:${preset.preview.cardBorder};
            box-shadow: 0 0 10px ${preset.preview.glow};">
           <div class="pm-shop-swatch-inner" style="background:${preset.preview.matched}"></div>
         </div>`
      : `<div class="pm-shop-emoji-preview">
           ${preset.symbols.slice(0, 6).map(s => `<span>${s}</span>`).join("")}
         </div>`;

    let badge = "";
    if (isActive)       badge = `<span class="pm-shop-badge equipped">✓ EQUIPPED</span>`;
    else if (isPrev)    badge = `<span class="pm-shop-badge previewing">👁 PREVIEWING</span>`;
    else if (owned)     badge = `<span class="pm-shop-badge owned">OWNED</span>`;
    else if (preset.free) badge = `<span class="pm-shop-badge free">FREE</span>`;
    else                badge = `<span class="pm-shop-badge price" style="display:none">${preset.price} cr</span>`;

    let actionBtn = "";
    if (!isActive) {
      if (owned || preset.free) {
        actionBtn = `<button class="pm-shop-action-btn pm-shop-equip-btn" data-id="${preset.id}" data-type="${type}">Equip</button>`;
      } else {
        actionBtn = `<button class="pm-shop-action-btn pm-shop-buy-btn" data-id="${preset.id}" data-type="${type}">🛒 Buy · ${preset.price} cr</button>`;
      }
    }

    card.innerHTML = `
      ${visual}
      <div class="pm-shop-card-info">
        <span class="pm-shop-card-name">${preset.name}</span>
        <span class="pm-shop-card-desc">${preset.desc}</span>
        ${badge}
        ${actionBtn}
      </div>`;

    card.addEventListener("click", (e) => {
      if (e.target.closest(".pm-shop-action-btn")) return;
      if (!isActive) togglePreview(type, preset.id);
    });

    card.querySelector(".pm-shop-action-btn")
      ?.addEventListener("click", (e) => { e.stopPropagation(); purchase(type, preset.id); });

    container.appendChild(card);
  });
};

// ── Public: ShopModule ───────────────────────────────

export const ShopModule = {
  async init() {
    if (!State.user) return;
    _inventory = await DB.getInventory(State.user.uid);
    if (!_inventory.ownedPresets.includes("default"))
      _inventory.ownedPresets.push("default");
    if (!_inventory.ownedPresets.includes("classic"))
      _inventory.ownedPresets.push("classic");
    applyActive();
  },

  applyActive,
  getActiveSymbols,

  renderShopUI() {
    renderSection("color");
    renderSection("emoji");
  },

  renderEquippedTheme() {
    const row = $("pm-ci-equipped-row");
    if (!row) return;
    const colorPreset = PM_PRESETS.colors.find(c => c.id === _inventory.activeColor) ?? PM_PRESETS.colors[0];
    const emojiPreset = PM_PRESETS.emojis.find(e => e.id === _inventory.activeEmoji) ?? PM_PRESETS.emojis[0];
    row.innerHTML = `
      <span class="pm-ci-equipped-label text-active">Currently Equipped: </span>
      <span class="pm-ci-theme-pill">
        <span class="pm-ci-theme-swatch" style="background:${colorPreset.preview.matched}"></span>
        ${colorPreset.name}
      </span>
      <span class="pm-ci-theme-pill">
        ${emojiPreset.symbols[0]}
        ${emojiPreset.name}
      </span>`;
  },

  switchShopTab(tab) {
    clearPreview();
    ["color", "emoji"].forEach(t => {
      $(`pm-shop-tab-${t}`)?.classList.toggle("pm-shop-tab-active", t === tab);
      $(`pm-shop-section-${t}`)?.classList.toggle("hidden",         t !== tab);
    });
  },

  open() {
    this.init().then(() => {
      this.renderShopUI();
      const panel = $("pm-shop-panel");
      if (panel) {
        cls.remove(panel, "hidden");
        panel.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      this.switchShopTab("color");
    });
  },

  close() {
    clearPreview();
    cls.add($("pm-shop-panel"), "hidden");
  },
};

// ═══════════════════════════════════════════════════
// POP MATCH GAME
// ═══════════════════════════════════════════════════

export class PopMatchGame {
  constructor() {
    this.board       = $("pm-board");
    this.timerEl     = $("pm-timer");
    this.scoreEl     = $("pm-score");
    this.highScoreEl = $("pm-highScore");
    this.comboEl     = $("pm-combo");
    this.messageEl   = $("pm-message");
    this.stageEl     = $("pm-stageNum");
    this.mainBtn     = $("pm-mainBtn");

    this.symbols      = ShopModule.getActiveSymbols();
    this.audioCtx     = new (window.AudioContext || window.webkitAudioContext)();
    this.currentStage = 1;
    this.maxStages    = 5;
    this.isProcessing = false;

    this.state = {
      firstCard: null, secondCard: null,
      lockBoard: false,
      score: 0, combo: 0, matches: 0,
      timer: 60, interval: null, running: false,
    };
  }

  async mount() {
    await ShopModule.init();
    this.symbols = ShopModule.getActiveSymbols();
    ShopModule.applyActive();
    ShopModule.renderEquippedTheme();
    this.resetFullGame();
    this.createBoard();
    this.bindEvents();
    this.loadHighScore();
    this.updateButtonState();
  }

  unmount() {
    clearInterval(this.state.interval);
    this.state.running = false;
    this.mainBtn.replaceWith(this.mainBtn.cloneNode(true));
    this.mainBtn = $("pm-mainBtn");
  }

  bindEvents() {
    this.mainBtn.addEventListener("click", () => {
      if (!this.state.running && !this.isProcessing) this.startNewGame();
    });
  }

  getStageConfig(stage) {
    return {
      pairs: 4 + (stage - 1) * 2,
      time:  Math.max(35, 68 - stage * 5),
      cols:  stage >= 4 ? 5 : 4,
    };
  }

  shuffle(array) { return array.sort(() => Math.random() - 0.5); }

  createBoard() {
    this.board.innerHTML = "";
    const config = this.getStageConfig(this.currentStage);
    this.board.style.gridTemplateColumns = `repeat(${config.cols}, 1fr)`;

    const selected = this.symbols.slice(0, config.pairs);
    this.shuffle([...selected, ...selected]).forEach(symbol => {
      const card = document.createElement("div");
      card.className      = "pm-card";
      card.dataset.symbol = symbol;
      card.textContent    = "?";
      card.addEventListener("click", () => this.onCardClick(card));
      this.board.appendChild(card);
    });
  }

  onCardClick(card) {
    if (!this.state.running || this.state.lockBoard || this.isProcessing ||
        card.classList.contains("matched") || card === this.state.firstCard) return;
    this.playSound("flip");
    this.revealCard(card);
    if (!this.state.firstCard) { this.state.firstCard = card; return; }
    this.state.secondCard = card;
    this.validateMatch();
  }

  revealCard(card) { card.textContent = card.dataset.symbol; card.classList.add("revealed"); }
  hideCard(card)   { if (card) { card.textContent = "?"; card.classList.remove("revealed"); } }

  validateMatch() {
    this.isProcessing    = true;
    this.state.lockBoard = true;
    const isMatch = this.state.firstCard.dataset.symbol === this.state.secondCard.dataset.symbol;
    isMatch ? this.handleMatch() : this.handleMismatch();
  }

  handleMatch() {
    this.state.matches++;
    this.state.combo++;
    const points = this.state.combo * 12;
    this.state.score += points;
    this.updateUI();
    this.playSound("match");
    this.state.firstCard.classList.add("matched");
    this.state.secondCard.classList.add("matched");
    Toast.show(`+${points}`, "success");
    this.resetTurn();
    const config = this.getStageConfig(this.currentStage);
    if (this.state.matches === config.pairs) this.completeStage();
    else this.isProcessing = false;
  }

  handleMismatch() {
    this.state.combo = 0; // reset combo on miss
    this.updateUI();
    this.playSound("miss");
    Toast.show("MISS!");
    setTimeout(() => {
      this.hideCard(this.state.firstCard);
      this.hideCard(this.state.secondCard);
      this.resetTurn();
      this.isProcessing = false;
    }, 680);
  }

  resetTurn() {
    this.state.firstCard  = null;
    this.state.secondCard = null;
    this.state.lockBoard  = false;
  }

  async completeStage() {
    this.state.running = false;
    this.isProcessing  = true;
    this.updateButtonState();

    const bonus = this.currentStage * 150;
    this.state.score += bonus;
    this.updateUI();
    this.playSound("win");

    await this._awardStageCredits(this.currentStage);
    Toast.show(`STAGE ${this.currentStage} CLEAR! +${bonus} pts`, "success");

    setTimeout(() => {
      if (this.currentStage < this.maxStages) {
        this.currentStage++;
        this.startNextStage();
      } else {
        this.endGame(true);
      }
    }, 1600);
  }

  async _awardStageCredits(stage) {
    if (!State.user || !State.userData) return;
    const baseReward = POP_MATCH_CONFIG.STAGE_REWARDS[stage] ?? 0;
    if (baseReward <= 0) return;

    const dailyRuns   = await DB.getPopMatchDailyRuns(State.user.uid);
    const multipliers = POP_MATCH_CONFIG.RUN_MULTIPLIERS;
    const multiplier  = multipliers[Math.min(dailyRuns, multipliers.length - 1)];
    const actual      = Math.max(1, Math.round(baseReward * multiplier));

    await CreditsModule.add(actual);
    if (stage === this.maxStages) await DB.incrementPopMatchDailyRuns(State.user.uid);

    const runLabel = ["1st", "2nd", "3rd"];
    const label    = dailyRuns < 3 ? runLabel[dailyRuns] : `${dailyRuns + 1}th`;
    const note     = multiplier < 1
      ? ` (${label} run today · ${Math.round(multiplier * 100)}% rewards)`
      : ` (1st run today · full rewards!)`;

    setTimeout(() => Toast.show(`+${actual} credits${note}`, "success"), 200);
  }

  startNewGame()  { this.resetFullGame(); this.startNextStage(); }

  resetFullGame() {
    clearInterval(this.state.interval);
    this.currentStage = 1;
    this.stageEl.textContent = "1";
    const initConfig = this.getStageConfig(1);
    Object.assign(this.state, {
      score: 0, combo: 0, matches: 0,
      running: false, timer: initConfig.time,
    });
    this.isProcessing = false;
    this.updateUI();
  }

  startNextStage() {
    const config = this.getStageConfig(this.currentStage);
    Object.assign(this.state, { timer: config.time, matches: 0, combo: 0 });
    this.stageEl.textContent = this.currentStage;
    this.updateUI();
    this.createBoard();
    this.state.running = true;
    this.isProcessing  = false;
    this.updateButtonState();
    this.startTimer();
  }

  startTimer() {
    clearInterval(this.state.interval);
    this.state.interval = setInterval(() => {
      if (!this.state.running) return;
      this.state.timer--;
      if (this.state.timer <= 0) {
        this.state.timer = 0;
        this.updateUI();
        this.endGame(false);
        return;
      }
      this.updateUI();
    }, 1000);
  }

  endGame(win) {
    clearInterval(this.state.interval);
    this.state.running = false;
    this.isProcessing  = false;
    this.updateButtonState();
    this.saveHighScore();

    if (win) {
      Toast.show("GAME COMPLETE! LEGEND! 🎉", "success");
      this.playSound("win");
    } else {
      Toast.show("TIME'S UP! No credits for incomplete stages.", "error");
      this.playSound("lose");
    }
  }

  updateUI() {
    this.scoreEl.textContent = this.state.score;
    this.comboEl.textContent = `x${this.state.combo}`;
    this.timerEl.textContent = this.state.timer;
  }

  updateButtonState() {
    const fresh = this.currentStage === 1 && this.state.score === 0;
    this.mainBtn.textContent = this.state.running
      ? "GAME IN PROGRESS"
      : (fresh ? "START GAME" : "PLAY AGAIN");
    this.mainBtn.disabled = this.state.running;
  }

  saveHighScore() {
    const current = Number(localStorage.getItem("pop-highscore")) || 0;
    if (this.state.score > current) {
      localStorage.setItem("pop-highscore", this.state.score);
      this.loadHighScore();
      if (State.user) {
        updateDoc(DB.userRef(State.user.uid), {
          popMatchHighScore: this.state.score,
        }).catch(err => console.warn("High score save failed:", err));
      }
    }
  }

  loadHighScore() {
    const stored = State.userData?.popMatchHighScore
      || Number(localStorage.getItem("pop-highscore"))
      || 0;
    const local  = Number(localStorage.getItem("pop-highscore")) || 0;
    if (stored > local) localStorage.setItem("pop-highscore", stored);
    this.highScoreEl.textContent = Math.max(stored, local);
  }

  playSound(type) {
    try {
      const ctx  = this.audioCtx;
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      switch (type) {
        case "flip":
          osc.type = "sawtooth"; osc.frequency.value = 900; gain.gain.value = 0.12;
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
          osc.start(); osc.stop(ctx.currentTime + 0.15); break;
        case "match":
          osc.type = "sine";
          osc.frequency.setValueAtTime(1100, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.35);
          gain.gain.value = 0.3;
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
          osc.start(); osc.stop(ctx.currentTime + 0.4); break;
        case "miss":
          osc.type = "square"; osc.frequency.value = 420; gain.gain.value = 0.2;
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
          osc.start(); osc.stop(ctx.currentTime + 0.45); break;
        case "win":
          [1200,1500,1800,2200].forEach((f,i) => setTimeout(() => {
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.type = "sine"; o.frequency.value = f; g.gain.value = 0.25;
            o.connect(g); g.connect(ctx.destination); o.start();
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
            o.stop(ctx.currentTime + 0.6);
          }, i * 70)); break;
        case "lose":
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(650, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.9);
          gain.gain.value = 0.25;
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
          osc.start(); osc.stop(ctx.currentTime + 0.9); break;
      }
    } catch(e) {}
  }
}