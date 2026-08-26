/**
 * Retourne l'intitulé de poste à afficher selon le mode d'affichage.
 * - mode "standard" → poste classique
 * - mode "constructeur" → poste constructeur (fallback sur le poste classique si vide)
 */
export function getDisplayPosition(employee, viewMode) {
  if (!employee) return '';
  if (viewMode === 'constructeur') {
    return employee.position_constructeur || employee.position || '';
  }
  return employee.position || '';
}