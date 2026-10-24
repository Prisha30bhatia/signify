export const DAILY_WORDS = [
  "HELLO", "FRIEND", "FAMILY", "SCHOOL", "HAPPY", "WATER", "MUSIC", "SMILE",
  "LEARN", "HANDS", "PEACE", "GREAT", "BREAD", "APPLE", "TIGER", "OCEAN",
  "RIVER", "CLOUD", "STORM", "LIGHT", "EARTH", "PLANT", "SUNNY", "BEACH",
  "LEMON", "MANGO", "HONEY", "CANDY", "PIANO", "DREAM",
];

// Same word all day, a new one at local midnight.
export function wordOfTheDay() {
  const day = new Date().toLocaleDateString("en-CA");
  let h = 0;
  for (const c of day) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return DAILY_WORDS[h % DAILY_WORDS.length];
}