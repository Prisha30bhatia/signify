import { useEffect, useRef, useState } from "react";
import {
  FilesetResolver,
  HandLandmarker,
  DrawingUtils,
} from "@mediapipe/tasks-vision";
import { normalize } from "./normalize";

const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const TAKE_SIZE = 100;
const KEY = "signify-samples";

function loadSamples() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

function saveSamples(samples) {
  try {
    localStorage.setItem(KEY, JSON.stringify(samples));
    return true;
  } catch {
    return false;
  }
}

function countsOf(samples) {
  const c = {};
  for (const l of LETTERS) c[l] = samples[l]?.length || 0;
  return c;
}

export default function Collect() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const samplesRef = useRef(loadSamples());
  const takeRef = useRef(null);
  const [letter, setLetter] = useState("A");
  const [counts, setCounts] = useState(() => countsOf(samplesRef.current));
  const [message, setMessage] = useState("Loading hand tracker...");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let stream;
    let landmarker;
    let rafId;
    let cancelled = false;

    function finishTake() {
      const take = takeRef.current;
      takeRef.current = null;
      const ok = saveSamples(samplesRef.current);
      setCounts(countsOf(samplesRef.current));
      setBusy(false);
      setMessage(
        ok
          ? `Saved ${take.letter}. Pick a letter and record again.`
          : "Browser storage is full! Click Download now."
      );
    }

    async function start() {
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM);
        landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL, delegate: "GPU" },
          runningMode: "VIDEO",
          numHands: 1,
        });
        if (cancelled) {
          landmarker.close();
          return;
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();
        setMessage("Pick a letter, then click Record.");

        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        const drawing = new DrawingUtils(ctx);
        let lastTime = -1;

        function loop() {
          if (cancelled) return;
          if (video.currentTime !== lastTime) {
            lastTime = video.currentTime;
            const result = landmarker.detectForVideo(video, performance.now());
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const hand = result.landmarks[0];
            if (hand) {
              drawing.drawConnectors(hand, HandLandmarker.HAND_CONNECTIONS, {
                color: "#8DB580",
                lineWidth: 4,
              });
              drawing.drawLandmarks(hand, { color: "#FFFFFF", radius: 4 });

              const take = takeRef.current;
              if (take) {
                const sample = normalize(hand).map(
                  (n) => Math.round(n * 1000) / 1000
                );
                (samplesRef.current[take.letter] ||= []).push(sample);
                take.remaining -= 1;
                if (take.remaining % 10 === 0) {
                  setMessage(
                    `Recording ${take.letter}... ${TAKE_SIZE - take.remaining}/${TAKE_SIZE}`
                  );
                }
                if (take.remaining <= 0) finishTake();
              }
            }
          }
          rafId = requestAnimationFrame(loop);
        }
        loop();
      } catch (e) {
        console.error(e);
        setMessage("Something went wrong: " + e.message);
      }
    }

    start();
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      stream?.getTracks().forEach((t) => t.stop());
      landmarker?.close();
    };
  }, []);

  function startTake() {
    setBusy(true);
    let n = 3;
    setMessage(`Get ready... ${n}`);
    const timer = setInterval(() => {
      n -= 1;
      if (n > 0) {
        setMessage(`Get ready... ${n}`);
      } else {
        clearInterval(timer);
        setMessage(`Recording ${letter}...`);
        takeRef.current = { letter, remaining: TAKE_SIZE };
      }
    }, 1000);
  }

  function clearLetter() {
    delete samplesRef.current[letter];
    saveSamples(samplesRef.current);
    setCounts(countsOf(samplesRef.current));
  }

  function download() {
    const blob = new Blob([JSON.stringify(samplesRef.current)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "signify-samples.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div style={{ padding: 24, display: "flex", gap: 32, flexWrap: "wrap" }}>
      <div>
        <h1 style={{ marginTop: 0 }}>Record samples</h1>
        <p style={{ fontWeight: 600 }}>{message}</p>
        <div
          style={{
            position: "relative",
            width: 640,
            maxWidth: "100%",
            transform: "scaleX(-1)",
          }}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            style={{ width: "100%", borderRadius: 8, display: "block" }}
          />
          <canvas
            ref={canvasRef}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
            }}
          />
        </div>
      </div>

      <div style={{ maxWidth: 420 }}>
        <h2 style={{ marginTop: 0 }}>Letter: {letter}</h2>
        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          <button
            onClick={startTake}
            disabled={busy}
            style={{
              padding: "12px 24px",
              fontSize: 16,
              fontFamily: "inherit",
              fontWeight: 600,
              border: 0,
              borderRadius: 8,
              background: "#3D5A80",
              color: "#fff",
              cursor: busy ? "default" : "pointer",
              opacity: busy ? 0.5 : 1,
            }}
          >
            Record {TAKE_SIZE} samples
          </button>
          <button
            onClick={clearLetter}
            disabled={busy}
            style={{
              padding: "12px 16px",
              fontSize: 16,
              fontFamily: "inherit",
              border: "2px solid #BA9593",
              borderRadius: 8,
              background: "transparent",
              color: "#293241",
              cursor: busy ? "default" : "pointer",
            }}
          >
            Clear {letter}
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: 8,
          }}
        >
          {LETTERS.map((l) => (
            <button
              key={l}
              onClick={() => setLetter(l)}
              disabled={busy}
              style={{
                padding: "8px 0",
                fontFamily: "inherit",
                border: 0,
                borderRadius: 8,
                cursor: busy ? "default" : "pointer",
                background:
                  l === letter
                    ? "#3D5A80"
                    : counts[l] >= TAKE_SIZE
                    ? "#8DB580"
                    : "#E8F0F6",
                color: l === letter ? "#fff" : "#293241",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 18 }}>{l}</div>
              <div style={{ fontSize: 12 }}>{counts[l]}</div>
            </button>
          ))}
        </div>

        <p>Total samples: {total}</p>
        <button
          onClick={download}
          style={{
            padding: "10px 20px",
            fontSize: 16,
            fontFamily: "inherit",
            border: "2px solid #3D5A80",
            borderRadius: 8,
            background: "transparent",
            color: "#3D5A80",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Download samples file
        </button>
      </div>
    </div>
  );
}