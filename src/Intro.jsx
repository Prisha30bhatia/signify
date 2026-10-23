import { useEffect, useState } from "react";

const WORD = "SIGNIFY".split("");

export default function Intro() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % (WORD.length + 2)), 700);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px 24px",
        textAlign: "center",
      }}
    >
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
        {WORD.map((c, k) => (
          <img
            key={k}
            src={`/signs/${c.toLowerCase()}.png`}
            alt=""
            style={{
              width: 112,
              opacity: k < active ? 1 : 0.15,
              transition: "opacity 0.4s",
            }}
          />
        ))}
      </div>

      <h1 style={{ fontSize: 56, margin: "32px 0 8px", color: "#3D5A80" }}>Signify</h1>
      <p style={{ fontSize: 20, margin: "0 0 32px", maxWidth: 420 }}>
        Learn ASL with your webcam, one sign at a time.
      </p>
      <button
        onClick={() => (window.location.hash = "#home")}
        style={{
          padding: "16px 40px",
          fontSize: 18,
          fontFamily: "inherit",
          fontWeight: 600,
          border: 0,
          borderRadius: 8,
          background: "#3D5A80",
          color: "#fff",
          cursor: "pointer",
        }}
      >
        Get started
      </button>
      <p style={{ marginTop: 16, color: "#3D5A80" }}>Your video never leaves your device.</p>

      <p style={{ marginTop: "auto", paddingTop: 48, fontSize: 13, color: "#5B6575" }}>
        Hand images from the ASL alphabet chart by the American Society for Deaf Children.
      </p>
    </div>
  );
}