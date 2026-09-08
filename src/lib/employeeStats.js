// Un collaborateur est considéré comme actif si son statut correspond à un statut actif
// (Actif, Apprenti, Alternant) ou n'est pas renseigné.
// Centralise la logique pour garantir des comptes identiques sur toutes les pages.
const ACTIVE_STATUSES = ['Actif', 'Apprenti', 'Alternant'];

export function isActiveEmployee(e) {
  return !!e && (!e.status || ACTIVE_STATUSES.includes(e.status));
}

export function countActiveEmployees(employees) {
  return employees.filter(isActiveEmployee).length;
}