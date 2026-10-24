import { useEffect, useMemo, useRef, useState } from "react";
import { X, Zap, Volume2, VolumeX, Check, Lightbulb, Trophy, Share2, RotateCcw, ShieldCheck } from "lucide-react";
import { useHandSign } from "./useHandSign";
import { useHold } from "./useHold";
import { matches } from "./signMatch";
import { LESSONS, TIPS } from "./lessons";
import { completeLesson } from "./progress";
import { shareMessage } from "./share";
import { chime, celebrate, isMuted, setMuted, reduceMotion } from "./effects";
import { C, primaryBtn, quietBtn } from "./theme";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const PASS = [
  (t) => `Clean ${t}.`,
  () => "That's it.",
  (t) => `${t}, got it.`,
  () => "Looks right to me.",
  () => "Solid.",
];

const CHIP = {
  teach: { bg: C.blue, fg: "#fff" },
  quiz: { bg: C.light, fg: C.ink },
  recall: { bg: C.sage, fg: C.ink },
  spell: { bg: C.rose, fg: C.ink },
};

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
      s.split(" ").map((w, idx) => ({ type: "spell", word: w, sentence: s, wordIndex: idx }))
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

function quizOptions(letter, group) {
  const near = shuffle(group.filter((l) => l !== letter));
  const rest = shuffle(ALPHABET.filter((l) => l !== letter && !group.includes(l)));
  return shuffle([letter, ...[...near, ...rest].slice(0, 3)]);
}

function exit() {
  window.location.hash = "#home";
}

function SignTile({ letter, size, alt, pop, bg = C.tint }) {
  return (
    <div
      className={pop ? "pop" : ""}
      style={{
        width: size, height: size, background: bg, borderRadius: 16,
        display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14,
      }}
    >
      <img
        src={`/signs/${letter.toLowerCase()}.png`}
        alt={alt || `ASL handshape for the letter ${letter}`}
        style={{ width: size * 0.86 }}
      />
    </div>
  );
}

