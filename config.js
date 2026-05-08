// ═══════════════════════════════════════════════════
// config.js — All constants, static data, presets
// ═══════════════════════════════════════════════════

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC7tidcBNCDDQMMgRXrZrPmWqOB2y2e3VU",
  //authDomain: "web-retro-platform.netlify.app",
  authDomain: "web-retro-platform.firebaseapp.com",
  projectId: "web-retro-platform",
  storageBucket: "web-retro-platform.firebasestorage.app",
  messagingSenderId: "914342980305",
  appId: "1:914342980305:web:26bd5f2cbd45887591b3f0"
};

export const GAME_CONFIG = {
  SPIN_COST:        5,
  STARTING_CREDITS: 100,
  GRID_SIZE:        5,
  SPIN_DURATION_MS: 4200,
  TICK_MS:          60,
};

export const POP_MATCH_CONFIG = {
  STAGE_REWARDS:   [0, 2, 4, 7, 12, 20], // index = stage number
  RUN_MULTIPLIERS: [1.0, 0.6, 0.3, 0.1], // 1st, 2nd, 3rd, 4th+ run of the day
};

export const FRUITS = [
  { emoji: "🍒", value: 1,   weight: 45, label: "cherry"    },
  { emoji: "🍍", value: 10,  weight: 12, label: "pineapple" },
  { emoji: "🥭", value: 3,   weight: 18, label: "mango"     },
  { emoji: "🍎", value: 5,   weight: 15, label: "apple"     },
  { emoji: "🍫", value: 100, weight: 3,  label: "bar"       },
  { emoji: "💣", value: 0,   weight: 7,  label: "bomb"      },
];

export const TOTAL_WEIGHT = FRUITS.reduce((sum, f) => sum + f.weight, 0);

export const FIXED_LAYOUT = {
  0:"🍒", 1:"🍍", 2:"💣", 3:"🍎", 4:"🍒",
  5:"🍍",                          9:"🍎",
  10:"🍒",                         14:"🍒",
  15:"💣",                         19:"💣",
  20:"🍒", 21:"🥭", 22:"🍫", 23:"🥭", 24:"🍒",
};

