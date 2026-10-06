import { useEffect, useRef, useState } from "react";

export default function App() {
  const videoRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let stream;
    navigator.mediaDevices
      .getUserMedia({ video: { width: 640, height: 480 } })
      .then((s) => {
        stream = s;
        videoRef.current.srcObject = s;
      })
      .catch(() => setError("Camera blocked. Allow camera access and refresh."));
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h1>Signify</h1>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ width: 640, borderRadius: 16, transform: "scaleX(-1)" }}
      />
    </div>
  );
}