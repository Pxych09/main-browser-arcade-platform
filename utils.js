// ═══════════════════════════════════════════════════
// utils.js — Shared utility helpers
// ═══════════════════════════════════════════════════

import { FRUITS, TOTAL_WEIGHT } from "./config.js";

/** Get element by ID */
export const $ = (id) => document.getElementById(id);

/** Class list helpers */
export const cls = {
  add:    (el, ...c) => el?.classList.add(...c),
  remove: (el, ...c) => el?.classList.remove(...c),
  toggle: (el, c, v) => el?.classList.toggle(c, v),
  has:    (el, c)    => el?.classList.contains(c) ?? false,
};

export const showEl = (el) => cls.remove(el, "hidden");
export const hideEl = (el) => cls.add(el, "hidden");
export const sleep  = (ms) => new Promise((r) => setTimeout(r, ms));

export const formatCurrency = (val)  => `₱${Number(val).toFixed(2)}`;
export const formatTime     = (date) =>
  date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export const animateBump = (el, cssClass, duration = 500) => {
  cls.add(el, cssClass);
  setTimeout(() => cls.remove(el, cssClass), duration);
};

export const getWeightedFruit = () => {
  let random = Math.random() * TOTAL_WEIGHT;
  for (const fruit of FRUITS) {
    random -= fruit.weight;
    if (random <= 0) return fruit;
  }
  return FRUITS[FRUITS.length - 1];
};

// ── Grid utilities (pure — no DOM) ───────────────────

import { GAME_CONFIG } from "./config.js";

export const GridUtils = (() => {
  const SIZE  = GAME_CONFIG.GRID_SIZE;
  const TOTAL = SIZE * SIZE;

  const borderIndices = () => {
    const out = [];
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        if (r === 0 || r === SIZE - 1 || c === 0 || c === SIZE - 1)
          out.push(r * SIZE + c);
    return out;
  };

  const isBorder = (idx) => {
    const r = Math.floor(idx / SIZE);
    const c = idx % SIZE;
    return r === 0 || r === SIZE - 1 || c === 0 || c === SIZE - 1;
  };

  return { borderIndices, isBorder, SIZE, TOTAL };
})();