function CountUp({ to }) {
  const [n, setN] = useState(reduceMotion() ? to : 0);
  useEffect(() => {
    if (reduceMotion()) return;
    let raf;
    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / 900);
      setN(Math.round(to * t));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <>{n}</>;
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
  const [muted, setMutedState] = useState(isMuted());

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
    chime();
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
      chime();
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
      if (!reviewing) celebrate();
    }
  }, [done, lesson.id, xp, scored, clean, reviewing]);

  if (done) {
    return (
      <div
        style={{
          minHeight: "100vh", background: C.blue, color: "#fff", display: "flex",
          alignItems: "center", justifyContent: "center", padding: "48px 24px",
        }}
      >
        <div style={{ maxWidth: 560, width: "100%", textAlign: "center" }}>
          <div
            style={{
              width: 88, height: 88, borderRadius: "50%", background: C.light,
              margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Trophy size={44} color={C.blue} strokeWidth={2} />
          </div>
          <h1 style={{ fontSize: 36, margin: 0 }}>{reviewing ? "Review done" : "Lesson complete"}</h1>
          <p style={{ fontSize: 18, margin: "6px 0 20px", opacity: 0.9 }}>{lesson.title}</p>

          {!reviewing && (
            <div
              style={{
                display: "inline-flex", alignItems: "center", gap: 10, fontSize: 56,
                fontWeight: 700, marginBottom: 20,
              }}
            >
              <Zap size={46} color={C.light} fill={C.light} />+<CountUp to={xp} /> XP
            </div>
          )}

          <div
            style={{
              background: "rgba(255,255,255,0.14)", borderRadius: 12, padding: "14px 18px",
              fontSize: 18, marginBottom: 16,
            }}
          >
            {scored > 0 ? `${clean} of ${scored} signs without any help` : "No scored signs this time"}
          </div>

          {missed.length > 0 ? (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 18, marginBottom: 12 }}>Worth another look</div>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                {missed.map((c) => (
                  <div key={c} style={{ textAlign: "center" }}>
                    <div
                      style={{
                        width: 84, height: 84, background: C.rose, borderRadius: 12,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      <img src={`/signs/${c.toLowerCase()}.png`} alt="" style={{ width: 72 }} />
                    </div>
                    <div style={{ fontWeight: 700, marginTop: 4 }}>{c}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            scored > 0 && <p style={{ fontSize: 18 }}>No hints, no misses.</p>
          )}

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 28 }}>
            {missed.length > 0 && (
              <button className="lift" style={{ ...primaryBtn, background: C.light, color: C.ink }} onClick={startReview}>
                <RotateCcw size={18} />
                Review those letters
              </button>
            )}
            <button
              className="lift"
              style={
                missed.length > 0
                  ? { ...quietBtn, color: "#fff", borderColor: "#fff" }
                  : { ...primaryBtn, background: C.light, color: C.ink }
              }
              onClick={exit}
            >
              Back to lessons
            </button>
            {!reviewing && (
              <button
                className="lift"
                style={{ ...quietBtn, color: "#fff", borderColor: "#fff" }}
                onClick={async () =>
                  setShareMsg(
                    await shareMessage(
                      `I just finished "${lesson.title}" in Signify and earned ${xp} XP. Learn ASL with your webcam: ${window.location.origin}`
                    )
                  )
                }
              >
                <Share2 size={18} />
                Share
              </button>
            )}
          </div>
          <p style={{ minHeight: 24, color: C.light }}>{shareMsg}</p>
        </div>
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
  const chip = CHIP[step.type];
  const showImage = step.type === "teach" || step.type === "spell" || hint;
  const tip = TIPS[target];

  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "24px 32px 48px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28 }}>
          <button className="lift" style={quietBtn} onClick={exit}>
            <X size={18} />
            Exit
          </button>
          <div style={{ flex: 1, height: 14, borderRadius: 7, background: C.tint, overflow: "hidden" }}>
            <div
              style={{
                width: `${(i / steps.length) * 100}%`, height: "100%", borderRadius: 7,
                background: C.blue, transition: "width 0.3s",
              }}
            />
          </div>
          <div
            style={{
              display: "inline-flex", alignItems: "center", gap: 6, background: C.tint,
              borderRadius: 10, padding: "8px 14px", fontWeight: 700, color: C.blue,
            }}
          >
            <Zap size={18} fill={C.blue} />
            {xp} XP
          </div>
          <button
            className="lift"
            aria-label={muted ? "Turn sound on" : "Turn sound off"}
            style={{ ...quietBtn, padding: 10 }}
            onClick={() => {
              setMuted(!muted);
              setMutedState(!muted);
            }}
          >
            {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        </div>

        <div style={{ display: "flex", gap: 40, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: isQuiz ? "none" : "block" }}>
              <div
                style={{
                  position: "relative", width: 560, maxWidth: "100%", transform: "scaleX(-1)",
                  background: C.ink, borderRadius: 16, overflow: "hidden",
                  border: `4px solid ${passed ? C.sage : C.light}`,
                  boxShadow: passed ? `0 0 0 6px ${C.sage}` : "0 0 0 0 transparent",
                  transition: "box-shadow 0.25s, border-color 0.25s",
                }}
              >
                <video ref={videoRef} playsInline muted style={{ width: "100%", display: "block" }} />
                <canvas
                  ref={canvasRef}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
                />
              </div>
              <p style={{ marginTop: 14, color: C.blue, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
                <ShieldCheck size={18} />
                {status === "loading" && "Starting the camera..."}
                {status === "error" && "Camera problem. Allow camera access and refresh."}
                {status === "ready" && "Your video stays on your device."}
              </p>
            </div>
            {isQuiz && (
              <SignTile letter={step.letter} size={380} pop={passed} alt="An ASL handshape. Choose the matching letter." />
            )}
          </div>

          <div
            style={{
              flex: 1, minWidth: 280, background: "#fff", border: `1px solid ${C.line}`,
              borderRadius: 16, padding: 28,
            }}
          >
            <span
              style={{
                display: "inline-block", background: chip.bg, color: chip.fg, borderRadius: 8,
                padding: "5px 12px", fontWeight: 700, fontSize: 14,
              }}
            >
              {label}
            </span>

            {step.sentence && (
              <p style={{ margin: "14px 0 0", fontSize: 18 }}>
                {step.sentence.split(" ").map((w, k) => (
                  <span
                    key={k}
                    style={{
                      marginRight: 12, fontWeight: k === step.wordIndex ? 700 : 400,
                      color: k < step.wordIndex ? "#5E8A52" : C.ink,
                    }}
                  >
                    {w}
                  </span>
                ))}
              </p>
            )}

            {isQuiz ? (
              <>
                <p style={{ fontSize: 26, fontWeight: 700, margin: "14px 0 20px" }}>Which letter is this?</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, maxWidth: 320 }}>
                  {options.map((c) => {
                    const wrong = wrongPicks.includes(c);
                    const right = passed && c === step.letter;
                    return (
                      <button
                        key={c}
                        className="lift"
                        onClick={() => pickAnswer(c)}
                        disabled={wrong || passed}
                        style={{
                          height: 88, fontSize: 36, fontWeight: 700, fontFamily: "inherit",
                          border: `2px solid ${right ? C.sage : wrong ? C.rose : C.blue}`,
                          borderRadius: 12,
                          background: right ? C.sage : wrong ? C.roseTint : "#fff",
                          color: C.ink, cursor: wrong || passed ? "default" : "pointer",
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
                  <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: 8, margin: "10px 0 8px" }}>
                    {step.word.split("").map((c, k) => (
                      <span
                        key={k}
                        style={{
                          color: k < pos ? "#5E8A52" : k === pos ? C.blue : C.light,
                          borderBottom: k === pos ? `4px solid ${C.blue}` : "4px solid transparent",
                        }}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 96, fontWeight: 700, lineHeight: 1.1, color: C.blue, margin: "6px 0" }}>
                    {target}
                  </div>
                )}

                <p
                  style={{
                    display: "inline-block", margin: "0 0 16px", background: C.tint, borderRadius: 8,
                    padding: "6px 12px", fontWeight: 600, color: C.blue,
                  }}
                >
                  I see: {letter || "nothing clear yet"}
                </p>

                {showImage && <SignTile letter={target} size={step.type === "teach" ? 300 : 240} pop={passed} />}

                {step.type === "teach" && <p style={{ maxWidth: 400, fontSize: 17 }}>{tip}</p>}
                {step.type === "recall" && !hint && (
                  <div style={{ marginBottom: 16 }}>
                    <button
                      className="lift"
                      style={quietBtn}
                      onClick={() => {
                        helped.current = true;
                        setHint(true);
                      }}
                    >
                      <Lightbulb size={18} />
                      Show hint
                    </button>
                  </div>
                )}
                {(hint || coach) && step.type !== "teach" && tip && (
                  <div
                    style={{
                      display: "flex", gap: 12, background: C.roseTint, border: `1px solid ${C.rose}`,
                      borderRadius: 12, padding: "12px 14px", margin: "0 0 16px", maxWidth: 400,
                    }}
                  >
                    <Lightbulb size={20} color="#8A6361" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>
                      {coach && letter && !matches(target, letter) ? `That looks like ${letter}. ` : ""}
                      {tip}
                    </span>
                  </div>
                )}

                <div style={{ height: 14, borderRadius: 7, background: C.tint, overflow: "hidden", maxWidth: 400 }}>
                  <div
                    style={{
                      height: "100%", width: holding || passed ? "100%" : "0%",
                      background: passed ? C.sage : C.light,
                      transition: holding && !passed ? "width 1s linear" : "none",
                    }}
                  />
                </div>
                <p style={{ fontWeight: 600, minHeight: 28, display: "flex", alignItems: "center", gap: 8 }}>
                  {passed ? (
                    <>
                      <Check size={20} color="#5E8A52" strokeWidth={3} />
                      {PASS[(i + pos) % PASS.length](target)}
                    </>
                  ) : isMatching ? (
                    "Hold it..."
                  ) : step.type === "teach" ? (
                    "Copy the picture and hold it."
                  ) : (
                    `Show me ${target}.`
                  )}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}