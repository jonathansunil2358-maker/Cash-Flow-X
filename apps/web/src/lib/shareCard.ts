/**
 * A shareable picture of a finished company. Drawn on a canvas with system fonts (nothing to
 * load), then handed to the phone's share sheet, or downloaded where sharing files is not
 * supported.
 */
export interface ShareCard {
  /** Big line, e.g. the company name. */
  heading: string;
  /** Smaller line under it, e.g. "Software · Medium · 5 years". */
  sub: string;
  /** A short result line, e.g. "Prestiged" or "Went bust". */
  badge: string;
  /** Rows of label/value pairs. */
  stats: [string, string][];
  /** Accent colour for the badge. */
  tone?: 'good' | 'bad' | 'neutral';
}

export const SHARE_W = 1080;
export const SHARE_H = 1350;
const FONT = '"Nunito", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const TONES = { good: '#2f9420', bad: '#d93a2f', neutral: '#1f78d1' };

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Shrink the font until the text fits the width. */
function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, startPx: number, weight = 900): void {
  let px = startPx;
  do {
    ctx.font = `${weight} ${px}px ${FONT}`;
    px -= 2;
  } while (ctx.measureText(text).width > maxWidth && px > 24);
}

export function drawShareCard(card: ShareCard): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = SHARE_W;
  canvas.height = SHARE_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const sky = ctx.createLinearGradient(0, 0, 0, SHARE_H);
  sky.addColorStop(0, '#6cc4ff');
  sky.addColorStop(1, '#bfe8ff');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, SHARE_W, SHARE_H);
  ctx.fillStyle = '#7ccf52';
  ctx.beginPath();
  ctx.ellipse(SHARE_W * 0.3, SHARE_H + 60, 760, 260, 0, 0, Math.PI * 2);
  ctx.fill();

  const px = 70;
  const w = SHARE_W - px * 2;
  const top = 150;
  const h = 1000;
  ctx.fillStyle = 'rgba(74,44,23,0.9)';
  roundRect(ctx, px, top + 12, w, h, 56);
  ctx.fill();
  ctx.fillStyle = '#fff3dc';
  roundRect(ctx, px, top, w, h, 56);
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#4a2c17';
  ctx.stroke();

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#4a2c17';
  ctx.font = `900 40px ${FONT}`;
  ctx.fillText('CASH FLOW X', px + 50, top + 90);

  ctx.fillStyle = '#4a2c17';
  fit(ctx, card.heading, w - 100, 92);
  ctx.fillText(card.heading, px + 50, top + 210);
  ctx.fillStyle = '#7a5a3a';
  fit(ctx, card.sub, w - 100, 44, 800);
  ctx.fillText(card.sub, px + 50, top + 272);

  const badgeColor = TONES[card.tone ?? 'neutral'];
  ctx.font = `900 54px ${FONT}`;
  const bw = Math.min(w - 100, ctx.measureText(card.badge).width + 80);
  ctx.fillStyle = badgeColor;
  roundRect(ctx, px + 50, top + 316, bw, 100, 28);
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#4a2c17';
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.fillText(card.badge, px + 90, top + 386);

  const rows = card.stats.slice(0, 6);
  rows.forEach(([label, value], i) => {
    const y = top + 500 + i * 74;
    ctx.fillStyle = '#7a5a3a';
    ctx.font = `800 36px ${FONT}`;
    ctx.fillText(label, px + 50, y);
    ctx.fillStyle = '#4a2c17';
    ctx.textAlign = 'right';
    fit(ctx, value, w / 2, 44);
    ctx.fillText(value, px + w - 50, y);
    ctx.textAlign = 'left';
    ctx.strokeStyle = 'rgba(74,44,23,0.18)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(px + 50, y + 22);
    ctx.lineTo(px + w - 50, y + 22);
    ctx.stroke();
  });

  ctx.fillStyle = '#4a2c17';
  ctx.font = `800 34px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('Build a business on real accounts', SHARE_W / 2, top + h + 90);
  ctx.font = `700 30px ${FONT}`;
  ctx.fillText(typeof location !== 'undefined' ? location.host : '', SHARE_W / 2, top + h + 136);
  ctx.textAlign = 'left';
  return canvas;
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

export type ShareResult = 'shared' | 'downloaded' | 'cancelled' | 'failed';

/** Share the card as a picture; fall back to downloading it. */
export async function shareResultCard(card: ShareCard): Promise<ShareResult> {
  try {
    const blob = await toBlob(drawShareCard(card));
    if (!blob || blob.size === 0) return 'failed';
    const name = `${card.heading.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'my-company'}.png`;
    const file = new File([blob], name, { type: 'image/png' });
    if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: `${card.heading} on Cash Flow X`, text: `${card.heading}: ${card.badge}` });
        return 'shared';
      } catch (e) {
        if ((e as Error).name === 'AbortError') return 'cancelled';
        // Fall through to the download.
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return 'downloaded';
  } catch {
    return 'failed';
  }
}
