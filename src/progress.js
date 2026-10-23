const KEY = "signify-progress";
const DEFAULT = {
  completed: [],
  xp: 0,
  streak: 0,
  bestStreak: 0,
  lastDay: null,
  todayXp: 0,
  todayDate: null,
  perfect: 0,
};

export function todayStr() {
  return new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local time
}

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

export function loadProgress() {
  try {
    return { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY)) };
  } catch {
    return { ...DEFAULT };
  }
}

// A streak only counts if you practiced today or yesterday.
export function currentStreak(p) {
  if (!p.lastDay) return 0;
  return daysBetween(p.lastDay, todayStr()) <= 1 ? p.streak : 0;
}

export function xpToday(p) {
  return p.todayDate === todayStr() ? p.todayXp : 0;
}

export function completeLesson(id, xp, perfect) {
  const p = loadProgress();
  const t = todayStr();
  if (!p.completed.includes(id)) p.completed.push(id);
  p.xp += xp;
  p.todayXp = (p.todayDate === t ? p.todayXp : 0) + xp;
  p.todayDate = t;
  if (p.lastDay !== t) {
    p.streak = p.lastDay && daysBetween(p.lastDay, t) === 1 ? p.streak + 1 : 1;
    p.lastDay = t;
  }
  p.bestStreak = Math.max(p.bestStreak, p.streak);
  if (perfect) p.perfect += 1;
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // storage blocked or full; ignore
  }
  return p;
}