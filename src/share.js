export async function shareMessage(text) {
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return "Shared!";
    } catch {
      return "";
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return "Copied to your clipboard!";
  } catch {
    return "Couldn't copy. Try again.";
  }
}