import { useEffect, useMemo, useRef, useState } from "react";
import { useHandSign } from "./useHandSign";
import { useHold } from "./useHold";
import { matches } from "./signMatch";
import { LESSONS, TIPS } from "./lessons";
import { completeLesson } from "./progress";
import { shareMessage } from "./share";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const PASS = [
  (t) => `Clean ${t}.`,
  () => "That's it.",
  (t) => `${t}, got it.`,
  () => "Looks right to me.",
  () => "Solid.",
];

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
  const L = lesson.letters;
  return [
    ...L.map((letter) => ({ type: "teach", letter })),
    ...shuffle(L).map((letter) => ({ type: "quiz", letter })),
    ...shuffle(L).map((letter) => ({ type: "recall", letter })),
    ...(lesson.useIt ? [{ type: "spell", word: lesson.useIt, useIt: true }] : []),
  ];
}

// Four choices: the right letter, other letters from this lesson first,
// then random ones to fill in.
function quizOptions(letter, group) {
  const near = shuffle(group.filter((l) => l !== letter));
  const rest = shuffle(ALPHABET.filter((l) => l !== letter && !group.includes(l)));
  return shuffle([letter, ...[...near, ...rest].slice(0, 3)]);
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

function SignTile({ letter, size, alt }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        background: "#E8F0F6",
        borderRadius: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
      }}
    >
      <img
        src={`/signs/${letter.toLowerCase()}.png`}
        alt={alt || `ASL handshape for the letter ${letter}`}
        style={{ width: size * 0.85 }}
      />
    </div>
  );
}

