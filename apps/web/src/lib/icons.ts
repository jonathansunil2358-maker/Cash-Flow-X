/** Business and currency icons from the Cash Flow X design system (bundled SVG URLs). */
const business = import.meta.glob('../assets/icons/business/*.svg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const currency = import.meta.glob('../assets/icons/currency/*.svg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

const byName = (files: Record<string, string>) =>
  Object.fromEntries(Object.entries(files).map(([path, url]) => [path.split('/').pop()!.replace('.svg', ''), url]));

export const BUSINESS_ICONS: Record<string, string> = byName(business);
export const CURRENCY_ICONS = byName(currency) as Record<'coin' | 'gem' | 'legacy' | 'xp', string>;

/** Display order in the icon picker. */
export const ICON_ORDER = [
  'rocket', 'laptop', 'bolt', 'chart', 'globe', 'gear', 'crown', 'diamond', 'star', 'shield', 'flame', 'key',
  'tshirt', 'burger', 'coffee', 'dumbbell', 'parcel', 'car', 'leaf', 'mountain', 'paw', 'music', 'camera', 'heart',
];

export const ICON_LABELS: Record<string, string> = {
  rocket: 'Rocket', laptop: 'Laptop', bolt: 'Lightning', chart: 'Chart', globe: 'Globe', gear: 'Gear', crown: 'Crown',
  diamond: 'Diamond', star: 'Star', shield: 'Shield', flame: 'Flame', key: 'Key', tshirt: 'T-shirt', burger: 'Burger',
  coffee: 'Coffee', dumbbell: 'Dumbbell', parcel: 'Parcel', car: 'Car', leaf: 'Leaf', mountain: 'Mountain', paw: 'Paw',
  music: 'Music', camera: 'Camera', heart: 'Heart',
};

export const iconUrl = (id: string | undefined): string => BUSINESS_ICONS[id ?? 'rocket'] ?? BUSINESS_ICONS.rocket;
