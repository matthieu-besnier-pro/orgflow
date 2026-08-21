// Un collaborateur est considéré comme actif si son statut est 'Actif' ou non renseigné.
// Centralise la logique pour garantir des comptes identiques sur toutes les pages.
export function isActiveEmployee(e) {
  return !!e && (e.status === 'Actif' || !e.status);
}

export function countActiveEmployees(employees) {
  return employees.filter(isActiveEmployee).length;
}