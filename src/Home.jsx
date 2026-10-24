import { useState } from "react";
import {
  Hand, BookOpen, TrendingUp, Award, ScrollText, Flame, Zap, Check, Lock, Play,
  GraduationCap, Target, Type, MessageSquare, AlignLeft, Share2,
} from "lucide-react";
import { LESSONS, PATHWAYS } from "./lessons";
import { loadProgress, currentStreak, xpToday } from "./progress";
import { shareMessage } from "./share";
import { C, primaryBtn, quietBtn } from "./theme";

const DAILY_GOAL = 30;
const XP_PER_LEVEL = 100;
const NODE = 84;
const STEP = 140;
const W = 500;
const X_OFFSETS = [0, 100, 150, 100, 0, -100, -150, -100];
const HEX = "polygon(50% 0, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)";

const PATH_INFO = {
  letters: { icon: Type, color: C.blue, fg: "#fff", tint: C.blueTint, desc: "Learn the fingerspelling alphabet, A to Z." },
  words: { icon: MessageSquare, color: C.sage, fg: C.ink, tint: C.sageTint, desc: "Fingerspell your first words." },
  sentences: { icon: AlignLeft, color: C.rose, fg: C.ink, tint: C.roseTint, desc: "Put words together into phrases." },
};

const TABS = [
  ["learn", "Learn", BookOpen],
  ["progress", "Progress", TrendingUp],
  ["badges", "Badges", Award],
  ["certificate", "Certificate", ScrollText],
];

const inPathway = (p, path) =>
  LESSONS.filter((l) => l.pathway === path).every((l) => p.completed.includes(l.id));

export const BADGES = [
  { id: "first", name: "First Sign", how: "Finish your first lesson", icon: Hand, color: C.blue, fg: "#fff", test: (p) => p.completed.length >= 1 },
  { id: "alphabet", name: "Alphabet Done", how: "Finish all letter lessons", icon: Type, color: C.sage, fg: C.ink, test: (p) => inPathway(p, "letters") },
  {
    id: "word", name: "First Word", how: "Finish a word lesson", icon: MessageSquare, color: C.light, fg: C.ink,
    test: (p) => LESSONS.some((l) => l.pathway === "words" && p.completed.includes(l.id)),
  },
  { id: "streak", name: "3-Day Streak", how: "Practice 3 days in a row", icon: Flame, color: C.rose, fg: C.ink, test: (p) => p.bestStreak >= 3 },
  { id: "perfect", name: "No Hints Needed", how: "Finish a lesson without hints", icon: Target, color: C.blue, fg: "#fff", test: (p) => p.perfect >= 1 },
  { id: "grad", name: "Signify Graduate", how: "Finish every lesson", icon: GraduationCap, color: C.sage, fg: C.ink, test: (p) => LESSONS.every((l) => p.completed.includes(l.id)) },
];

const DAILY_WORDS = [
  "HELLO", "FRIEND", "FAMILY", "SCHOOL", "HAPPY", "WATER", "MUSIC", "SMILE",
  "LEARN", "HANDS", "PEACE", "GREAT", "BREAD", "APPLE", "TIGER", "OCEAN",
  "RIVER", "CLOUD", "STORM", "LIGHT", "EARTH", "PLANT", "SUNNY", "BEACH",
  "LEMON", "MANGO", "HONEY", "CANDY", "PIANO", "DREAM",
];

// Same word all day, a new one at local midnight.
function wordOfTheDay() {
  const day = new Date().toLocaleDateString("en-CA");
  let h = 0;
  for (const c of day) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return DAILY_WORDS[h % DAILY_WORDS.length];
}

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
  borderRadius: 14,
  padding: 20,
};

function Bar({ value, color = C.light, track = C.tint, height = 10 }) {
  return (
    <div style={{ height, borderRadius: height / 2, background: track, overflow: "hidden" }}>
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
        width: size, height: size, background: bg, borderRadius: 12, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <img src={`/signs/${letter.toLowerCase()}.png`} alt="" style={{ width: size * 0.86 }} />
    </div>
  );
}

