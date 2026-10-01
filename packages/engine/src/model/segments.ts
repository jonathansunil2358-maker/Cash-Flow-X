import { demandFor } from './market';
import { industryOf } from './industries';
import { effectivePrice } from './promotions';
import type { GameState } from './state';

/**
 * Customer segments: a read-only picture of who buys from you. Bargain hunters leave when your price
 * is above the going rate, loyal regulars stay when your quality is high, and big spenders pay for quality
 * and brand. The shares come from your price, quality and brand, so they move as you do. It explains the
 * demand model; it does not change it.
 */
export interface Segment { id: 'hunters' | 'regulars' | 'spenders'; name: string; share: number; blurb: string; tip: string }
export function segmentsOf(s: GameState): Segment[] {
  const ind = industryOf(s);
  const priceRatio = effectivePrice(s) / ind.basePrice;
  const q = Math.min(1, Math.max(0, s.quality / 100));
  const brand = Math.min(1, s.brand / 400);
  const hunters = Math.min(0.7, Math.max(0.1, 0.45 - (priceRatio - 1) * 0.5));
  const spenders = Math.min(0.4, Math.max(0.05, 0.08 + q * 0.2 + brand * 0.15 + Math.max(0, priceRatio - 1) * 0.05));
  const regulars = Math.max(0.1, 1 - hunters - spenders);
  const total = hunters + regulars + spenders;
  const d = demandFor(s, ind).demand;
  void d;
  return [
    { id: 'hunters', name: 'Bargain hunters', share: hunters / total, blurb: 'Buy on price alone, and leave when someone is cheaper.', tip: priceRatio > 1.1 ? 'Your prices are above the going rate: you are losing these.' : 'Your prices keep them.' },
    { id: 'regulars', name: 'Loyal regulars', share: regulars / total, blurb: 'Stay if you are good and reliable, and tell friends.', tip: q < 0.5 ? 'Better quality would keep more of them.' : 'Your quality keeps them coming back.' },
    { id: 'spenders', name: 'Big spenders', share: spenders / total, blurb: 'Pay more for quality and a strong brand.', tip: brand < 0.3 ? 'A stronger brand would attract more of them.' : 'Your brand draws them in.' },
  ];
}
