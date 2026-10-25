import { useEffect, useState } from "react";
import { Camera, ShieldCheck, BookOpen, ArrowRight } from "lucide-react";
import { C } from "./theme";

const WORD = "SIGNIFY".split("");
const TILE_BG = [C.light, C.sage, C.rose, C.tint, C.light, C.sage, C.rose];

export default function Intro() {
  const [active, setActive] = useState(0);
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem("signify-name") || "";
    } catch {
      return "";
    }
  });

  useEffect(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % (WORD.length + 2)), 700);
    return () => clearInterval(t);
  }, []);

  function start() {
    try {
      if (name.trim()) localStorage.setItem("signify-name", name.trim());
    } catch {
      // ignore
    }
    window.location.hash = "#home";
  }

  const facts = [
    [Camera, "Works with your webcam"],
    [ShieldCheck, "Your video stays on your device"],
    [BookOpen, "15 lessons to help you go from letters to phrases"],
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.tint,
        display: "flex",
        flexDirection: "column",
        textAlign: "center",
      }}
    >
      {/* Top of the page */}
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          justifyContent: "center",
          padding: "40px 24px 0",
        }}
      >
        {WORD.map((c, k) => (
          <div
            key={k}
            style={{
              width: 112,
              height: 128,
              background: TILE_BG[k],
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: k < active ? 1 : 0.25,
              transition: "opacity 0.4s",
            }}
          >
            <img src={`/signs/${c.toLowerCase()}.png`} alt="" style={{ width: 100 }} />
          </div>
        ))}
      </div>

      {/* Middle of the page */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <h1 style={{ fontSize: 60, margin: "0 0 8px", color: C.blue }}>Signify</h1>
        <p style={{ fontSize: 20, margin: "0 0 28px", maxWidth: 440 }}>
          Learn ASL with your webcam, one sign at a time.
        </p>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={30}
          placeholder="What should we call you?"
          aria-label="Your name"
          style={{
            padding: "14px 16px",
            fontSize: 16,
            fontFamily: "inherit",
            border: `2px solid ${C.light}`,
            borderRadius: 4,
            marginBottom: 16,
            width: 300,
            textAlign: "center",
          }}
        />
        <button
          className="lift"
          onClick={start}
          style={{
            padding: "16px 36px",
            fontSize: 18,
            fontFamily: "inherit",
            fontWeight: 600,
            border: 0,
            borderRadius: 4,
            background: C.blue,
            color: "#fff",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          Get started
          <ArrowRight size={20} />
        </button>
      </div>

      {/* Bottom of the page */}
      <div style={{ padding: "0 24px 24px" }}>
        <div
          style={{
            display: "flex",
            gap: 28,
            flexWrap: "wrap",
            justifyContent: "center",
            marginBottom: 20,
          }}
        >
          {facts.map(([Icon, text]) => (
            <div
              key={text}
              style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 600, color: C.blue }}
            >
              <Icon size={20} />
              {text}
            </div>
          ))}
        </div>
        <p style={{ margin: 0, fontSize: 13, color: C.muted }}>
          Hand images from the ASL alphabet chart by the American Society for Deaf Children.
        </p>
      </div>
    </div>
  );
}