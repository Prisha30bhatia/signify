import { matches } from "./signMatch";
import { useHold } from "./useHold";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FilesetResolver,
  HandLandmarker,
  DrawingUtils,
} from "@mediapipe/tasks-vision";
import { normalize } from "./normalize";
import { makeClassifier } from "./knn";
import samples from "./data/samples.json";

const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

export default function Recognize() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const classifier = useMemo(() => makeClassifier(samples, 5), []);
  const [status, setStatus] = useState("Loading hand tracker...");
  const [guess, setGuess] = useState({ letter: "", confidence: 0 });
  const [target, setTarget] = useState("A");
  const [passed, setPassed] = useState(false);
  const isMatching = matches(target, guess.letter);
  const holding = useHold(isMatching, () => setPassed(true), 1000);

  useEffect(() => {
    let stream;
    let landmarker;
    let rafId;
    let cancelled = false;
    const history = [];

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
        setStatus("Show a letter to the camera");

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

              const out = classifier.classify(normalize(hand));
              history.push(out && out.confidence >= 0.6 ? out.letter : "?");
              if (history.length > 8) history.shift();

              // Smoothing: only show a letter if most recent frames agree.
              const tally = {};
              for (const l of history) tally[l] = (tally[l] || 0) + 1;
              const [top, n] = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
              const shown = n >= 5 && top !== "?" ? top : "";
              setGuess((g) =>
                g.letter === shown ? g : { letter: shown, confidence: out ? out.confidence : 0 }
              );
            } else {
              history.length = 0;
              setGuess((g) => (g.letter === "" ? g : { letter: "", confidence: 0 }));
            }
          }
          rafId = requestAnimationFrame(loop);
        }
        loop();
      } catch (e) {
        console.error(e);
        setStatus("Something went wrong: " + e.message);
      }
    }

    start();
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      stream?.getTracks().forEach((t) => t.stop());
      landmarker?.close();
    };
  }, [classifier]);

  return (
    <div style={{ padding: 24, display: "flex", gap: 40, flexWrap: "wrap" }}>
      <div>
        <h1 style={{ marginTop: 0 }}>Letter test</h1>
        <p style={{ fontWeight: 600 }}>{status}</p>
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
      <div style={{ minWidth: 260 }}>
  <label style={{ fontWeight: 600 }}>
    Target letter{" "}
    <select
      value={target}
      onChange={(e) => {
        setTarget(e.target.value);
        setPassed(false);
      }}
      style={{
        marginLeft: 8,
        padding: "8px 12px",
        fontSize: 16,
        fontFamily: "inherit",
        border: "2px solid #3D5A80",
        borderRadius: 8,
        background: "#fff",
        color: "#293241",
      }}
    >
      {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((l) => (
        <option key={l} value={l}>
          {l}
        </option>
      ))}
    </select>
  </label>

  <div
    style={{ fontSize: 120, fontWeight: 700, lineHeight: 1.2, color: "#3D5A80" }}
  >
    {target}
  </div>

  <div
    style={{
      height: 14,
      borderRadius: 7,
      background: "#E8F0F6",
      overflow: "hidden",
      maxWidth: 260,
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
      ? "Perfect! Held for one second."
      : isMatching
      ? "Hold it..."
      : `Make the letter ${target}`}
  </p>

  <p style={{ color: "#3D5A80" }}>
    I see: <strong>{guess.letter || "–"}</strong>
  </p>
  <p style={{ fontSize: 14 }}>{classifier.size} samples loaded</p>
</div>
    </div>
  );
}