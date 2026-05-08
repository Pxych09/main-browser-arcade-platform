// ═══════════════════════════════════════════════════
// leaderboard.js — Dashboard + sidebar leaderboard
// ═══════════════════════════════════════════════════

import { collection, query, orderBy, limit, getDocs }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { db, DB }  from "./db.js";
import { $, cls }  from "./utils.js";
import { State }   from "./state.js";

const MEDALS = ["🥇", "🥈", "🥉"];
let _activeTab = "credits"; // "credits" | "popmatch"

// ── Data fetching ──────────────────────────────────

const fetchCredits = () => DB.getLeaderboard(20);

const fetchPopMatch = async () => {
  const q = query(
    collection(db, "users"),
    orderBy("popMatchHighScore", "desc"),
    limit(20)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ uid: d.id, ...d.data() }))
    .filter(d => (d.popMatchHighScore ?? 0) > 0);
};

// ── Row builders ───────────────────────────────────

const buildCreditsRow = (entry, rank, currentUid) => {
  const isMe    = entry.uid === currentUid;
  const medal   = MEDALS[rank] ?? null;
  const name    = entry.nickname?.trim() || entry.email?.split("@")[0] || "Player";
  const credits = Math.floor(entry.credits ?? 0);
  const el      = document.createElement("div");
  el.className  = "lb-row" + (isMe ? " lb-row-me" : "");
  el.innerHTML  = `
    <span class="lb-rank">${medal ?? "#" + (rank + 1)}</span>
    <span class="lb-name" title="${entry.email ?? ""}">${name}${isMe ? " <span class='lb-you'>YOU</span>" : ""}</span>
    <span class="lb-credits">${credits.toLocaleString()}</span>`;
  return el;
};

const buildPopMatchRow = (entry, rank, currentUid) => {
  const isMe  = entry.uid === currentUid;
  const medal = MEDALS[rank] ?? null;
  const name  = entry.nickname?.trim() || entry.email?.split("@")[0] || "Player";
  const score = Math.floor(entry.popMatchHighScore ?? 0);
  const el    = document.createElement("div");
  el.className = "lb-row" + (isMe ? " lb-row-me" : "");
  el.innerHTML = `
    <span class="lb-rank">${medal ?? "#" + (rank + 1)}</span>
    <span class="lb-name" title="${entry.email ?? ""}">${name}${isMe ? " <span class='lb-you'>YOU</span>" : ""}</span>
    <span class="lb-credits">${score.toLocaleString()} <span class="lb-pts">pts</span></span>`;
  return el;
};

// ── Core render ────────────────────────────────────

const renderInto = (listEl, entries, tab, currentUid) => {
  listEl.innerHTML = "";
  if (entries.length === 0) {
    listEl.innerHTML = `<div class="lb-empty">${
      tab === "popmatch" ? "No scores yet." : "No players yet."
    }</div>`;
    return;
  }
  entries.forEach((entry, i) => {
    listEl.appendChild(
      tab === "popmatch"
        ? buildPopMatchRow(entry, i, currentUid)
        : buildCreditsRow(entry, i, currentUid)
    );
  });
};

const renderAll = (entries, tab) => {
  const uid   = State.user?.uid;
  const lists = [$("dash-leaderboard-list"), $("leaderboard-list")].filter(Boolean);
  lists.forEach(el => renderInto(el, entries, tab, uid));
};

// ── Core load (standalone so switchTab can call it) ──

const load = async (tab = _activeTab) => {
  [$("dash-leaderboard-list"), $("leaderboard-list")]
    .filter(Boolean)
    .forEach(el => el.innerHTML = `<div class="lb-loading">Loading…</div>`);

  const countEl = $("dash-lb-user-count");

  try {
    const entries = tab === "popmatch"
      ? await fetchPopMatch()
      : await fetchCredits();

    if (countEl) countEl.textContent =
      `${entries.length} player${entries.length !== 1 ? "s" : ""}`;

    renderAll(entries, tab);
  } catch (err) {
    console.error("Leaderboard load failed:", err);
    [$("dash-leaderboard-list"), $("leaderboard-list")]
      .filter(Boolean)
      .forEach(el => el.innerHTML = `<div class="lb-empty">Could not load.</div>`);
  }
};

// ── Tab switcher ───────────────────────────────────

const switchTab = async (tab) => {
  _activeTab = tab;
  ["credits", "popmatch"].forEach(t => {
    $(`lb-tab-${t}`)?.classList.toggle("lb-tab-active", t === tab);
  });
  await load(tab);
};

// ── Public ────────────────────────────────────────

export const LeaderboardModule = {
  load,
  refreshCurrentUser() { load(); },
  bindTabs() {
    $("lb-tab-credits")?.addEventListener("click",  () => switchTab("credits"));
    $("lb-tab-popmatch")?.addEventListener("click", () => switchTab("popmatch"));
  },
};