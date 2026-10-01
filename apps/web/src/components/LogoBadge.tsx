import type { Logo } from '@cfx/engine';
import { iconUrl } from '../lib/icons';

const PATHS: Record<Logo['shape'], string> = {
  circle: 'M24 3a21 21 0 1 0 0.001 0Z',
  square: 'M9 3h30a6 6 0 0 1 6 6v30a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6V9a6 6 0 0 1 6-6Z',
  shield: 'M24 2 42 9v14c0 11-8 19-18 23C14 42 6 34 6 23V9Z',
  hex: 'M24 2 43 13v22L24 46 5 35V13Z',
};

/** The company logo: a coloured shape with the business icon on top. */
export function LogoBadge({ logo, icon, size = 44 }: { logo: Logo; icon: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="Company logo" className="shrink-0">
      <path d={PATHS[logo.shape]} fill={logo.bg} stroke={logo.fg} strokeWidth={3} strokeLinejoin="round" />
      <image href={iconUrl(icon)} x={10} y={10} width={28} height={28} />
    </svg>
  );
}
