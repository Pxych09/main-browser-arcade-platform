// ═══════════════════════════════════════════════════
// state.js — Shared application state + Toast
// ═══════════════════════════════════════════════════

import { $, cls } from "./utils.js";

// ── Global app state ─────────────────────────────────
// All modules read/write this single object.
// Never import State into config.js or utils.js (no circular deps).

export const State = {
  user:       null,  // Firebase Auth user
  userData:   null,  // Firestore user document data
  isSpinning: false, // spin lock for fruit game
};

// ── Toast ─────────────────────────────────────────────

export const Toast = (() => {
  let _timer = null;

  const show = (text, type = "", duration = 2500) => {
    const el = $("pm-toast");
    if (!el) return;

    clearTimeout(_timer);
    el.className   = "pm-toast";
    el.textContent = text;
    if (type) cls.add(el, type);
    cls.remove(el, "hidden");

    void el.offsetWidth; // force reflow to restart animation

    _timer = setTimeout(() => {
      cls.add(el, "hiding");
      el.addEventListener("animationend", () => {
        cls.add(el, "hidden");
        cls.remove(el, "hiding");
      }, { once: true });
    }, duration);
  };

  return { show };
})();

// ── Screen Router ─────────────────────────────────────

export const Router = {
  SCREENS: ["screen-splash","screen-auth","screen-dashboard",
          "screen-game","screen-match","screen-lucky777"],

  goto(id) {
    const splash = $("screen-splash");

    const doSwitch = () => {
      this.SCREENS.forEach((s) => cls.toggle($(s), "active", s === id));
    };

    if (splash && cls.has(splash, "active") && id !== "screen-splash") {
      cls.add(splash, "fade-out");
      splash.addEventListener("animationend", () => {
        cls.remove(splash, "active", "fade-out");
        doSwitch();
      }, { once: true });
    } else {
      doSwitch();
    }
  },
};