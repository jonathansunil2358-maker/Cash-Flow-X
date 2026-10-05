import type { CoreIndustryId, IndustryConfig } from '../industries';
import type { UpgradeDef } from '../upgrades';
import * as s_bakery from './bakery';
import * as s_farm from './farm';
import * as s_hotel from './hotel';
import * as s_brewery from './brewery';
import * as s_gamestudio from './gamestudio';
import * as s_haulage from './haulage';
import * as s_pharmacy from './pharmacy';
import * as s_construction from './construction';
import * as s_toymaker from './toymaker';
import * as s_space from './space';

export type ExtraIndustryId = 'bakery' | 'farm' | 'hotel' | 'brewery' | 'gamestudio' | 'haulage' | 'pharmacy' | 'construction' | 'toymaker' | 'space';
export interface ExtraMeta { id: ExtraIndustryId; name: string; emoji: string; /** A core sector whose 3D building and look this one borrows. */ look: CoreIndustryId; /** Business icon name. */ icon: string }
export const EXTRA_META: ExtraMeta[] = [
  { id: 'bakery', name: 'Bakery chain', emoji: '🥖', look: 'restaurant', icon: 'coffee' },
  { id: 'farm', name: 'Farm and farm shop', emoji: '🌾', look: 'ecommerce', icon: 'leaf' },
  { id: 'hotel', name: 'Hotel', emoji: '🏨', look: 'fitness', icon: 'crown' },
  { id: 'brewery', name: 'Craft brewery', emoji: '🍺', look: 'restaurant', icon: 'flame' },
  { id: 'gamestudio', name: 'Game studio', emoji: '🎮', look: 'software', icon: 'laptop' },
  { id: 'haulage', name: 'Haulage and logistics', emoji: '🚚', look: 'ecommerce', icon: 'parcel' },
  { id: 'pharmacy', name: 'Pharmacy', emoji: '💊', look: 'ecommerce', icon: 'heart' },
  { id: 'construction', name: 'Construction firm', emoji: '🏗️', look: 'automotive', icon: 'gear' },
  { id: 'toymaker', name: 'Toy maker', emoji: '🧸', look: 'clothing', icon: 'star' },
  { id: 'space', name: 'Space launch startup', emoji: '🚀', look: 'software', icon: 'rocket' },
];
export const EXTRA_MODULES: Record<ExtraIndustryId, { config: IndustryConfig | null; upgrades: UpgradeDef[] | null }> = {
  bakery: s_bakery,
  farm: s_farm,
  hotel: s_hotel,
  brewery: s_brewery,
  gamestudio: s_gamestudio,
  haulage: s_haulage,
  pharmacy: s_pharmacy,
  construction: s_construction,
  toymaker: s_toymaker,
  space: s_space,
};
