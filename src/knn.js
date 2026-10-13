// k-nearest-neighbors: compare the live hand to every recorded sample
// and let the k closest ones vote on the letter.
export function makeClassifier(samples, k = 5) {
  const vectors = [];
  const labels = [];
  for (const [letter, list] of Object.entries(samples)) {
    for (const v of list) {
      vectors.push(v);
      labels.push(letter);
    }
  }

  return {
    size: vectors.length,
    classify(vec) {
      if (!vectors.length) return null;
      const best = [];
      for (let i = 0; i < vectors.length; i++) {
        const v = vectors[i];
        let d = 0;
        for (let j = 0; j < vec.length; j++) {
          const diff = v[j] - vec[j];
          d += diff * diff;
        }
        if (best.length < k || d < best[best.length - 1].d) {
          best.push({ d, label: labels[i] });
          best.sort((a, b) => a.d - b.d);
          if (best.length > k) best.pop();
        }
      }
      const votes = {};
      for (const b of best) votes[b.label] = (votes[b.label] || 0) + 1;
      const [letter, count] = Object.entries(votes).sort((a, b) => b[1] - a[1])[0];
      return { letter, confidence: count / best.length };
    },
  };
}