export default function Lesson({ id }) {
  const lesson = LESSONS.find((l) => l.id === id);
  const { videoRef, canvasRef, status, letter } = useHandSign();

  const [steps, setSteps] = useState(() => buildSteps(lesson));
  const [i, setI] = useState(0);
  const [pos, setPos] = useState(0);
  const [passed, setPassed] = useState(false);
  const [hint, setHint] = useState(false);
  const [coach, setCoach] = useState(false);
  const [wrongPicks, setWrongPicks] = useState([]);
  const [xp, setXp] = useState(0);
  const [scored, setScored] = useState(0);
  const [clean, setClean] = useState(0);
  const [missed, setMissed] = useState([]);
  const [reviewing, setReviewing] = useState(false);
  const [shareMsg, setShareMsg] = useState("");

  const timer = useRef(null);
  const saved = useRef(false);
  const helped = useRef(false);
  const requeued = useRef(new Set());

  useEffect(() => () => clearTimeout(timer.current), []);

  const done = i >= steps.length;
  const step = done ? null : steps[i];
  const isQuiz = !done && step.type === "quiz";
  const camStep = !done && !isQuiz;
  const target = done ? "" : step.type === "spell" ? step.word[pos] : step.letter;

  const options = useMemo(
    () => (step && step.type === "quiz" ? quizOptions(step.letter, lesson.letters || []) : []),
    [step, lesson]
  );

  const isMatching = camStep && !passed && matches(target, letter);
  const holding = useHold(isMatching, onPass, 1000);

  // If someone holds the wrong sign for about 4 seconds, show the tip.
  const wrongNow =
    camStep && step.type !== "teach" && !passed && letter !== "" && !matches(target, letter);
  useEffect(() => {
    if (!wrongNow) return;
    const t = setTimeout(() => {
      setCoach(true);
      helped.current = true;
    }, 4000);
    return () => clearTimeout(t);
  }, [wrongNow, i, pos]);

  function noteMiss(l) {
    setMissed((m) => (m.includes(l) ? m : [...m, l]));
    if (lesson.kind === "letters" && !reviewing && !requeued.current.has(l)) {
      requeued.current.add(l);
      setSteps((s) => [...s, { type: "recall", letter: l }]);
    }
  }

  function advance(delay) {
    timer.current = setTimeout(() => {
      setPassed(false);
      setHint(false);
      setCoach(false);
      setWrongPicks([]);
      helped.current = false;
      if (step.type === "spell" && pos < step.word.length - 1) {
        setPos((p) => p + 1);
      } else {
        setPos(0);
        setI((n) => n + 1);
      }
    }, delay);
  }

  function onPass() {
    setPassed(true);
    const helpedNow = helped.current || hint;
    if (step.type !== "teach") {
      setScored((s) => s + 1);
      if (!helpedNow) setClean((c) => c + 1);
      if (helpedNow) noteMiss(target);
    }
    const gain = reviewing ? 0 : step.type === "teach" ? 5 : helpedNow ? 5 : 10;
    setXp((x) => x + gain);
    advance(900);
  }

  function pickAnswer(c) {
    if (passed) return;
    if (c === step.letter) {
      const first = wrongPicks.length === 0;
      setPassed(true);
      setScored((s) => s + 1);
      if (first) setClean((n) => n + 1);
      else noteMiss(step.letter);
      setXp((x) => x + (reviewing ? 0 : first ? 10 : 5));
      advance(700);
    } else {
      setWrongPicks((w) => [...w, c]);
    }
  }

  function startReview() {
    clearTimeout(timer.current);
    setSteps(missed.map((l) => ({ type: "recall", letter: l })));
    setI(0);
    setPos(0);
    setPassed(false);
    setHint(false);
    setCoach(false);
    helped.current = false;
    setMissed([]);
    setScored(0);
    setClean(0);
    setReviewing(true);
  }

  useEffect(() => {
    if (done && !saved.current) {
      saved.current = true;
      completeLesson(lesson.id, xp, scored === clean);
    }
  }, [done, lesson.id, xp, scored, clean]);

  if (done) {
    return (
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
        <h1 style={{ fontSize: 32, margin: 0 }}>{reviewing ? "Review done" : "Lesson complete"}</h1>
        <p style={{ fontSize: 18, marginTop: 12 }}>{lesson.title}</p>
        {!reviewing && (
          <p style={{ fontSize: 40, fontWeight: 700, color: "#3D5A80", margin: "24px 0 8px" }}>
            +{xp} XP
          </p>
        )}
        <p style={{ fontSize: 18, margin: "16px 0" }}>
          {scored > 0
            ? `${clean} of ${scored} signs without any help`
            : "No scored signs this time"}
        </p>
        {missed.length > 0 ? (
          <p style={{ fontSize: 18 }}>
            Worth another look: <strong>{missed.join(", ")}</strong>
          </p>
        ) : (
          scored > 0 && <p style={{ fontSize: 18 }}>No hints, no misses.</p>
        )}
        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
            marginTop: 32,
          }}
        >
          {missed.length > 0 && (
            <button style={primary} onClick={startReview}>
              Review those letters
            </button>
          )}
          <button style={missed.length > 0 ? quiet : primary} onClick={exit}>
            Back to lessons
          </button>
          {!reviewing && (
            <button
              style={quiet}
              onClick={async () =>
                setShareMsg(
                  await shareMessage(
                    `I just finished "${lesson.title}" in Signify and earned ${xp} XP. Learn ASL with your webcam: ${window.location.origin}`
                  )
                )
              }
            >
              Share
            </button>
          )}
        </div>
        <p style={{ minHeight: 24, color: "#3D5A80" }}>{shareMsg}</p>
      </div>
    );
  }

  const label = isQuiz
    ? "Quick check"
    : step.type === "teach"
    ? "Learn"
    : step.type === "recall"
    ? "Recall"
    : step.useIt
    ? "Use it"
    : "Spell";
  const showImage = step.type === "teach" || step.type === "spell" || hint;
  const tip = TIPS[target];

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
          <div style={{ display: isQuiz ? "none" : "block" }}>
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
              <video ref={videoRef} playsInline muted style={{ width: "100%", display: "block" }} />
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
          {isQuiz && (
            <SignTile
              letter={step.letter}
              size={360}
              alt="An ASL handshape. Choose the matching letter."
            />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 260 }}>
          <p style={{ margin: 0, fontWeight: 600, color: "#3D5A80" }}>{label}</p>

          {step.sentence && (
            <p style={{ margin: "8px 0 0", fontSize: 18 }}>
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

          {isQuiz ? (
            <>
              <p style={{ fontSize: 24, fontWeight: 600, margin: "8px 0 20px" }}>
                Which letter is this?
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 120px)",
                  gap: 12,
                }}
              >
                {options.map((c) => {
                  const wrong = wrongPicks.includes(c);
                  const right = passed && c === step.letter;
                  return (
                    <button
                      key={c}
                      onClick={() => pickAnswer(c)}
                      disabled={wrong || passed}
                      style={{
                        height: 88,
                        fontSize: 36,
                        fontWeight: 700,
                        fontFamily: "inherit",
                        border: `2px solid ${right ? "#8DB580" : wrong ? "#BA9593" : "#3D5A80"}`,
                        borderRadius: 8,
                        background: right ? "#8DB580" : wrong ? "#F1E6E5" : "#fff",
                        color: "#293241",
                        cursor: wrong || passed ? "default" : "pointer",
                      }}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
              <p style={{ fontWeight: 600, minHeight: 28, marginTop: 16 }}>
                {passed
                  ? "Right."
                  : wrongPicks.length > 0
                  ? "Not that one. Look at the thumb and the fingers again."
                  : ""}
              </p>
            </>
          ) : (
            <>
              {step.type === "spell" ? (
                <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: 8, margin: "8px 0 8px" }}>
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

              <p style={{ margin: "0 0 16px", fontWeight: 500, color: "#3D5A80" }}>
                I see: {letter || "nothing clear yet"}
              </p>

              {showImage && <SignTile letter={target} size={240} />}

              {step.type === "teach" && <p style={{ maxWidth: 360 }}>{tip}</p>}
              {step.type === "recall" && !hint && (
                <button
                  style={{ ...quiet, marginBottom: 16 }}
                  onClick={() => {
                    helped.current = true;
                    setHint(true);
                  }}
                >
                  Show hint
                </button>
              )}
              {(hint || coach) && step.type !== "teach" && tip && (
                <p style={{ maxWidth: 360 }}>
                  {coach && letter && !matches(target, letter) ? `That looks like ${letter}. ` : ""}
                  {tip}
                </p>
              )}

              <div
                style={{
                  height: 14,
                  borderRadius: 7,
                  background: "#E8F0F6",
                  overflow: "hidden",
                  maxWidth: 360,
                }}
              >
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
                {passed
                  ? PASS[(i + pos) % PASS.length](target)
                  : isMatching
                  ? "Hold it..."
                  : step.type === "teach"
                  ? "Copy the picture and hold it."
                  : `Show me ${target}.`}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}