import { gbp, type Pence } from '../money';

export type DifficultyId = 'easy' | 'medium' | 'hard';
export const DIFFICULTY_IDS: DifficultyId[] = ['easy', 'medium', 'hard'];

export interface DifficultyConfig {
  id: DifficultyId;
  name: string;
  startingCash: Pence;
  /** Probability that a random event is good news. */
  positiveShare: number;
  /** Rebirths allowed per prestige cycle (Infinity = unlimited). */
  rebirths: number;
  canPrestige: boolean;
  /** Perks and gem boosts apply (Hard mode is "pure": cosmetics only). */
  perksApply: boolean;
  summary: string;
}

export const DIFFICULTIES: Record<DifficultyId, DifficultyConfig> = {
  easy: {
    id: 'easy', name: 'Easy', startingCash: gbp(100_000), positiveShare: 0.7, rebirths: Infinity, canPrestige: true, perksApply: true,
    summary: '£100k start. 70% of events are good news. Unlimited rebirths; you can prestige.',
  },
  medium: {
    id: 'medium', name: 'Medium', startingCash: gbp(50_000), positiveShare: 0.6, rebirths: 3, canPrestige: true, perksApply: true,
    summary: '£50k start. 60% of events are good news. 3 rebirths per prestige; you can prestige.',
  },
  hard: {
    id: 'hard', name: 'Hard', startingCash: gbp(25_000), positiveShare: 0.35, rebirths: 0, canPrestige: false, perksApply: false,
    summary: '£25k start. Only 35% of events are good news. One life, no prestige, no perks or boosts.',
  },
};
