import { formatGBP, type YearReview } from '@cfx/engine';
import { Button } from '../components/ui';
import { shareResultCard } from '../lib/shareCard';
import { useGame } from '../store';

/** The year in review: shown once when a new year begins. */
export function YearReviewModal() {
  const { review, dismissReview, toast } = useGame();
  if (!review) return null;
  const share = async (r: YearReview) => {
    const res = await shareResultCard({
      heading: r.companyName, sub: `Year in review ${r.year}`, badge: r.headline, tone: r.profit >= 0 ? 'good' : 'bad',
      stats: [['Revenue', formatGBP(r.revenue, { compact: true })], [r.profit >= 0 ? 'Profit' : 'Loss', formatGBP(Math.abs(r.profit), { compact: true })], ['Best month', r.best ? r.best.label : '—']],
    });
    if (res === 'downloaded') toast('success', 'Picture saved. Share it anywhere.');
    else if (res === 'failed') toast('error', 'Could not make the picture on this device.');
  };
  return (
    <div className="fixed inset-0 z-[58] grid place-items-center bg-[#13324d]/70 p-3" role="dialog" aria-modal="true" aria-label={`Year in review ${review.year}`}>
      <div className="cfx-panel w-full max-w-[460px] !pt-8">
        <div className="cfx-panel__ribbon">Year in review {review.year}</div>
        <div className="font-display text-2xl leading-tight">{review.headline}</div>
        <ul className="mt-2 space-y-1.5 text-sm">
          {review.lines.map((l, i) => <li key={i} className="flex gap-2"><span aria-hidden>▸</span><span>{l}</span></li>)}
        </ul>
        <div className="mt-4 flex gap-2">
          <Button variant="primary" onClick={dismissReview}>On to next year</Button>
          <Button onClick={() => void share(review)}>Share</Button>
        </div>
      </div>
    </div>
  );
}
