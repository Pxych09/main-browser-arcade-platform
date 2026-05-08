// ═══════════════════════════════════════════════════
// db.js — All Firestore database operations
// ═══════════════════════════════════════════════════

import { initializeApp }    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth }          from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  writeBatch,
  Timestamp,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { FIREBASE_CONFIG, GAME_CONFIG } from "./config.js";

// ── Firebase init (single instance) ─────────────────

export const firebaseApp = initializeApp(FIREBASE_CONFIG);
export const auth        = getAuth(firebaseApp);
export const db          = getFirestore(firebaseApp);

// ── Firestore service ────────────────────────────────

export const DB = {
  userRef:    (uid) => doc(db, "users", uid),
  historyCol: ()    => collection(db, "gameHistory"),

  async getUser(uid) {
    const snap = await getDoc(DB.userRef(uid));
    return snap.exists() ? snap.data() : null;
  },

  async createUser(uid, email) {
    const data = {
      email,
      credits:     GAME_CONFIG.STARTING_CREDITS,
      lastLogin:   serverTimestamp(),
      lastClaimAt: null,
      nickname:    "",
    };
    await setDoc(DB.userRef(uid), data);
    return data;
  },

  async ensureUser(uid, email) {
    const existing = await DB.getUser(uid);
    if (existing) {
      await updateDoc(DB.userRef(uid), { lastLogin: serverTimestamp() });
      return existing;
    }
    return DB.createUser(uid, email);
  },

  async updateCredits(uid, credits) {
    await updateDoc(DB.userRef(uid), { credits });
  },

  async logHistory(uid, result, reward) {
    await addDoc(DB.historyCol(), {
      userId: uid, result, reward, createdAt: serverTimestamp(),
    });
  },

  async getRecentHistory(uid, count = 8) {
    const q = query(
      DB.historyCol(),
      where("userId", "==", uid),
      orderBy("createdAt", "desc"),
      limit(count)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async updateNickname(uid, nickname) {
    await updateDoc(DB.userRef(uid), { nickname });
  },

  async getLeaderboard(topN = 20) {
    const q = query(
      collection(db, "users"),
      orderBy("credits", "desc"),
      limit(topN)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
  },

  /**
   * Delete all gameHistory entries for this user older than today midnight.
   * Fire-and-forget — call without await.
   */
  async purgeOldHistory(uid) {
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);

    const q = query(
      DB.historyCol(),
      where("userId",    "==", uid),
      where("createdAt", "<",  Timestamp.fromDate(cutoff))
    );

    const snap = await getDocs(q);
    if (snap.empty) return;

    const BATCH_LIMIT = 499;
    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += BATCH_LIMIT) {
      const batch = writeBatch(db);
      docs.slice(i, i + BATCH_LIMIT).forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
    console.log(`[Purge] Deleted ${docs.length} stale history record(s).`);
  },

  async getDayHistory(uid, dayStart, dayEnd) {
    const q = query(
      DB.historyCol(),
      where("userId",    "==", uid),
      where("createdAt", ">=", Timestamp.fromDate(dayStart)),
      where("createdAt", "<",  Timestamp.fromDate(dayEnd)),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async getPopMatchDailyRuns(uid) {
    const data = await DB.getUser(uid);
    if (!data) return 0;
    const capDate = data.popMatchRunDate;
    if (!capDate) return 0;
    const stored = capDate.toDate ? capDate.toDate() : new Date(capDate);
    if (stored.toDateString() !== new Date().toDateString()) return 0;
    return data.popMatchDailyRuns || 0;
  },

  async incrementPopMatchDailyRuns(uid) {
    const current = await DB.getPopMatchDailyRuns(uid);
    await updateDoc(DB.userRef(uid), {
      popMatchDailyRuns: current + 1,
      popMatchRunDate:   new Date(),
    });
  },

  async getInventory(uid) {
    const data = await DB.getUser(uid);
    return data?.popMatchInventory ?? {
      ownedPresets: ["default", "classic"],
      activeColor:  "default",
      activeEmoji:  "classic",
    };
  },

  async saveInventory(uid, inventory) {
    await updateDoc(DB.userRef(uid), { popMatchInventory: inventory });
  },
};