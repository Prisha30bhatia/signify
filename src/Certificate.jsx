import { useState } from "react";
import { LESSONS } from "./lessons";
import { loadProgress } from "./progress";
import { shareMessage } from "./share";

const NAME_KEY = "signify-name";

function savedName() {
  try {
    return localStorage.getItem(NAME_KEY) || "";
  } catch {
    return "";
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
const quiet = {
  ...primary,
  background: "transparent",
  color: "#3D5A80",
  border: "2px solid #3D5A80",
};

export default function Certificate({ preview = false }) {
  const p = loadProgress();
  const unlocked = preview || LESSONS.every((l) => p.completed.includes(l.id));
  const [name, setName] = useState(savedName);
  const [msg, setMsg] = useState("");

  function onName(e) {
    setName(e.target.value);
    try {
      localStorage.setItem(NAME_KEY, e.target.value);
    } catch {
      // ignore
    }
  }

  if (!unlocked) {
    return (
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "96px 24px", textAlign: "center" }}>
        <h1 style={{ fontSize: 28 }}>Certificate locked</h1>
        <p>Finish all {LESSONS.length} lessons to earn your certificate.</p>
        <button style={primary} onClick={() => (window.location.hash = "#home")}>
          Back to lessons
        </button>
      </div>
    );
  }

  const date = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "32px 24px" }}>
      <div className="no-print" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 24 }}>
        <button style={quiet} onClick={() => (window.location.hash = "#home")}>
          Back
        </button>
        <label style={{ fontWeight: 600 }}>
          Your name{" "}
          <input
            value={name}
            onChange={onName}
            maxLength={40}
            placeholder="Type your name"
            style={{
              marginLeft: 8,
              padding: "10px 12px",
              fontSize: 16,
              fontFamily: "inherit",
              border: "2px solid #3D5A80",
              borderRadius: 8,
            }}
          />
        </label>
        <button style={primary} onClick={() => window.print()}>
          Print or save as PDF
        </button>
        <button
          style={quiet}
          onClick={async () =>
            setMsg(
              await shareMessage(
                `I finished every lesson in Signify and learned the ASL fingerspelling alphabet! Try it: ${window.location.origin}`
              )
            )
          }
        >
          Share
        </button>
      </div>
      <p className="no-print" style={{ minHeight: 24, color: "#3D5A80" }}>{msg}</p>

      <div
        style={{
          background: "#fff",
          border: "3px solid #3D5A80",
          outline: "1px solid #98C1D9",
          outlineOffset: -10,
          padding: "64px 48px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 700, color: "#3D5A80" }}>Signify</div>
        <h1 style={{ fontSize: 40, margin: "24px 0 8px" }}>Certificate of Completion</h1>
        <p style={{ fontSize: 18, margin: 0 }}>This certifies that</p>
        <div
          style={{
            fontSize: 40,
            fontWeight: 700,
            color: "#3D5A80",
            margin: "20px auto",
            minHeight: 56,
            maxWidth: 520,
            borderBottom: "2px solid #98C1D9",
          }}
        >
          {name || "\u00A0"}
        </div>
        <p style={{ fontSize: 18, maxWidth: 520, margin: "0 auto" }}>
          completed all {LESSONS.length} Signify lessons, learning the ASL fingerspelling alphabet,
          words, and phrases.
        </p>
        <p style={{ marginTop: 40, color: "#3D5A80" }}>{date}</p>
      </div>
    </div>
  );
}