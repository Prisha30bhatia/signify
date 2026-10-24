const KEY = "signify-progress";

export function todayStr() {
  return new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local time
}

export function addDays(dateStr, n) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString("en-CA");
}

function daysBetween(a, b) {
  return Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 86400000);
}

function fresh() {
  return {
    completed: [],
    xp: 0,
    streak: 0,
    bestStreak: 0,
    lastDay: null,
    todayXp: 0,
    todayDate: null,
    perfect: 0,
    days: {},
  };
}

export function loadProgress() {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    saved = {};
  }
  const p = { ...fresh(), ...saved };
  p.completed = [...(saved.completed || [])];
  p.days = { ...(saved.days || {}) };
  // Older saves: fill in the days we already know about.
  if (p.todayDate && p.todayXp && p.days[p.todayDate] === undefined) {
    p.days[p.todayDate] = p.todayXp;
  }
  if (p.lastDay) {
    for (let k = 0; k < p.streak; k++) {
      const d = addDays(p.lastDay, -k);
      if (p.days[d] === undefined) p.days[d] = 0;
    }
  }
  return p;
}

// A streak only counts if you practiced today or yesterday.
export function currentStreak(p) {
  if (!p.lastDay) return 0;
  return daysBetween(p.lastDay, todayStr()) <= 1 ? p.streak : 0;
}

export function xpToday(p) {
  return p.todayDate === todayStr() ? p.todayXp : 0;
}

// The seven dates of this week, Monday first.
export function weekDays() {
  const t = todayStr();
  const dow = (new Date(t + "T12:00:00").getDay() + 6) % 7;
  const monday = addDays(t, -dow);
  return Array.from({ length: 7 }, (_, k) => addDays(monday, k));
}

export function completeLesson(id, xp, perfect) {
  const p = loadProgress();
  const t = todayStr();
  if (id !== "daily" && !p.completed.includes(id)) p.completed.push(id);
  p.xp += xp;
  p.todayXp = (p.todayDate === t ? p.todayXp : 0) + xp;
  p.todayDate = t;
  p.days[t] = (p.days[t] || 0) + xp;
  if (p.lastDay !== t) {
    p.streak = p.lastDay && daysBetween(p.lastDay, t) === 1 ? p.streak + 1 : 1;
    p.lastDay = t;
  }
  p.bestStreak = Math.max(p.bestStreak, p.streak);
  if (perfect && id !== "daily") p.perfect += 1;
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // storage blocked or full; ignore
  }
  return p;
}