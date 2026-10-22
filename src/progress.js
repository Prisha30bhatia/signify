const KEY = "signify-progress";

export function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || { completed: [], xp: 0 };
  } catch {
    return { completed: [], xp: 0 };
  }
}

export function completeLesson(id, xp) {
  const p = loadProgress();
  if (!p.completed.includes(id)) p.completed.push(id);
  p.xp += xp;
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // storage full or blocked; ignore
  }
  return p;
}