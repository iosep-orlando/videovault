/** 75.4 → "1:15"; 3725 → "1:02:05". */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "";
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}
