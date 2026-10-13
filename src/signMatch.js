// J starts with the same handshape as I, and the app only checks
// the handshape, so a plain I shape is accepted for J.
// I stays strict, so a tilted J never counts as I.
const ALSO_ACCEPTED = {
  J: ["I"],
};

export function matches(target, guess) {
  if (!guess) return false;
  return guess === target || (ALSO_ACCEPTED[target] || []).includes(guess);
}