export const PM_PRESETS = {
  colors: [
    {
      id:      "default",
      name:    "Arcade Classic",
      price:   0,
      free:    true,
      preview: { cardBorder: "#ff4d6d", matched: "#00b38a", glow: "rgba(255,77,109,0.5)" },
      desc:    "The original arcade look. Always free.",
    },
    {
      id:      "neon",
      name:    "Neon Pulse",
      price:   100,
      free:    false,
      preview: { cardBorder: "#00f5d4", matched: "#7b2fff", glow: "rgba(0,245,212,0.5)" },
      desc:    "Cyan borders, violet matched cards. Electric.",
    },
    {
      id:      "gold",
      name:    "Golden Hour",
      price:   150,
      free:    false,
      preview: { cardBorder: "#f7c948", matched: "#ff8c00", glow: "rgba(247,201,72,0.5)" },
      desc:    "All-gold everything. For the top of the leaderboard.",
    },
    {
      id:      "ghost",
      name:    "Ghost Mode",
      price:   120,
      free:    false,
      preview: { cardBorder: "#a855f7", matched: "#ec4899", glow: "rgba(168,85,247,0.5)" },
      desc:    "Purple & pink. Hauntingly good.",
    },
    {
      id:      "ice",
      name:    "Ice Cold",
      price:   130,
      free:    false,
      preview: { cardBorder: "#38bdf8", matched: "#0ea5e9", glow: "rgba(56,189,248,0.5)" },
      desc:    "Cool blue tones. Keep it frosty.",
    },
    {
      id:      "lava",
      name:    "Lava Rush",
      price:   170,
      free:    false,
      preview: { cardBorder: "#ff3b30", matched: "#ff9500", glow: "rgba(255,59,48,0.5)" },
      desc:    "Molten red energy with blazing orange highlights.",
    },
    {
      id:      "forest",
      name:    "Forest Core",
      price:   140,
      free:    false,
      preview: { cardBorder: "#22c55e", matched: "#15803d", glow: "rgba(34,197,94,0.5)" },
      desc:    "Deep greens inspired by nature and adventure.",
    },
    {
      id:      "sunset",
      name:    "Sunset Drift",
      price:   160,
      free:    false,
      preview: { cardBorder: "#fb7185", matched: "#f97316", glow: "rgba(251,113,133,0.5)" },
      desc:    "Warm pink and orange skies at golden hour.",
    },
    {
      id:      "cyber",
      name:    "Cyber Matrix",
      price:   200,
      free:    false,
      preview: { cardBorder: "#00ff99", matched: "#00ccff", glow: "rgba(0,255,153,0.5)" },
      desc:    "Digital green with futuristic blue neon vibes.",
    },
    {
      id:      "royal",
      name:    "Royal Velvet",
      price:   180,
      free:    false,
      preview: { cardBorder: "#7c3aed", matched: "#f43f5e", glow: "rgba(124,58,237,0.5)" },
      desc:    "Elegant royal purple with luxurious pink accents.",
    },
  ],

  emojis: [
    {
      id:      "classic",
      name:    "Classic Arcade",
      price:   0,
      free:    true,
      symbols: ["👾","🕹️","💎","⚡","👑","🎲","🚀","🔥","🧩","🌀"],
      desc:    "The original symbol set. Always free.",
    },
    {
      id:      "fruits",
      name:    "Fruit Frenzy",
      price:   100,
      free:    false,
      symbols: ["🍒","🥭","🍎","🍍","🍫","🍓","🍑","🍇","🍉","🥝"],
      desc:    "Familiar fruits from the slot machine, now on cards.",
    },
    {
      id:      "animals",
      name:    "Wild Pack",
      price:   120,
      free:    false,
      symbols: ["🐶","🐱","🦊","🐸","🐧","🦁","🐯","🦋","🐙","🦄"],
      desc:    "Cute but competitive. Don't let the animals fool you.",
    },
    {
      id:      "space",
      name:    "Deep Space",
      price:   150,
      free:    false,
      symbols: ["🪐","🌙","⭐","☄️","🛸","🌟","💫","🔭","🎆","🚀"],
      desc:    "Explore the cosmos one card flip at a time.",
    },
    {
      id:      "food",
      name:    "Junk Food",
      price:   100,
      free:    false,
      symbols: ["🍕","🍔","🌮","🍜","🍣","🧁","🍩","🍦","🥐","🍿"],
      desc:    "Chaotic and delicious. Hunger not included.",
    },
    {
      id:      "mythic",
      name:    "Mythic Legends",
      price:   180,
      free:    false,
      symbols: ["🐉","🦄","🧙","⚔️","🛡️","🔥","👑","🏰","🧝","🐲"],
      desc:    "Fantasy creatures and legendary heroes collide.",
    },
    {
      id:      "ocean",
      name:    "Ocean Dive",
      price:   130,
      free:    false,
      symbols: ["🐠","🐬","🦈","🐳","🐙","🪸","🌊","🦀","🐚","🪼"],
      desc:    "A relaxing underwater adventure.",
    },
    {
      id:      "sports",
      name:    "Champion Arena",
      price:   140,
      free:    false,
      symbols: ["⚽","🏀","🏈","🎾","🏐","🥊","🏆","🎯","🏓","⛳"],
      desc:    "Competitive energy for true champions.",
    },
    {
      id:      "weather",
      name:    "Weather Chaos",
      price:   110,
      free:    false,
      symbols: ["☀️","🌧️","⛈️","❄️","🌪️","🌈","☁️","🌤️","🌙","⚡"],
      desc:    "Every forecast leads to a different combo.",
    },
    {
      id:      "tech",
      name:    "Tech World",
      price:   170,
      free:    false,
      symbols: ["💻","📱","⌨️","🖥️","🧠","🤖","🔋","📡","🎧","🛰️"],
      desc:    "Modern gadgets and futuristic tech icons.",
    },
  ],
};
