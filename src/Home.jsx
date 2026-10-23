import { useState } from "react";
import { LESSONS, PATHWAYS } from "./lessons";
import { loadProgress, currentStreak, xpToday } from "./progress";

const DAILY_GOAL = 30;
const XP_PER_LEVEL = 100;
const OFFSETS = [0, 48, 72, 48, 0, -48, -72, -48];

const inPathway = (p, path) =>
  LESSONS.filter((l) => l.pathway === path).every((l) => p.completed.includes(l.id));

export const BADGES = [
  { id: "first", name: "First Sign", how: "Finish your first lesson", test: (p) => p.completed.length >= 1 },
  { id: "alphabet", name: "Alphabet Done", how: "Finish all letter lessons", test: (p) => inPathway(p, "letters") },
  {
    id: "word",
    name: "First Word",
    how: "Finish a word lesson",
    test: (p) => LESSONS.some((l) => l.pathway === "words" && p.completed.includes(l.id)),
  },
  { id: "streak", name: "3-Day Streak", how: "Practice 3 days in a row", test: (p) => p.bestStreak >= 3 },
  { id: "perfect", name: "No Hints Needed", how: "Finish a lesson without hints", test: (p) => p.perfect >= 1 },
  { id: "grad", name: "Signify Graduate", how: "Finish every lesson", test: (p) => LESSONS.every((l) => p.completed.includes(l.id)) },
];

async function shareProgress(p) {
  const text = `I've finished ${p.completed.length} of ${LESSONS.length} lessons in Signify and earned ${p.xp} XP. Learn ASL with your webcam: ${window.location.origin}`;
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return "Shared!";
    } catch {
      return "";
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return "Copied to your clipboard!";
  } catch {
    return "Couldn't copy. Try again.";
  }
}

const primary = {
  padding: "12px 24px",
  fontSize: 16,
  fontFamily: "inherit",
  fontWeight: 600,
  border: 0,
  borderRadius: 8,
  background: "#3D5A80",
  color: "#fff",
  cursor: "pointer",
};

