export function normalize(landmarks) {
  const wrist = landmarks[0];
  const middleBase = landmarks[9];
  const size =
    Math.hypot(
      middleBase.x - wrist.x,
      middleBase.y - wrist.y,
      middleBase.z - wrist.z
    ) || 1;

  return landmarks.flatMap((p) => [
    (p.x - wrist.x) / size,
    (p.y - wrist.y) / size,
    (p.z - wrist.z) / size,
  ]);
}