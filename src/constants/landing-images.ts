import type { DISEASE_DEFINITIONS } from '@/constants/monitor-config';

export const diseaseCardBackgrounds: Partial<Record<(typeof DISEASE_DEFINITIONS)[number]['slug'], string>> = {
  measles: '/images/measles.png',
  rubella: '/images/rubella.png',
  rotavirus: '/images/rotavirus.png',
  'japanese-encephalitis': '/images/japanese-encephalitis.png',
  dengue: '/images/dengue.png',
};

export const landingImageSources = Object.values(diseaseCardBackgrounds).filter(
  (src): src is string => Boolean(src),
);
