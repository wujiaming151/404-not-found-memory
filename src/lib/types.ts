import type { Analysis } from './analysis';
import type { Fragrance } from './fragrance';
export type Experience = {
  id: string;
  participantId: string;
  title: string;
  image: string;
  analysis: Analysis;
  fragrance: Fragrance;
  createdAt: string;
  demo: boolean;
  sourceId?: string;
  visual: { seed: number; version: string };
  variants?: Fragrance[];
};
