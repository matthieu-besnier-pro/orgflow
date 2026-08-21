// Mapping ville → ancienne entité (logique métier historique)
const ANCIENNE_ENTITE_MAP = {
  'Sauze': 'GONNIN',
  'Sauzé': 'GONNIN',
  'Sauzé-Vaussais': 'GONNIN',
  'Vaussais': 'GONNIN',
  'Naintré': 'GONNIN',
  'Chasseneuil': 'GONNIN',
  'La Ferrière': 'GONNIN',
  'Melle': 'QUITTE',
  'Niort': 'QUITTE',
  'Chatillon': 'QUITTE',
  'Vasles': 'QUITTE',
  'Luçay': 'DURIS',
  'Saint Maur': 'DURIS',
  'Issoudun': 'DURIS',
  'Noyers': 'DURIS',
  'PY Pneus': 'DURIS',
  'Arnac': 'DBS',
  'Arnac la Poste': 'DBS',
  'Rivarennes': 'DBS',
  'Béthines': 'DBS',
};

export function getAncienneEntite(agency, validEntites = null) {
  if (!agency) return null;
  const city = agency.city || '';
  const name = agency.name || '';
  for (const [key, entite] of Object.entries(ANCIENNE_ENTITE_MAP)) {
    if (city.toLowerCase().includes(key.toLowerCase()) || name.toLowerCase().includes(key.toLowerCase())) {
      // Ne retourner l'entité que si elle appartient à la société courante
      if (validEntites && validEntites.length > 0 && !validEntites.includes(entite)) return null;
      return entite;
    }
  }
  return null;
}

export function buildAgencyEntiteMap(agencies, validEntites = null) {
  const map = {};
  agencies.forEach(a => { map[a.id] = getAncienneEntite(a, validEntites); });
  return map;
}

export function buildEntiteToZone(agencies, employees = [], validEntites = null) {
  const map = {};
  agencies.forEach(a => {
    const entite = getAncienneEntite(a, validEntites);
    if (entite && a.zone) map[entite] = a.zone;
  });
  employees.forEach(e => {
    if (e.ancienne_entite && e.zone) map[e.ancienne_entite] = e.zone;
  });
  return map;
}