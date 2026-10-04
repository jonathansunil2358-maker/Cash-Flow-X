import { plSummary, type GameState } from '@cfx/engine';

/**
 * Island timelapse: a short animation of the company's growth, drawn month by month as a skyline whose towers
 * follow its value, and recorded in the browser (no upload). It only reads the finished months.
 */
export const TIMELAPSE_W = 480;
export const TIMELAPSE_H = 270;

const values = (g: GameState): number[] => g.history.map((h) => Math.max(0, h.valuation?.equityValue ?? 0));
const profits = (g: GameState): number[] => g.history.map((h) => plSummary(h.period.pl).profit);

export function drawFrame(ctx: CanvasRenderingContext2D, g: GameState, upto: number): void {
  const v = values(g); const pr = profits(g);
  const n = Math.max(1, Math.min(upto, v.length));
  const peak = Math.max(1, ...v.slice(0, n));
  const season = ['#bfe3ff', '#bfe3ff', '#d6efc2', '#d6efc2', '#d6efc2', '#ffe9a8', '#ffe9a8', '#ffe9a8', '#ffd2a0', '#ffd2a0', '#ffd2a0', '#dfe9f5'][(g.history[n - 1]?.month ?? n) % 12];
  ctx.fillStyle = season; ctx.fillRect(0, 0, TIMELAPSE_W, TIMELAPSE_H);
  ctx.fillStyle = '#7bc96f'; ctx.fillRect(0, TIMELAPSE_H - 50, TIMELAPSE_W, 50);
  const w = Math.max(3, Math.floor((TIMELAPSE_W - 20) / Math.max(24, v.length)));
  for (let i = 0; i < n; i++) {
    const h = Math.max(4, Math.round((v[i] / peak) * (TIMELAPSE_H - 110)));
    ctx.fillStyle = pr[i] >= 0 ? '#f2a93b' : '#c76b5a';
    ctx.fillRect(10 + i * w, TIMELAPSE_H - 50 - h, w - 1, h);
  }
  ctx.fillStyle = '#4a2c17'; ctx.font = 'bold 18px sans-serif';
  ctx.fillText(g.companyName, 12, 26);
  ctx.font = '13px sans-serif';
  ctx.fillText(`Month ${(g.history[n - 1]?.month ?? n) + 1}`, 12, 46);
}

/** Records the animation as a WebM clip, about eight seconds long. Returns null if the browser cannot record. */
export async function recordTimelapse(g: GameState, seconds = 8): Promise<Blob | null> {
  if (typeof MediaRecorder === 'undefined' || g.history.length < 2) return null;
  const canvas = document.createElement('canvas');
  canvas.width = TIMELAPSE_W; canvas.height = TIMELAPSE_H;
  const ctx = canvas.getContext('2d');
  if (!ctx || typeof canvas.captureStream !== 'function') return null;
  const stream = canvas.captureStream(15);
  const rec = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : undefined });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const done = new Promise<Blob>((resolve) => { rec.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' })); });
  rec.start();
  const total = g.history.length;
  const frames = seconds * 15;
  for (let f = 0; f <= frames; f++) {
    drawFrame(ctx, g, Math.max(1, Math.round((f / frames) * total)));
    await new Promise((r) => setTimeout(r, 1000 / 15));
  }
  rec.stop();
  return done;
}
