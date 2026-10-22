export const TIPS = {
  A: "Make a fist with your thumb resting along the side of your index finger.",
  B: "Hold your fingers straight up and together, with your thumb folded across your palm.",
  C: "Curve your fingers and thumb into the shape of a C.",
  D: "Point your index finger up and curl the other fingers to touch your thumb.",
  E: "Curl your fingertips down, with your thumb tucked underneath them.",
  F: "Touch your thumb and index finger together, and keep the other three fingers up.",
  G: "Point your index finger and thumb sideways, parallel to each other.",
  H: "Point your index and middle fingers sideways, held together.",
  I: "Make a fist and raise your pinky finger.",
  J: "Start with the I handshape, then draw a J in the air with your pinky. We check the starting shape.",
  K: "Raise your index and middle fingers apart, with your thumb touching the base of the middle finger.",
  L: "Make an L with your thumb and index finger.",
  M: "Tuck your thumb under your first three fingers.",
  N: "Tuck your thumb under your first two fingers.",
  O: "Touch all your fingertips to your thumb to make an O.",
  P: "Make the K handshape and point it downward.",
  Q: "Point your index finger and thumb downward, like a pinch.",
  R: "Cross your middle finger over your index finger.",
  S: "Make a fist with your thumb across the front of your fingers.",
  T: "Make a fist with your thumb tucked between your index and middle fingers.",
  U: "Raise your index and middle fingers together.",
  V: "Raise your index and middle fingers apart, like a peace sign.",
  W: "Raise your index, middle, and ring fingers apart.",
  X: "Make a fist and bend your index finger into a hook.",
  Y: "Stretch out your thumb and pinky, with the other fingers curled in.",
  Z: "Point your index finger and draw a Z in the air. We check the pointing shape.",
};

const LETTER_GROUPS = ["ABC", "DEF", "GHI", "JKL", "MNO", "PQR", "STU", "VWX", "YZ"];

const WORD_LESSONS = [
  { title: "First words", words: ["CAT", "DOG", "SUN"] },
  { title: "Quick words", words: ["BYE", "YES", "HELP"] },
  { title: "Longer words", words: ["LEARN", "SIGN", "HAND"] },
];

const SENTENCE_LESSONS = [
  { title: "First phrases", sentences: ["I AM HERE", "THANK YOU"] },
  { title: "More phrases", sentences: ["I LOVE ASL", "SEE YOU LATER"] },
  { title: "Keep going", sentences: ["LEARN WITH ME", "SIGN EVERY DAY"] },
];

const letterLessons = LETTER_GROUPS.map((g, n) => ({
  id: n + 1,
  pathway: "letters",
  kind: "letters",
  title: g.split("").join(" · "),
  letters: g.split(""),
}));

const wordLessons = WORD_LESSONS.map((l, n) => ({
  id: letterLessons.length + n + 1,
  pathway: "words",
  kind: "words",
  ...l,
}));

const sentenceLessons = SENTENCE_LESSONS.map((l, n) => ({
  id: letterLessons.length + wordLessons.length + n + 1,
  pathway: "sentences",
  kind: "sentences",
  ...l,
}));

export const PATHWAYS = [
  { id: "letters", title: "Letters" },
  { id: "words", title: "Words" },
  { id: "sentences", title: "Sentences" },
];

export const LESSONS = [...letterLessons, ...wordLessons, ...sentenceLessons];