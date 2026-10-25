import { useState } from "react";
import {
  Hand, House, BookOpen, TrendingUp, Award, ScrollText, Flame, Check, Lock, Play,
  Target, Type, MessageSquare, AlignLeft, Share2, ArrowRight, Star,
} from "lucide-react";
import { LESSONS, PATHWAYS } from "./lessons";
import { loadProgress, currentStreak, xpToday, weekDays, todayStr } from "./progress";
import { wordOfTheDay } from "./daily";
import { shareMessage } from "./share";
import { C, primaryBtn } from "./theme";

const DEEP = "#2D4466";
const R = 4;
const DAILY_GOAL = 30;
const XP_PER_LEVEL = 100;
const NODE = 84;
const STEP = 140;
const W = 500;
const X_OFFSETS = [0, 100, 150, 100, 0, -100, -150, -100];
const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

const PATH_INFO = {
  letters: { icon: Type, color: C.blue, fg: "#fff", tint: C.blueTint, desc: "The alphabet, A to Z." },
  words: { icon: MessageSquare, color: C.rose, fg: C.ink, tint: C.roseTint, desc: "Spell your first words." },
  sentences: { icon: AlignLeft, color: C.sage, fg: C.ink, tint: C.sageTint, desc: "Strings of words, one at a time." },
};

const TABS = [
  ["home", "Home", House],
  ["learn", "Learn", BookOpen],
  ["progress", "Progress", TrendingUp],
  ["badges", "Badges", Award],
  ["certificate", "Certificate", ScrollText],
];

const inPathway = (p, path) =>
  LESSONS.filter((l) => l.pathway === path).every((l) => p.completed.includes(l.id));

// Each badge shows the handshape for the first letter of its name.
export const BADGES = [
  { id: "first", name: "First Sign", sign: "f", how: "Finish your first lesson", color: C.blue, test: (p) => p.completed.length >= 1 },
  { id: "alphabet", name: "Alphabet Done", sign: "a", how: "Finish all the letter lessons", color: C.sage, test: (p) => inPathway(p, "letters") },
  {
    id: "word", name: "First Word", sign: "w", how: "Finish a word lesson", color: C.light,
    test: (p) => LESSONS.some((l) => l.pathway === "words" && p.completed.includes(l.id)),
  },
  { id: "streak", name: "Three Days Running", sign: "s", how: "Practice 3 days in a row", color: "#D4B5B3", test: (p) => p.bestStreak >= 3 },
  { id: "perfect", name: "No Hints", sign: "n", how: "Finish a lesson without a hint", color: C.ink, test: (p) => p.perfect >= 1 },
  { id: "grad", name: "Finished Everything", sign: "g", how: "Finish every lesson", color: "#5E8A52", test: (p) => LESSONS.every((l) => p.completed.includes(l.id)) },
];

