/**
 * Photo mode: capture the island, apply a filter, add a caption and share or download it.
 * The 3D canvas keeps its drawing buffer so it can be read back.
 */
export type PhotoFilter = { id: string; name: string; css: string };
export const PHOTO_FILTERS: PhotoFilter[] = [
  { id: 'none', name: 'Natural', css: 'none' },
  { id: 'vivid', name: 'Vivid', css: 'saturate(1.45) contrast(1.1)' },
  { id: 'sepia', name: 'Sepia', css: 'sepia(0.85) contrast(1.05)' },
  { id: 'noir', name: 'Noir', css: 'grayscale(1) contrast(1.2)' },
  { id: 'sunset', name: 'Sunset', css: 'sepia(0.35) saturate(1.6) hue-rotate(-18deg) brightness(1.05)' },
];

export interface PhotoOptions {
  caption: string;
  sub: string;
  filter: PhotoFilter;
  /** CSS background behind the (transparent) 3D canvas. */
  sky: string;
}

/** Draw the scene canvas, its sky and a caption strip onto a new canvas. */
export function renderPhoto(source: HTMLCanvasElement, o: PhotoOptions): HTMLCanvasElement {
  const w = Math.max(320, source.width);
  const h = Math.max(200, source.height);
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h + 90;
  const ctx = out.getContext('2d')!;
  ctx.fillStyle = o.sky;
  ctx.fillRect(0, 0, w, h);
  ctx.filter = o.filter.css;
  ctx.drawImage(source, 0, 0, w, h);
  ctx.filter = 'none';
  ctx.fillStyle = '#4a2c17';
  ctx.fillRect(0, h, w, 90);
  ctx.fillStyle = '#fff8ec';
  ctx.font = '900 34px "Nunito", system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(o.caption, 24, h + 32);
  ctx.font = '700 22px "Nunito", system-ui, sans-serif';
  ctx.fillStyle = '#ffd98a';
  ctx.fillText(o.sub, 24, h + 66);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#fff8ec';
  ctx.fillText('Cash Flow X', w - 24, h + 48);
  return out;
}

export async function sharePhoto(canvas: HTMLCanvasElement, name: string): Promise<'shared' | 'downloaded' | 'cancelled' | 'failed'> {
  try {
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, 'image/png'));
    if (!blob || blob.size === 0) return 'failed';
    const file = new File([blob], `${name}.png`, { type: 'image/png' });
    if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'My island on Cash Flow X' }); return 'shared'; } catch (e) { if ((e as Error).name === 'AbortError') return 'cancelled'; }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return 'downloaded';
  } catch {
    return 'failed';
  }
}
