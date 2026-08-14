import { base44 } from '@/api/base44Client';

let cachedUser = null;

async function getCurrentUser() {
  if (cachedUser) return cachedUser;
  try {
    cachedUser = await base44.auth.me();
    return cachedUser;
  } catch {
    return null;
  }
}

/**
 * Journalise une action dans l'audit log.
 * @param {Object} params
 * @param {string} params.action - Type d'action (create, update, delete, move, photo, etc.)
 * @param {string} [params.entityType] - Type d'entité (employee, company, etc.)
 * @param {string} [params.entityId] - ID de l'entité
 * @param {string} [params.entityName] - Nom lisible de l'entité
 * @param {string} [params.details] - Détails de l'action
 * @param {string} [params.companyId] - ID de la société
 */
export async function logAuditAction({ action, entityType = 'employee', entityId, entityName, details, companyId }) {
  try {
    const user = await getCurrentUser();
    if (!user) return;
    await base44.entities.AuditLog.create({
      company_id: companyId || null,
      user_id: user.id,
      user_name: user.full_name || user.email,
      user_email: user.email,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      entity_name: entityName || null,
      details: details || null,
    });
  } catch (e) {
    console.error('Audit log failed:', e);
  }
}