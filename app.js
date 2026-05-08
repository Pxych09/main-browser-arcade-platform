// ═══════════════════════════════════════════════════
// app.js — Entry point: Auth + Event bindings only
//
// Import map (load order matters for ES modules):
//   config.js  → utils.js  → state.js
//   db.js      → fruit-game.js → pop-match.js
//   leaderboard.js, nickname.js
// ═══════════════════════════════════════════════════

import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import { auth }                                         from "./db.js";
import { DB }                                           from "./db.js";
import { $, cls, showEl, hideEl }                       from "./utils.js";
import { State, Router }                                from "./state.js";
import { CreditsModule, GridModule,
         HistoryModule, DailyReward, SpinModule }       from "./fruit-game.js";
import { ShopModule, PopMatchGame }                     from "./pop-match.js";
import { LeaderboardModule }                            from "./leaderboard.js";
import { NicknameModule }                               from "./nickname.js";
import { Lucky777Game } from "./lucky777.js";

// ── Single game instance ───────────────────────────
const popMatch = new PopMatchGame();
const lucky777 = new Lucky777Game();
const provider = new GoogleAuthProvider();

// ── Auth helpers ───────────────────────────────────
const signIn  = () => signInWithPopup(auth, provider);
const signOut_ = () => signOut(auth);

// ── Session handlers ───────────────────────────────

const onUserSignedIn = async (user) => {
  State.user     = user;
  State.userData = await DB.ensureUser(user.uid, user.email);

  $("hdr-email").textContent  = user.email;
  $("game-email").textContent = user.email;

  const avatar = $("hdr-avatar");
  if (user.photoURL) {
    avatar.src           = user.photoURL;
    avatar.style.display = "block";
  } else {
    avatar.style.display = "none";
  }

  CreditsModule.setDisplay(State.userData.credits);
  NicknameModule.init(State.userData.nickname || "");
  GridModule.render();
  Router.goto("screen-dashboard");
  DailyReward.updateUI();
  LeaderboardModule.load(); // pre-warm leaderboard
};

const onUserSignedOut = () => {
  DailyReward.stopCountdown();
  State.user     = null;
  State.userData = null;
  Router.goto("screen-auth");
};

// ── Event bindings ─────────────────────────────────

const bindEvents = () => {

  // ── Auth ──────────────────────────────────────────
  $("btn-google-signin").addEventListener("click", async () => {
    const btn   = $("btn-google-signin");
    const errEl = $("auth-error");
    btn.disabled = true;
    hideEl(errEl);
    try {
      await signIn();
    } catch (err) {
      errEl.textContent = `Sign-in failed: ${err.message}`;
      showEl(errEl);
      btn.disabled = false;
    }
  });

  const logout = () => { DailyReward.stopCountdown(); signOut_(); };
  $("btn-logout").addEventListener("click",  logout);
  $("btn-logout2").addEventListener("click", logout);

  // ── Hamburger menu ────────────────────────────────
  const menuBtn  = $("game-menu-btn");
  const menuDrop = $("game-menu-dropdown");
  if (menuBtn && menuDrop) {
    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      cls.toggle(menuDrop, "hidden");
    });
    document.addEventListener("click", () => cls.add(menuDrop, "hidden"));
  }

  // ── Navigation ────────────────────────────────────
  const enterFruitGame = () => {
    Router.goto("screen-game");
    HistoryModule.load(State.user.uid);
    LeaderboardModule.load();
    DailyReward.updateUI();
  };

  $("btn-play-fruit").addEventListener("click", enterFruitGame);

  $("btn-play-match").addEventListener("click", () => {
    Router.goto("screen-match");
    popMatch.mount();
    $("match-nickname-display").textContent =
      State.userData?.nickname || State.user?.email?.split("@")[0] || "";
    $("match-credits").textContent = Math.floor(State.userData?.credits ?? 0);
  });

  $("btn-back-match").addEventListener("click", () => {
    popMatch.unmount();
    Router.goto("screen-dashboard");
  });

  $("btn-back").addEventListener("click", () => Router.goto("screen-dashboard"));

  // ── Fruit game spin ───────────────────────────────
  $("btn-spin").addEventListener("click", () => SpinModule.spin());

  // ── Lucky 777 game spin ───────────────────────────────

  $("btn-play-lucky777").addEventListener("click", () => {
    Router.goto("screen-lucky777");
    lucky777.mount();
  $("l7-nickname-display").textContent =
      State.userData?.nickname || State.user?.email?.split("@")[0] || "";
    $("l7-credits").textContent = Math.floor(State.userData?.credits ?? 0);
  });
  
  $("btn-back-lucky777").addEventListener("click", () => {
    lucky777.unmount();
    Router.goto("screen-dashboard");
  });

  // ── Leaderboard tabs ──────────────────────────────
  LeaderboardModule.bindTabs();

  // ── Shop ──────────────────────────────────────────
  $("pm-shop-btn")?.addEventListener("click",       () => ShopModule.open());
  $("pm-shop-close")?.addEventListener("click",     () => ShopModule.close());
  $("pm-shop-tab-color")?.addEventListener("click", () => ShopModule.switchShopTab("color"));
  $("pm-shop-tab-emoji")?.addEventListener("click", () => ShopModule.switchShopTab("emoji"));
};

// ── Init ───────────────────────────────────────────

const init = () => {
  bindEvents();
  onAuthStateChanged(auth, (user) => {
    if (user) onUserSignedIn(user);
    else      onUserSignedOut();
  });
};

init();