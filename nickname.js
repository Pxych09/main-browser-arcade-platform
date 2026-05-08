// ═══════════════════════════════════════════════════
// nickname.js — Nickname editor (dashboard + game bar)
// ═══════════════════════════════════════════════════

import { $, cls, animateBump } from "./utils.js";
import { State }               from "./state.js";
import { DB }                  from "./db.js";

const INSTANCES = [
  {
    display: "dash-nickname-display",
    editBtn: "dash-nickname-edit-btn",
    input:   "dash-nickname-input",
    saveBtn: "dash-nickname-save-btn",
  },
  {
    display: "game-nickname-display",
    editBtn: "game-nickname-edit-btn",
    input:   "game-nickname-input",
    saveBtn: "game-nickname-save-btn",
  },
];

const renderAll = (nickname) => {
  INSTANCES.forEach(({ display }) => {
    const el = $(display);
    if (!el) return;
    if (nickname) {
      el.textContent = nickname;
      cls.remove(el, "empty");
    } else {
      el.textContent = "Set your nickname…";
      cls.add(el, "empty");
    }
  });
};

const openEdit = ({ display, editBtn, input, saveBtn }) => {
  const inputEl = $(input);
  inputEl.value = State.userData?.nickname || "";
  cls.add($(display),  "hidden");
  cls.add($(editBtn),  "hidden");
  cls.remove(inputEl,     "hidden");
  cls.remove($(saveBtn),  "hidden");
  inputEl.focus();
  inputEl.select();
};

const closeEdit = ({ display, editBtn, input, saveBtn }) => {
  cls.remove($(display),  "hidden");
  cls.remove($(editBtn),  "hidden");
  cls.add($(input),   "hidden");
  cls.add($(saveBtn), "hidden");
};

const save = async (instance) => {
  const { display, editBtn, input, saveBtn } = instance;
  const saveBtnEl = $(saveBtn);
  const inputEl   = $(input);
  const raw       = inputEl.value.trim();
  if (raw.length === 0) { inputEl.focus(); return; }

  cls.add(saveBtnEl, "saving");
  saveBtnEl.disabled = true;

  try {
    State.userData.nickname = raw;
    await DB.updateNickname(State.user.uid, raw);
    renderAll(raw);
    closeEdit(instance);
    INSTANCES.forEach(({ display: d }) => animateBump($(d), "saved-flash"));
  } catch (err) {
    console.error("Nickname save failed:", err);
  } finally {
    cls.remove(saveBtnEl, "saving");
    saveBtnEl.disabled = false;
  }
};

export const NicknameModule = {
  init(nickname) {
    renderAll(nickname);
    INSTANCES.forEach((instance) => {
      const { display, editBtn, input, saveBtn } = instance;
      $(display)?.addEventListener("click", () => openEdit(instance));
      $(editBtn)?.addEventListener("click", () => openEdit(instance));
      $(saveBtn)?.addEventListener("click", () => save(instance));
      $(input)?.addEventListener("keydown", (e) => {
        if (e.key === "Enter")  { e.preventDefault(); save(instance); }
        if (e.key === "Escape") { closeEdit(instance); }
      });
    });
  },
  renderAll,
};