function savedName() {
  try {
    return localStorage.getItem("signify-name") || "";
  } catch {
    return "";
  }
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

const card = {
  background: "#fff",
  border: `1px solid ${C.line}`,
  borderRadius: R,
  padding: 20,
};

function Bar({ value, color = C.light, track = C.tint, height = 10 }) {
  return (
    <div style={{ height, borderRadius: 2, background: track, overflow: "hidden" }}>
      <div
        style={{
          height: "100%",
          width: `${Math.min(100, value * 100)}%`,
          background: color,
          transition: "width 0.5s ease",
        }}
      />
    </div>
  );
}

function Ring({ value, size = 150, stroke = 14, color, track, children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: size, height: size, margin: "0 auto" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(1, value))}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div
        style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function HandTile({ letter, size = 72, bg = C.tint }) {
  return (
    <div
      style={{
        width: size, height: size, background: bg, borderRadius: R, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <img src={`/signs/${letter.toLowerCase()}.png`} alt="" style={{ width: size * 0.86 }} />
    </div>
  );
}

function LabeledTile({ letter, size = 100 }) {
  return (
    <div
      style={{
        width: size, background: "#fff", borderRadius: R, padding: "10px 6px 8px",
        textAlign: "center", flexShrink: 0,
      }}
    >
      <img
        src={`/signs/${letter.toLowerCase()}.png`}
        alt={`ASL handshape for the letter ${letter}`}
        style={{ width: size - 24, display: "block", margin: "0 auto" }}
      />
      <div style={{ fontWeight: 700, color: C.ink, marginTop: 2 }}>{letter}</div>
    </div>
  );
}

function BadgeTile({ badge, earned, size = 92 }) {
  return (
    <div
      style={{
        position: "relative", width: size, height: size, borderRadius: R,
        background: earned ? badge.color : "#DADDE0",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}
    >
      <img
        src={`/signs/${badge.sign}.png`}
        alt={earned ? `ASL handshape for ${badge.sign.toUpperCase()}` : ""}
        style={{
          width: size * 0.84,
          opacity: earned ? 1 : 0.3,
          filter: earned ? "none" : "grayscale(1)",
        }}
      />
      {!earned && (
        <Lock
          size={Math.max(14, size * 0.2)}
          color="#6B7480"
          strokeWidth={2.4}
          style={{ position: "absolute", right: 6, bottom: 6 }}
        />
      )}
    </div>
  );
}

function Stat({ n, label }) {
  return (
    <div style={{ fontSize: 18 }}>
      <strong style={{ fontSize: 18 }}>{n}</strong> {label}
    </div>
  );
}

function Sidebar({ tab, setTab, p, who }) {
  const level = Math.floor(p.xp / XP_PER_LEVEL) + 1;
  return (
    <nav
      style={{
        width: 250, flexShrink: 0, background: DEEP, color: "#fff", position: "sticky", top: 0,
        height: "100vh", boxSizing: "border-box", padding: "28px 18px 20px",
        display: "flex", flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 36, padding: "0 6px" }}>
        <div
          style={{
            width: 42, height: 42, borderRadius: R, background: C.light,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Hand size={24} color={DEEP} strokeWidth={2.2} />
        </div>
        <span style={{ fontSize: 28, fontWeight: 700 }}>Signify</span>
      </div>

      {TABS.map(([id, label, Icon]) => (
        <button key={id} className={`nav-item${tab === id ? " active" : ""}`} onClick={() => setTab(id)}>
          <Icon size={20} strokeWidth={2.2} />
          {label}
        </button>
      ))}

      <div
        style={{
          marginTop: "auto", background: "rgba(255,255,255,0.12)", borderRadius: R,
          padding: "12px 14px", display: "flex", alignItems: "center", gap: 12,
        }}
      >
        <div
          style={{
            width: 40, height: 40, borderRadius: R, background: C.rose, color: C.ink,
            display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 18,
          }}
        >
          {(who || "S").charAt(0).toUpperCase()}
        </div>
        <div>
          <div style={{ fontWeight: 700 }}>{who || "Signer"}</div>
          <div style={{ fontSize: 14, color: C.light }}>Level {level}</div>
        </div>
      </div>
    </nav>
  );
}

function Hero({ p }) {
  const next = LESSONS.find((l) => !p.completed.includes(l.id));

  if (!next) {
    return (
      <div style={{ background: DEEP, color: "#fff", borderRadius: R, padding: 28, marginBottom: 24 }}>
        <div style={{ fontWeight: 600, color: C.light }}>That's all of them</div>
        <div style={{ fontSize: 30, fontWeight: 700, margin: "4px 0 18px" }}>Every lesson is done.</div>
        <button
          className="lift"
          style={{ ...primaryBtn, background: C.light, color: C.ink }}
          onClick={() => (window.location.hash = "#certificate")}
        >
          Get your certificate
        </button>
      </div>
    );
  }

  const letters = (
    next.letters || (next.words ? next.words[0] : next.sentences[0].split(" ")[0]).split("")
  ).slice(0, 3);
  const what = next.letters
    ? `${next.letters.length} new letters to learn`
    : next.words
    ? `${next.words.length} words to spell`
    : `${next.sentences.length} phrases to spell out`;
  const pathLessons = LESSONS.filter((l) => l.pathway === next.pathway);
  const fin = pathLessons.filter((l) => p.completed.includes(l.id)).length;
  const pathTitle = PATHWAYS.find((x) => x.id === next.pathway).title;

  return (
    <div style={{ background: DEEP, color: "#fff", borderRadius: R, padding: 28, marginBottom: 24 }}>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "space-between" }}>
        <div style={{ flex: "1 1 260px", minWidth: 240 }}>
          <div style={{ fontWeight: 600, color: C.light }}>
            {p.completed.length ? "Pick up where you left off" : "Start here"}
          </div>
          <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: 2, margin: "2px 0 8px" }}>{next.title}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Target size={18} color={C.light} />
            {what}
          </div>
          <div style={{ maxWidth: 300, marginBottom: 6 }}>
            <Bar value={fin / pathLessons.length} color={C.light} track="rgba(255,255,255,0.2)" />
          </div>
          <div style={{ fontSize: 14, color: C.light, marginBottom: 22 }}>
            {fin} of {pathLessons.length} {pathTitle.toLowerCase()} lessons done
          </div>
          <button
            className="lift"
            style={{ ...primaryBtn, background: C.light, color: C.ink }}
            onClick={() => (window.location.hash = `#lesson/${next.id}`)}
          >
            <Play size={18} fill={C.ink} />
            Start Lesson
          </button>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          {letters.map((c, k) => (
            <LabeledTile key={k} letter={c} size={104} />
          ))}
        </div>
      </div>
    </div>
  );
}

function WordCard() {
  const word = wordOfTheDay();
  return (
    <div style={{ background: C.sageTint, borderLeft: `6px solid ${C.sage}`, borderRadius: R, padding: "22px 26px", marginBottom: 24 }}>
      <div style={{ fontWeight: 600, color: "#4A6F40" }}>Word of the day</div>
      <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: 5, margin: "2px 0 4px", color: DEEP }}>{word}</div>
      <div style={{ marginBottom: 16 }}>Spell it out, one letter at a time.</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        {word.split("").map((c, k) => (
          <LabeledTile key={k} letter={c} size={92} />
        ))}
      </div>
      <button
        className="lift"
        style={{ ...primaryBtn, background: DEEP }}
        onClick={() => (window.location.hash = "#daily")}
      >
        <Play size={18} fill="#fff" />
        Try it
      </button>
    </div>
  );
}