function BadgeShape({ badge, earned, size = 92 }) {
  const Icon = badge.icon;
  return (
    <div style={{ position: "relative", width: size, height: size, margin: "0 auto" }}>
      <div style={{ position: "absolute", inset: 0, background: earned ? badge.color : "#DDE3EA", clipPath: HEX }} />
      {earned && (
        <div style={{ position: "absolute", inset: 7, background: "rgba(255,255,255,0.22)", clipPath: HEX }} />
      )}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {earned ? (
          <Icon size={size * 0.4} color={badge.fg} strokeWidth={2.2} />
        ) : (
          <Lock size={size * 0.32} color="#7B8594" strokeWidth={2.2} />
        )}
      </div>
    </div>
  );
}

function Sidebar({ tab, setTab, p, who }) {
  const level = Math.floor(p.xp / XP_PER_LEVEL) + 1;
  return (
    <nav
      style={{
        width: 240, flexShrink: 0, background: C.blue, color: "#fff", padding: "28px 18px",
        display: "flex", flexDirection: "column", position: "sticky", top: 0,
        height: "100vh", boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 36, padding: "0 6px" }}>
        <div
          style={{
            width: 40, height: 40, borderRadius: 10, background: C.light,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Hand size={22} color={C.blue} strokeWidth={2.2} />
        </div>
        <span style={{ fontSize: 26, fontWeight: 700 }}>Signify</span>
      </div>

      {TABS.map(([id, label, Icon]) => (
        <button key={id} className={`nav-item${tab === id ? " active" : ""}`} onClick={() => setTab(id)}>
          <Icon size={20} strokeWidth={2.2} />
          {label}
        </button>
      ))}

      <div
        style={{
          marginTop: "auto", background: "rgba(255,255,255,0.12)", borderRadius: 12,
          padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Flame size={18} color={C.rose} fill={C.rose} />
          <span><strong>{currentStreak(p)}</strong> day streak</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Zap size={18} color={C.light} fill={C.light} />
          <span><strong>{p.xp}</strong> XP · Level {level}</span>
        </div>
        {who && <div style={{ fontWeight: 600, color: C.light }}>{who}</div>}
      </div>
    </nav>
  );
}

function Hero({ p }) {
  const next = LESSONS.find((l) => !p.completed.includes(l.id));
  if (!next) {
    return (
      <div style={{ background: C.blue, color: "#fff", borderRadius: 16, padding: 28, marginBottom: 28 }}>
        <div style={{ fontWeight: 600, color: C.light }}>All done</div>
        <div style={{ fontSize: 28, fontWeight: 700, margin: "4px 0 18px" }}>You finished every lesson.</div>
        <button
          className="lift"
          style={{ ...primaryBtn, background: C.light, color: C.ink }}
          onClick={() => (window.location.hash = "#certificate")}
        >
          View certificate
        </button>
      </div>
    );
  }
  const preview = (
    next.letters || (next.words ? next.words[0] : next.sentences[0].split(" ")[0]).split("")
  ).slice(0, 5);

  return (
    <div style={{ background: C.blue, color: "#fff", borderRadius: 16, padding: 28, marginBottom: 28 }}>
      <div style={{ fontWeight: 600, color: C.light }}>Continue learning</div>
      <div style={{ fontSize: 34, fontWeight: 700, margin: "4px 0" }}>{next.title}</div>
      <div style={{ opacity: 0.9, marginBottom: 20 }}>
        Lesson {next.id} of {LESSONS.length} · {PATHWAYS.find((x) => x.id === next.pathway).title}
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        {preview.map((c, k) => (
          <HandTile key={k} letter={c} size={88} bg="#fff" />
        ))}
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
  );
}

function WordOfTheDay() {
  const word = wordOfTheDay();
  return (
    <div style={{ background: C.tint, borderRadius: 14, padding: "22px 24px", marginBottom: 36 }}>
      <div style={{ fontWeight: 600, color: C.blue }}>Word of the day</div>
      <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: 6, margin: "2px 0 16px" }}>{word}</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {word.split("").map((c, k) => (
          <HandTile key={k} letter={c} size={92} bg="#fff" />
        ))}
      </div>
      <p style={{ margin: "14px 0 0", fontSize: 15 }}>Fingerspell it one letter at a time.</p>
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
        <path d={curve(pts)} fill="none" stroke="#C5D3E0" strokeWidth="6" strokeLinecap="round" strokeDasharray="1 14" />
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
                aria-label={`${l.title}${done ? ", completed" : locked ? ", locked" : ", next lesson"}`}
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
                  background: "#fff", border: `2px solid ${info.color}`, borderRadius: 12,
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
          background: info.color, color: info.fg, borderRadius: "14px 14px 0 0",
          padding: "20px 24px", display: "flex", alignItems: "center", gap: 16,
        }}
      >
        <div
          style={{
            width: 48, height: 48, borderRadius: 12, background: "rgba(255,255,255,0.22)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}
        >
          <Icon size={26} strokeWidth={2.2} />
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 24 }}>{path.title}</h2>
          <div>{info.desc}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.1 }}>
            {finished}/{lessons.length}
          </div>
          <div style={{ fontSize: 14 }}>lessons</div>
        </div>
      </div>
      <div
        style={{
          background: info.tint, borderRadius: "0 0 14px 14px", padding: "28px 12px 12px",
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
  return (
    <aside
      style={{
        width: 300, flexShrink: 0, position: "sticky", top: 36,
        display: "flex", flexDirection: "column", gap: 16,
      }}
    >
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, marginBottom: 16 }}>
          <Target size={20} color={C.blue} />
          Daily goal
        </div>
        <Ring value={today / DAILY_GOAL} color={C.sage} track={C.tint}>
          <div style={{ fontSize: 34, fontWeight: 700, lineHeight: 1 }}>{Math.min(today, DAILY_GOAL)}</div>
          <div style={{ fontSize: 14, color: C.muted }}>of {DAILY_GOAL} XP</div>
        </Ring>
        <div style={{ textAlign: "center", marginTop: 14, fontWeight: 600 }}>
          {today >= DAILY_GOAL ? "Goal reached for today." : `${DAILY_GOAL - today} XP to go`}
        </div>
      </div>

      <div style={{ ...card, background: C.roseTint, border: `1px solid ${C.rose}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 52, height: 52, borderRadius: "50%", background: C.rose,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Flame size={28} color={C.ink} fill={C.ink} />
          </div>
          <div>
            <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{streak}</div>
            <div style={{ fontWeight: 600 }}>day streak</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16 }} aria-hidden="true">
          {Array.from({ length: 7 }, (_, k) => (
            <div
              key={k}
              style={{
                flex: 1, height: 10, borderRadius: 5,
                background: k < Math.min(streak, 7) ? C.rose : "#fff",
                border: `1px solid ${C.rose}`,
              }}
            />
          ))}
        </div>
      </div>

      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, marginBottom: 12 }}>
          <Zap size={20} color={C.blue} fill={C.blue} />
          Level {level}
        </div>
        <Bar value={into / XP_PER_LEVEL} color={C.blue} />
        <div style={{ marginTop: 10, color: C.muted, fontSize: 15 }}>
          {XP_PER_LEVEL - into} XP to level {level + 1} · {p.xp} XP total
        </div>
      </div>
    </aside>
  );
}

function StatTile({ icon: Icon, color, fg, tint, value, label }) {
  return (
    <div style={{ background: tint, borderRadius: 14, padding: 20 }}>
      <div
        style={{
          width: 44, height: 44, borderRadius: 12, background: color,
          display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12,
        }}
      >
        <Icon size={24} color={fg} strokeWidth={2.2} />
      </div>
      <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.1 }}>{value}</div>
      <div style={{ color: C.muted, fontWeight: 500 }}>{label}</div>
    </div>
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
      <h1 style={{ fontSize: 30, margin: "0 0 20px" }}>Your progress</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 28 }}>
        <StatTile icon={Flame} color={C.rose} fg={C.ink} tint={C.roseTint} value={currentStreak(p)} label="day streak" />
        <StatTile icon={Zap} color={C.blue} fg="#fff" tint={C.blueTint} value={p.xp} label={`XP · Level ${level}`} />
        <StatTile icon={Check} color={C.sage} fg={C.ink} tint={C.sageTint} value={`${p.completed.length}/${LESSONS.length}`} label="lessons finished" />
        <StatTile icon={Target} color={C.light} fg={C.ink} tint={C.tint} value={p.perfect} label="lessons with no hints" />
      </div>

      <div style={{ ...card, marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, margin: "0 0 16px" }}>Pathways</h2>
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
        <h2 style={{ fontSize: 20, margin: "0 0 16px" }}>Letters you've learned</h2>
        {learned.length === 0 ? (
          <p style={{ margin: 0, color: C.muted }}>Finish your first lesson and your letters show up here.</p>
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
        {got} of {BADGES.length} earned
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
        {BADGES.map((b) => {
          const earned = b.test(p);
          return (
            <div
              key={b.id}
              style={{
                ...card, textAlign: "center", padding: "24px 16px",
                background: earned ? "#fff" : C.bg,
                border: `1px solid ${earned ? b.color : C.line}`,
              }}
            >
              <BadgeShape badge={b} earned={earned} />
              <div style={{ fontWeight: 700, fontSize: 18, margin: "14px 0 4px" }}>{b.name}</div>
              <div style={{ color: C.muted, fontSize: 15 }}>
                {earned ? "Earned" : b.how}
              </div>
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
        <div
          style={{
            width: 56, height: 56, borderRadius: 14, background: all ? C.sage : C.tint,
            display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16,
          }}
        >
          <ScrollText size={28} color={C.ink} />
        </div>
        {all ? (
          <>
            <p style={{ fontSize: 18, marginTop: 0 }}>You finished every lesson. Your certificate is ready.</p>
            <button className="lift" style={primaryBtn} onClick={() => (window.location.hash = "#certificate")}>
              View certificate
            </button>
          </>
        ) : (
          <>
            <p style={{ fontSize: 18, marginTop: 0 }}>Finish all {LESSONS.length} lessons to unlock your certificate.</p>
            <Bar value={finished / LESSONS.length} color={C.sage} height={12} />
            <p style={{ color: C.muted, marginBottom: 0 }}>{finished} of {LESSONS.length} done</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [tab, setTab] = useState("learn");
  const p = loadProgress();
  const who = savedName();
  const next = LESSONS.find((l) => !p.completed.includes(l.id));

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg }}>
      <Sidebar tab={tab} setTab={setTab} p={p} who={who} />
      <main style={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "center", padding: "36px 40px" }}>
        <div style={{ display: "flex", gap: 32, width: "100%", maxWidth: 1120, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 520px", minWidth: 0 }}>
            {tab === "learn" && (
              <>
                <h1 style={{ fontSize: 32, margin: 0 }}>
                  {greeting()}
                  {who ? `, ${who}` : ""}
                </h1>
                <p style={{ margin: "4px 0 24px", color: C.blue, fontWeight: 500 }}>
                  {next ? `You're on lesson ${next.id}: ${next.title}.` : "You've finished every lesson."}
                </p>
                <Hero p={p} />
                <WordOfTheDay />
                {PATHWAYS.map((path) => (
                  <PathwaySection key={path.id} path={path} p={p} />
                ))}
              </>
            )}
            {tab === "progress" && <ProgressTab p={p} />}
            {tab === "badges" && <BadgesTab p={p} />}
            {tab === "certificate" && <CertificateTab p={p} />}
          </div>
          {tab === "learn" && <Rail p={p} />}
        </div>
      </main>
    </div>
  );
}