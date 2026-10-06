import { useEffect, useRef, useState } from "react";
import {
  FilesetResolver,
  HandLandmarker,
  DrawingUtils,
} from "@mediapipe/tasks-vision";

const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

export default function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [status, setStatus] = useState("Loading hand tracker...");

  useEffect(() => {
    let stream;
    let landmarker;
    let rafId;
    let cancelled = false;

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
        setStatus("Show your hand to the camera");

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
            for (const landmarks of result.landmarks) {
              drawing.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, {
                color: "#8AF0C0",
                lineWidth: 4,
              });
              drawing.drawLandmarks(landmarks, { color: "#FFFFFF", radius: 4 });
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
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h1>Signify</h1>
      <p>{status}</p>
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
          style={{ width: "100%", borderRadius: 16, display: "block" }}
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
  );
}