// Palette déterministe : un même service garde toujours la même couleur
const PALETTE = [
  { bg: '#003D7A', light: '#E6EEF7' },
  { bg: '#0F766E', light: '#E3F3F1' },
  { bg: '#B45309', light: '#FBF0E0' },
  { bg: '#7C3AED', light: '#F0E9FE' },
  { bg: '#BE123C', light: '#FBE7EC' },
  { bg: '#0369A1', light: '#E4F1F9' },
  { bg: '#4D7C0F', light: '#EDF4E2' },
  { bg: '#9333EA', light: '#F4E9FD' },
  { bg: '#C2410C', light: '#FCEBE2' },
  { bg: '#0891B2', light: '#E2F4F8' },
  { bg: '#65558F', light: '#EEEBF5' },
  { bg: '#A16207', light: '#F8F1DF' },
];

export function getServiceColor(service) {
  if (!service) return { bg: '#64748B', light: '#EEF1F5' };
  let hash = 0;
  for (let i = 0; i < service.length; i++) {
    hash = (hash * 31 + service.charCodeAt(i)) % 100000;
  }
  return PALETTE[hash % PALETTE.length];
}

export { PALETTE as SERVICE_PALETTE };