function PathPreview({ p, setTab }) {
  const cur = LESSONS.findIndex((l) => !p.completed.includes(l.id));
  const all = cur < 0;
  const startIdx = all ? LESSONS.length - 4 : Math.max(0, Math.min(cur - 1, LESSONS.length - 4));
  const slice = LESSONS.slice(startIdx, startIdx + 4);

  const nodes = slice.map((l) => ({
    key: l.id,
    title: l.title,
    num: l.id,
    done: p.completed.includes(l.id),
    isCurrent: !all && LESSONS[cur].id === l.id,
  }));

  function Node({ n }) {
    const bg = n.done ? C.sage : n.isCurrent ? C.blue : C.tint;
    const color = n.done ? C.ink : n.isCurrent ? "#fff" : C.muted;
    return (
      <div style={{ width: 92, textAlign: "center", flexShrink: 0 }}>
        <div style={{ position: "relative", width: 56, height: 56, margin: "0 auto 8px", color: C.blue }}>
          {n.isCurrent && <span className="ring" />}
          <div
            style={{
              position: "relative", width: 56, height: 56, borderRadius: "50%", background: bg, color,
              display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 20,
            }}
          >
            {n.done ? <Check size={26} strokeWidth={3} /> : n.num}
          </div>
        </div>
        <div style={{ fontWeight: 700, fontSize: 14, color: n.isCurrent ? C.blue : C.ink }}>{n.title}</div>
        <div style={{ fontSize: 13, color: n.isCurrent ? C.blue : C.muted }}>
          {n.done ? "Done" : n.isCurrent ? "Up next" : "Locked"}
        </div>
      </div>
    );
  }

  const line = (done) => (
    <div
      style={{
        flex: 1, height: 0, marginTop: 28, minWidth: 12,
        borderTop: `3px dotted ${done ? C.sage : "#C5CED6"}`,
      }}
    />
  );

  return (
    <div style={{ ...card, marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Where you are</h2>
          <div style={{ color: C.muted, marginTop: 2 }}>The next few lessons, and the certificate at the end.</div>
        </div>
        <button
          className="lift"
          onClick={() => setTab("learn")}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", fontFamily: "inherit",
            fontWeight: 600, fontSize: 14, color: C.blue, background: "#fff", border: `1px solid ${C.light}`,
            borderRadius: R, cursor: "pointer",
          }}
        >
          All lessons
          <ArrowRight size={16} />
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", marginTop: 24 }}>
        {nodes.map((n) => (
          <div key={n.key} style={{ display: "contents" }}>
            <Node n={n} />
            {line(n.done)}
          </div>
        ))}
        <div style={{ width: 92, textAlign: "center", flexShrink: 0 }}>
          <div
            style={{
              width: 56, height: 56, borderRadius: "50%", margin: "0 auto 8px",
              background: all ? C.sage : C.tint, display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <ScrollText size={26} color={all ? C.ink : C.muted} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Certificate</div>
          <div style={{ fontSize: 13, color: C.muted }}>{all ? "Ready" : "At the end"}</div>
        </div>
      </div>
    </div>
  );
}

function WindingPath({ lessons, p, info }) {
  const current = LESSONS.find((l) => !p.completed.includes(l.id));
  const pts = lessons.map((_, k) => ({
    x: W / 2 + X_OFFSETS[k % X_OFFSETS.length],
    y: 24 + k * STEP + NODE / 2,
  }));
  const height = 24 + lessons.length * STEP;
  const curve = (list) =>
    list.reduce((d, pt, k) => {
      if (k === 0) return `M ${pt.x} ${pt.y}`;
      const a = list[k - 1];
      const my = (a.y + pt.y) / 2;
      return `${d} C ${a.x} ${my}, ${pt.x} ${my}, ${pt.x} ${pt.y}`;
    }, "");
  const doneCount = lessons.filter((l) => p.completed.includes(l.id)).length;
  const reach = pts.slice(0, Math.min(doneCount, lessons.length - 1) + 1);

  return (
    <div style={{ position: "relative", width: W, maxWidth: "100%", height, margin: "0 auto" }}>
      <svg width={W} height={height} style={{ position: "absolute", left: 0, top: 0 }} aria-hidden="true">
        <path d={curve(pts)} fill="none" stroke="#C5CED6" strokeWidth="6" strokeLinecap="round" strokeDasharray="1 14" />
        {reach.length > 1 && (
          <path d={curve(reach)} fill="none" stroke={info.color} strokeWidth="6" strokeLinecap="round" strokeDasharray="1 14" />
        )}
      </svg>

      {lessons.map((l, k) => {
        const done = p.completed.includes(l.id);
        const isCurrent = current && current.id === l.id;
        const locked = !done && !isCurrent;
        const { x, y } = pts[k];
        const open = () => (window.location.hash = `#lesson/${l.id}`);
        return (
          <div key={l.id}>
            <div
              style={{
                position: "absolute", left: x - NODE / 2, top: y - NODE / 2,
                width: NODE, height: NODE, color: info.color,
              }}
            >
              {isCurrent && <span className="ring" />}
              <button
                className="lift"
                disabled={locked}
                onClick={open}
                aria-label={`${l.title}${done ? ", done" : locked ? ", locked" : ", up next"}`}
                style={{
                  position: "relative", width: NODE, height: NODE, borderRadius: "50%",
                  border: locked ? `3px solid ${C.line}` : 0,
                  background: locked ? "#fff" : info.color,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: locked ? "default" : "pointer",
                }}
              >
                {done ? (
                  <Check size={38} color={info.fg} strokeWidth={3} />
                ) : isCurrent ? (
                  <Play size={34} color={info.fg} fill={info.fg} />
                ) : (
                  <Lock size={28} color="#9AA4B2" strokeWidth={2.2} />
                )}
              </button>
            </div>

            {!isCurrent && (
              <div
                style={{
                  position: "absolute", left: x - 70, width: 140, top: y + NODE / 2 + 8,
                  textAlign: "center", fontWeight: 600, fontSize: 15,
                  color: locked ? C.muted : C.ink,
                }}
              >
                {l.title}
              </div>
            )}

            {isCurrent && (
              <div
                style={{
                  position: "absolute", top: y - 62, width: 190,
                  left: x <= W / 2 ? x + NODE / 2 + 16 : x - NODE / 2 - 16 - 190,
                  background: "#fff", border: `2px solid ${info.color}`, borderRadius: R,
                  padding: "14px 16px",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 18 }}>{l.title}</div>
                <div style={{ fontSize: 14, color: C.muted, margin: "2px 0 10px" }}>
                  Lesson {l.id} of {LESSONS.length}
                </div>
                <button
                  className="lift"
                  onClick={open}
                  style={{ ...primaryBtn, padding: "9px 16px", fontSize: 15, background: info.color, color: info.fg }}
                >
                  Start
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PathwaySection({ path, p }) {
  const info = PATH_INFO[path.id];
  const Icon = info.icon;
  const lessons = LESSONS.filter((l) => l.pathway === path.id);
  const finished = lessons.filter((l) => p.completed.includes(l.id)).length;
  return (
    <section style={{ marginBottom: 36 }}>
      <div
        style={{
          background: info.color, color: info.fg, borderRadius: `${R}px ${R}px 0 0`,
          padding: "20px 24px", display: "flex", alignItems: "center", gap: 16,
        }}
      >
        <Icon size={30} strokeWidth={2.2} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 24 }}>{path.title}</h2>
          <div>{info.desc}</div>
        </div>
        <div style={{ fontSize: 18 }}>
          <strong>{finished}</strong> of {lessons.length} done
        </div>
      </div>
      <div
        style={{
          background: info.tint, borderRadius: `0 0 ${R}px ${R}px`, padding: "28px 12px 12px",
          border: `1px solid ${C.line}`, borderTop: 0,
        }}
      >
        <WindingPath lessons={lessons} p={p} info={info} />
      </div>
    </section>
  );
}

function Rail({ p }) {
  const today = xpToday(p);
  const streak = currentStreak(p);
  const level = Math.floor(p.xp / XP_PER_LEVEL) + 1;
  const into = p.xp % XP_PER_LEVEL;
  const week = weekDays();
  const now = todayStr();
  const weekXp = week.map((d) => p.days[d] || 0);
  const weekTotal = weekXp.reduce((a, b) => a + b, 0);
  const peak = Math.max(DAILY_GOAL, ...weekXp);
  const reached = today >= DAILY_GOAL;

  const earned = BADGES.filter((b) => b.test(p));
  const badge = earned.length ? earned[earned.length - 1] : BADGES[0];

  return (
    <aside
      style={{
        width: 300, flexShrink: 0, position: "sticky", top: 36,
        display: "flex", flexDirection: "column", gap: 20,
      }}
    >
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, marginBottom: 14 }}>
          <Target size={20} color={C.blue} />
          Today
        </div>
        <Ring value={today / DAILY_GOAL} color={C.sage} track={C.tint}>
          <div style={{ fontSize: 36, fontWeight: 700, lineHeight: 1 }}>{Math.min(today, DAILY_GOAL)}</div>
          <div style={{ fontSize: 14, color: C.muted }}>of {DAILY_GOAL} XP</div>
        </Ring>
        <div style={{ textAlign: "center", marginTop: 14, fontWeight: 600 }}>
          {reached ? "Done for today." : `${DAILY_GOAL - today} more XP for today's goal`}
        </div>
      </div>

      <div style={{ background: C.tint, borderRadius: R, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Flame size={30} color={C.rose} fill={C.rose} />
          <div style={{ fontSize: 20, fontWeight: 700 }}>
            {streak === 0
              ? "No streak yet"
              : `${streak} ${streak === 1 ? "day" : "days"} in a row`}
          </div>
        </div>
        {streak === 0 && <div style={{ marginTop: 4, color: C.muted }}>Do a lesson today and it starts.</div>}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
          {week.map((d, k) => {
            const did = p.days[d] !== undefined;
            return (
              <div key={d} style={{ textAlign: "center" }}>
                <div
                  style={{
                    width: 28, height: 28, borderRadius: "50%", margin: "0 auto 4px",
                    background: did ? C.rose : "#fff",
                    border: `2px solid ${d === now ? C.ink : C.rose}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  {did && <Check size={16} color={C.ink} strokeWidth={3} />}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{DAY_LETTERS[k]}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ borderTop: `2px solid ${C.blue}`, paddingTop: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, marginBottom: 10 }}>
          
          Level {level}
        </div>
        <Bar value={into / XP_PER_LEVEL} color={C.blue} />
        <div style={{ marginTop: 8, color: C.muted, fontSize: 15 }}>
          {XP_PER_LEVEL - into} XP until level {level + 1}
        </div>
      </div>

      <div style={{ borderTop: `2px solid ${C.light}`, paddingTop: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
          <TrendingUp size={20} color={C.blue} />
          This week: {weekTotal} XP
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 90, marginTop: 12 }}>
          {weekXp.map((xp, k) => (
            <div key={k} style={{ flex: 1, textAlign: "center" }}>
              <div
                style={{
                  height: Math.max(6, (xp / peak) * 78), borderRadius: 2,
                  background: xp > 0 ? C.blue : C.tint, transition: "height 0.4s",
                }}
              />
              <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4, color: week[k] === now ? C.ink : C.muted }}>
                {DAY_LETTERS[k]}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ borderTop: `2px solid ${C.sage}`, paddingTop: 14, display: "flex", alignItems: "center", gap: 14 }}>
        <BadgeTile badge={badge} earned={earned.length > 0} size={60} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.blue }}>
            {earned.length ? "Latest badge" : "First one to get"}
          </div>
          <div style={{ fontWeight: 700 }}>{badge.name}</div>
          <div style={{ fontSize: 14, color: C.muted }}>{earned.length ? "Yours" : badge.how}</div>
        </div>
      </div>
    </aside>
  );
}

function ProgressTab({ p }) {
  const [msg, setMsg] = useState("");
  const level = Math.floor(p.xp / XP_PER_LEVEL) + 1;
  const learned = LESSONS.filter((l) => l.kind === "letters" && p.completed.includes(l.id))
    .flatMap((l) => l.letters)
    .slice(-12);

  return (
    <div>
      <h1 style={{ fontSize: 30, margin: "0 0 16px" }}>Progress</h1>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 28 }}>
        <Stat n={currentStreak(p)} label="day streak" />
        <span style={{ color: C.line }}>|</span>
        <Stat n={p.xp} label={`XP, level ${level}`} />
        <span style={{ color: C.line }}>|</span>
        <Stat n={`${p.completed.length} of ${LESSONS.length}`} label="lessons done" />
        <span style={{ color: C.line }}>|</span>
        <Stat n={p.perfect} label={p.perfect === 1 ? "lesson with no hints" : "lessons with no hints"} />
      </div>

      <div style={{ ...card, marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, margin: "0 0 16px" }}>By pathway</h2>
        {PATHWAYS.map((path) => {
          const info = PATH_INFO[path.id];
          const lessons = LESSONS.filter((l) => l.pathway === path.id);
          const n = lessons.filter((l) => p.completed.includes(l.id)).length;
          return (
            <div key={path.id} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontWeight: 600 }}>
                <span>{path.title}</span>
                <span style={{ color: C.muted }}>{n} of {lessons.length}</span>
              </div>
              <Bar value={n / lessons.length} color={info.color} track={info.tint} height={12} />
            </div>
          );
        })}
      </div>

      <div style={{ ...card, marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, margin: "0 0 16px" }}>Letters you know</h2>
        {learned.length === 0 ? (
          <p style={{ margin: 0, color: C.muted }}>Nothing here yet. Finish a lesson and the letters show up.</p>
        ) : (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {learned.map((c) => (
              <div key={c} style={{ textAlign: "center" }}>
                <HandTile letter={c} size={72} />
                <div style={{ fontWeight: 700, marginTop: 4 }}>{c}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        className="lift"
        style={primaryBtn}
        onClick={async () =>
          setMsg(
            await shareMessage(
              `I've finished ${p.completed.length} of ${LESSONS.length} lessons in Signify and earned ${p.xp} XP. Learn ASL with your webcam: ${window.location.origin}`
            )
          )
        }
      >
        <Share2 size={18} />
        Share my progress
      </button>
      <p style={{ minHeight: 24, color: C.blue }}>{msg}</p>
    </div>
  );
}

function BadgesTab({ p }) {
  const got = BADGES.filter((b) => b.test(p)).length;
  return (
    <div>
      <h1 style={{ fontSize: 30, margin: 0 }}>Badges</h1>
      <p style={{ margin: "4px 0 24px", color: C.blue, fontWeight: 600 }}>
        {got} of {BADGES.length} so far
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 20 }}>
        {BADGES.map((b) => {
          const earned = b.test(p);
          return (
            <div key={b.id} style={{ textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <BadgeTile badge={b} earned={earned} size={116} />
              </div>
              <div style={{ fontWeight: 700, fontSize: 18, margin: "12px 0 2px" }}>{b.name}</div>
              <div style={{ color: C.muted, fontSize: 15 }}>{earned ? "Yours" : b.how}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CertificateTab({ p }) {
  const finished = p.completed.length;
  const all = finished >= LESSONS.length;
  return (
    <div style={{ maxWidth: 520 }}>
      <h1 style={{ fontSize: 30, margin: "0 0 20px" }}>Certificate</h1>
      <div style={{ ...card, background: all ? C.sageTint : "#fff", padding: 28 }}>
        {all ? (
          <>
            <p style={{ fontSize: 18, marginTop: 0 }}>You did all of them. Go grab your certificate.</p>
            <button className="lift" style={primaryBtn} onClick={() => (window.location.hash = "#certificate")}>
              <ScrollText size={18} />
              View certificate
            </button>
          </>
        ) : (
          <>
            <p style={{ fontSize: 18, marginTop: 0 }}>
              {LESSONS.length - finished} {LESSONS.length - finished === 1 ? "lesson" : "lessons"} to go.
            </p>
            <Bar value={finished / LESSONS.length} color={C.sage} height={12} />
            <p style={{ color: C.muted, marginBottom: 0 }}>{finished} of {LESSONS.length} done</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [tab, setTab] = useState("home");
  const p = loadProgress();
  const who = savedName();
  const next = LESSONS.find((l) => !p.completed.includes(l.id));
  const showRail = tab === "home" || tab === "learn";

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg }}>
      <Sidebar tab={tab} setTab={setTab} p={p} who={who} />
      <main style={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "center", padding: "36px 40px" }}>
        <div style={{ display: "flex", gap: 32, width: "100%", maxWidth: 1140, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 540px", minWidth: 0 }}>
            {tab === "home" && (
              <>
                <h1 style={{ fontSize: 32, margin: 0 }}>
                  {greeting()}
                  {who ? `, ${who}` : ""}
                </h1>
                <p style={{ margin: "4px 0 24px", color: C.blue, fontWeight: 500 }}>
                  {next ? `Next up is lesson ${next.id}: ${next.title}.` : "That's every lesson. Nice."}
                </p>
                <Hero p={p} />
                <WordCard />
                <PathPreview p={p} setTab={setTab} />
              </>
            )}
            {tab === "learn" && (
              <>
                <h1 style={{ fontSize: 32, margin: "0 0 24px" }}>Lessons</h1>
                {PATHWAYS.map((path) => (
                  <PathwaySection key={path.id} path={path} p={p} />
                ))}
              </>
            )}
            {tab === "progress" && <ProgressTab p={p} />}
            {tab === "badges" && <BadgesTab p={p} />}
            {tab === "certificate" && <CertificateTab p={p} />}
          </div>
          {showRail && <Rail p={p} />}
        </div>
      </main>
    </div>
  );
}