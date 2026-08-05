// Palette de couleurs distinctes pour les services
const PALETTE = [
  { bg: '#003D7A', light: '#E6EEF7' },
  { bg: '#0F766E', light: '#E3F3F1' },
  { bg: '#B45309', light: '#FBF0E0' },
  { bg: '#7C3AED', light: '#F0E9FE' },
  { bg: '#BE123C', light: '#FBE7EC' },
  { bg: '#0369A1', light: '#E4F1F9' },
  { bg: '#4D7C0F', light: '#EDF4E2' },
  { bg: '#DB2777', light: '#FCE7F1' },
  { bg: '#C2410C', light: '#FCEBE2' },
  { bg: '#0891B2', light: '#E2F4F8' },
  { bg: '#65558F', light: '#EEEBF5' },
  { bg: '#A16207', light: '#F8F1DF' },
  { bg: '#15803D', light: '#E4F2E9' },
  { bg: '#1D4ED8', light: '#E6EBFB' },
  { bg: '#9F1239', light: '#F8E4E9' },
  { bg: '#4338CA', light: '#E9E8FA' },
  { bg: '#047857', light: '#E1F1EC' },
  { bg: '#B91C1C', light: '#F9E6E6' },
  { bg: '#7E22CE', light: '#F2E7FB' },
  { bg: '#525252', light: '#EDEDED' },
];

// Chaque service rencontré reçoit la prochaine couleur libre de la palette
const assigned = new Map();

export function getServiceColor(service) {
  if (!service) return { bg: '#64748B', light: '#EEF1F5' };
  const key = service.trim().toLowerCase();
  if (!assigned.has(key)) {
    assigned.set(key, PALETTE[assigned.size % PALETTE.length]);
  }
  return assigned.get(key);
}

export { PALETTE as SERVICE_PALETTE };