function Bar({ value, color = "#98C1D9" }) {
  return (
    <div style={{ height: 10, borderRadius: 5, background: "#E8F0F6", overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.min(100, value * 100)}%`, background: color }} />
    </div>
  );
}

function Path({ p }) {
  const current = LESSONS.find((l) => !p.completed.includes(l.id));
  return (
    <div>
      {PATHWAYS.map((path) => (
        <section key={path.id} style={{ marginBottom: 56 }}>
          <h2 style={{ fontSize: 22, margin: "0 0 4px" }}>{path.title}</h2>
          <p style={{ margin: "0 0 24px", color: "#3D5A80" }}>
            {path.id === "letters" && "Learn the fingerspelling alphabet, A to Z."}
            {path.id === "words" && "Fingerspell your first words."}
            {path.id === "sentences" && "Put words together into phrases."}
          </p>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
            {LESSONS.filter((l) => l.pathway === path.id).map((l, k) => {
              const done = p.completed.includes(l.id);
              const isCurrent = current && current.id === l.id;
              const locked = !done && !isCurrent;
              return (
                <div
                  key={l.id}
                  style={{ transform: `translateX(${OFFSETS[k % OFFSETS.length]}px)`, textAlign: "center" }}
                >
                  <button
                    disabled={locked}
                    onClick={() => (window.location.hash = `#lesson/${l.id}`)}
                    aria-label={`${l.title}${done ? ", completed" : locked ? ", locked" : ""}`}
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: "50%",
                      border: 0,
                      fontSize: 22,
                      fontWeight: 700,
                      fontFamily: "inherit",
                      background: done ? "#8DB580" : isCurrent ? "#3D5A80" : "#E8F0F6",
                      color: done ? "#293241" : isCurrent ? "#fff" : "#5B6575",
                      cursor: locked ? "default" : "pointer",
                      boxShadow: isCurrent ? "0 0 0 6px #98C1D9" : "none",
                    }}
                  >
                    {done ? "✓" : l.id}
                  </button>
                  <div style={{ marginTop: 8, fontWeight: 600, color: locked ? "#5B6575" : "#293241" }}>
                    {l.title}
                  </div>
                  {isCurrent && (
                    <button
                      style={{ ...primary, marginTop: 10 }}
                      onClick={() => (window.location.hash = `#lesson/${l.id}`)}
                    >
                      Start Lesson
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function ProgressTab({ p }) {
  const [msg, setMsg] = useState("");
  const level = Math.floor(p.xp / XP_PER_LEVEL) + 1;
  const into = p.xp % XP_PER_LEVEL;
  return (
    <div style={{ maxWidth: 480 }}>
      <h2 style={{ fontSize: 22, marginTop: 0 }}>Your progress</h2>
      <p style={{ fontSize: 18 }}>
        Level <strong>{level}</strong> · {p.xp} XP total
      </p>
      <Bar value={into / XP_PER_LEVEL} />
      <p style={{ color: "#3D5A80" }}>{XP_PER_LEVEL - into} XP to level {level + 1}</p>
      <p>
        Lessons finished: <strong>{p.completed.length} of {LESSONS.length}</strong>
      </p>
      <Bar value={p.completed.length / LESSONS.length} color="#8DB580" />
      <p style={{ marginTop: 24 }}>
        Current streak: <strong>{currentStreak(p)} days</strong> · Best: <strong>{p.bestStreak} days</strong>
      </p>
      <button style={{ ...primary, marginTop: 16 }} onClick={async () => setMsg(await shareProgress(p))}>
        Share my progress
      </button>
      <p style={{ minHeight: 24, color: "#3D5A80" }}>{msg}</p>
    </div>
  );
}

function BadgesTab({ p }) {
  return (
    <div>
      <h2 style={{ fontSize: 22, marginTop: 0 }}>Badges</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20, maxWidth: 760 }}>
        {BADGES.map((b) => {
          const got = b.test(p);
          return (
            <div
              key={b.id}
              style={{
                padding: "12px 0 12px 16px",
                borderLeft: `6px solid ${got ? "#8DB580" : "#E8F0F6"}`,
                opacity: got ? 1 : 0.75,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 18 }}>{b.name}</div>
              <div style={{ color: "#3D5A80" }}>{got ? "Earned" : b.how}</div>
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
    <div style={{ maxWidth: 480 }}>
      <h2 style={{ fontSize: 22, marginTop: 0 }}>Certificate</h2>
      {all ? (
        <>
          <p>You finished every lesson. Your certificate is ready.</p>
          <button style={primary} onClick={() => (window.location.hash = "#certificate")}>
            View certificate
          </button>
        </>
      ) : (
        <>
          <p>Finish all {LESSONS.length} lessons to unlock your certificate.</p>
          <Bar value={finished / LESSONS.length} color="#8DB580" />
          <p style={{ color: "#3D5A80" }}>
            {finished} of {LESSONS.length} done
          </p>
        </>
      )}
    </div>
  );
}
export default function Home() {
  const [tab, setTab] = useState("learn");
  const p = loadProgress();
  const level = Math.floor(p.xp / XP_PER_LEVEL) + 1;
  const today = xpToday(p);

  const tabs = [
    ["learn", "Learn"],
    ["progress", "Progress"],
    ["badges", "Badges"],
    ["certificate", "Certificate"],
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <nav style={{ width: 220, padding: "32px 20px", background: "#E8F0F6", flexShrink: 0 }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: "#3D5A80", marginBottom: 32 }}>Signify</div>
        {tabs.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "12px 14px",
              marginBottom: 4,
              fontSize: 16,
              fontFamily: "inherit",
              fontWeight: tab === id ? 700 : 500,
              border: 0,
              borderRadius: 8,
              background: tab === id ? "#3D5A80" : "transparent",
              color: tab === id ? "#fff" : "#293241",
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      <main style={{ flex: 1, padding: "32px 48px", maxWidth: 900 }}>
        <div style={{ display: "flex", gap: 48, flexWrap: "wrap", marginBottom: 40, alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{currentStreak(p)}</div>
            <div style={{ color: "#3D5A80" }}>day streak</div>
          </div>
          <div style={{ minWidth: 200 }}>
            <div style={{ marginBottom: 6 }}>
              <strong>{Math.min(today, DAILY_GOAL)}</strong> / {DAILY_GOAL} XP today
            </div>
            <Bar value={today / DAILY_GOAL} color="#8DB580" />
          </div>
          <div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>Level {level}</div>
            <div style={{ color: "#3D5A80" }}>{p.xp} XP</div>
          </div>
        </div>

        {tab === "learn" && <Path p={p} />}
        {tab === "progress" && <ProgressTab p={p} />}
        {tab === "badges" && <BadgesTab p={p} />}
        {tab === "certificate" && <CertificateTab p={p} />}
      </main>
    </div>
  );
}