import { useEffect, useRef, useState } from "react";
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

const classifier = makeClassifier(samples, 5);

export function useHandSign() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [status, setStatus] = useState("loading");
  const [letter, setLetter] = useState("");

  useEffect(() => {
    let landmarker;
    let stream = null;
    let rafId;
    let cancelled = false;
    let ctx;
    let drawing;
    let lastTime = -1;
    const history = [];

    function loop() {
      if (cancelled || !stream) return;
      const video = videoRef.current;
      if (video && video.currentTime !== lastTime) {
        lastTime = video.currentTime;
        const result = landmarker.detectForVideo(video, performance.now());
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
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
          const tally = {};
          for (const l of history) tally[l] = (tally[l] || 0) + 1;
          const [top, n] = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
          setLetter(n >= 5 && top !== "?" ? top : "");
        } else {
          history.length = 0;
          setLetter("");
        }
      }
      rafId = requestAnimationFrame(loop);
    }

    function stopCamera() {
      cancelAnimationFrame(rafId);
      stream?.getTracks().forEach((t) => t.stop());
      stream = null;
    }

    async function startCamera() {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });
      if (cancelled) {
        s.getTracks().forEach((t) => t.stop());
        return;
      }
      stream = s;
      const video = videoRef.current;
      video.srcObject = s;
      await video.play();
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx = canvas.getContext("2d");
      drawing = new DrawingUtils(ctx);
      lastTime = -1;
      setStatus("ready");
      loop();
    }

    function onVisibility() {
      if (document.hidden) {
        stopCamera();
      } else if (!stream && landmarker) {
        startCamera().catch(() => setStatus("error"));
      }
    }

    async function init() {
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
        await startCamera();
        document.addEventListener("visibilitychange", onVisibility);
      } catch (e) {
        console.error(e);
        setStatus("error");
      }
    }

    init();
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      stopCamera();
      landmarker?.close();
    };
  }, []);

  return { videoRef, canvasRef, status, letter };
}