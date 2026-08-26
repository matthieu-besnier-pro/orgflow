/**
 * Retourne l'intitulé de poste à afficher selon le mode d'affichage.
 * - mode "standard" → poste classique
 * - mode "constructeur" → poste constructeur (fallback sur le poste classique si vide)
 */
export function getDisplayPosition(employee, viewMode) {
  if (!employee) return '';
  if (viewMode === 'constructeur') {
    const pc = (employee.position_constructeur || '').trim();
    if (!pc || pc.toLowerCase().startsWith('autre')) {
      return employee.position || '';
    }
    return pc;
  }
  return employee.position || '';
}