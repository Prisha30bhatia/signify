import { useEffect, useMemo, useRef, useState } from "react";
import { useHandSign } from "./useHandSign";
import { useHold } from "./useHold";
import { matches } from "./signMatch";
import { LESSONS, TIPS } from "./lessons";
import { completeLesson } from "./progress";

function shuffle(a) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

function buildSteps(lesson) {
  if (lesson.kind === "words") {
    return lesson.words.map((w) => ({ type: "spell", word: w }));
  }
  if (lesson.kind === "sentences") {
    return lesson.sentences.flatMap((s) =>
      s.split(" ").map((w, idx) => ({
        type: "spell",
        word: w,
        sentence: s,
        wordIndex: idx,
      }))
    );
  }
  const teach = lesson.letters.map((l) => ({ type: "teach", letter: l }));
  const recall = shuffle(lesson.letters).map((l) => ({ type: "recall", letter: l }));
  return [...teach, ...recall];
}

const primary = {
  padding: "14px 28px",
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
  padding: "10px 18px",
  fontSize: 15,
  fontFamily: "inherit",
  fontWeight: 500,
  border: "2px solid #3D5A80",
  borderRadius: 8,
  background: "transparent",
  color: "#3D5A80",
  cursor: "pointer",
};

function exit() {
  window.location.hash = "#home";
}

export default function Lesson({ id }) {
  const lesson = LESSONS.find((l) => l.id === id);
  const steps = useMemo(() => buildSteps(lesson), [lesson]);
  const { videoRef, canvasRef, status, letter } = useHandSign();

  const [i, setI] = useState(0);
  const [pos, setPos] = useState(0);
  const [passed, setPassed] = useState(false);
  const [hint, setHint] = useState(false);
  const [xp, setXp] = useState(0);
  const timer = useRef(null);
  const saved = useRef(false); const hints = useRef(0);

  useEffect(() => () => clearTimeout(timer.current), []);

  const done = i >= steps.length;
  const step = steps[i];
  const target = done ? "" : step.type === "spell" ? step.word[pos] : step.letter;
  const isMatching = !done && !passed && matches(target, letter);
  const holding = useHold(isMatching, onPass, 1000);

  function onPass() {
    setPassed(true);
    setXp((x) => x + (step.type === "recall" && hint ? 5 : step.type === "teach" ? 5 : 10));
    timer.current = setTimeout(() => {
      setPassed(false);
      setHint(false);
      if (step.type === "spell" && pos < step.word.length - 1) {
        setPos((p) => p + 1);
      } else {
        setPos(0);
        setI((n) => n + 1);
      }
    }, 900);
  }

  useEffect(() => {
    if (done && !saved.current) {
      saved.current = true;
      completeLesson(lesson.id, xp, hints.current === 0);
    }
  }, [done, lesson.id, xp]);

  if (done) {
    return (
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "96px 24px", textAlign: "center" }}>
        <h1 style={{ fontSize: 32, margin: 0 }}>Lesson complete</h1>
        <p style={{ fontSize: 18, marginTop: 12 }}>{lesson.title}</p>
        <p style={{ fontSize: 40, fontWeight: 700, color: "#3D5A80", margin: "24px 0" }}>
          +{xp} XP
        </p>
        <button style={primary} onClick={exit}>
          Back to lessons
        </button>
      </div>
    );
  }

  const showImage = step.type === "teach" || step.type === "spell" || hint;
  const label = step.type === "teach" ? "Learn" : step.type === "recall" ? "Recall" : "Spell";

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "24px 32px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 32 }}>
        <button style={quiet} onClick={exit}>
          Exit
        </button>
        <div style={{ flex: 1, height: 12, borderRadius: 6, background: "#E8F0F6" }}>
          <div
            style={{
              width: `${(i / steps.length) * 100}%`,
              height: "100%",
              borderRadius: 6,
              background: "#98C1D9",
              transition: "width 0.3s",
            }}
          />
        </div>
        <span style={{ fontWeight: 600, color: "#3D5A80" }}>{xp} XP</span>
      </div>

      <div style={{ display: "flex", gap: 48, flexWrap: "wrap" }}>
        <div>
          <div
            style={{
              position: "relative",
              width: 560,
              maxWidth: "100%",
              transform: "scaleX(-1)",
              background: "#293241",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <video
              ref={videoRef}
              playsInline
              muted
              style={{ width: "100%", display: "block" }}
            />
            <canvas
              ref={canvasRef}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
            />
          </div>
          <p style={{ marginTop: 12, color: "#3D5A80", fontWeight: 500 }}>
            {status === "loading" && "Starting the camera..."}
            {status === "error" && "Camera problem. Allow camera access and refresh."}
            {status === "ready" && "Your video stays on your device."}
          </p>
        </div>

        <div style={{ flex: 1, minWidth: 260 }}>
          <p style={{ margin: 0, fontWeight: 600, color: "#3D5A80" }}>{label}</p>
          {step.sentence && (
  <p style={{ margin: "0 0 4px", fontSize: 18 }}>
    {step.sentence.split(" ").map((w, k) => (
      <span
        key={k}
        style={{
          marginRight: 12,
          fontWeight: k === step.wordIndex ? 700 : 400,
          color: k < step.wordIndex ? "#8DB580" : "#293241",
        }}
      >
        {w}
      </span>
    ))}
  </p>
)}

          {step.type === "spell" ? (
            <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: 8, margin: "8px 0 16px" }}>
              {step.word.split("").map((c, k) => (
                <span
                  key={k}
                  style={{
                    color: k < pos ? "#8DB580" : k === pos ? "#3D5A80" : "#98C1D9",
                    borderBottom: k === pos ? "4px solid #3D5A80" : "4px solid transparent",
                  }}
                >
                  {c}
                </span>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 96, fontWeight: 700, lineHeight: 1.1, color: "#3D5A80" }}>
              {target}
            </div>
          )}

          {showImage && (
            <img
              src={`/signs/${target.toLowerCase()}.png`}
              alt={`ASL handshape for the letter ${target}`}
              style={{ width: 220, display: "block", marginBottom: 12 }}
            />
          )}

          {step.type === "teach" && <p style={{ maxWidth: 340 }}>{TIPS[target]}</p>}
          {step.type === "recall" && !hint && (
            <button style={{ ...quiet, marginBottom: 16 }} onClick={() => {
        hints.current += 1;
        setHint(true);
}}>
              Show hint
            </button>
          )}
          {step.type === "recall" && hint && TIPS[target] && (
            <p style={{ maxWidth: 340 }}>{TIPS[target]}</p>
          )}

          <div style={{ height: 14, borderRadius: 7, background: "#E8F0F6", overflow: "hidden", maxWidth: 340 }}>
            <div
              style={{
                height: "100%",
                width: holding || passed ? "100%" : "0%",
                background: passed ? "#8DB580" : "#98C1D9",
                transition: holding && !passed ? "width 1s linear" : "none",
              }}
            />
          </div>
          <p style={{ fontWeight: 600, minHeight: 28 }}>
            {passed ? "Nice work!" : isMatching ? "Hold it..." : `Sign the letter ${target}`}
          </p>
        </div>
      </div>
    </div>
  );
}