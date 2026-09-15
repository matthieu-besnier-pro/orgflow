import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Champs réappliqués lors d'une restauration (doivent correspondre à ceux
// capturés par la fonction publicChartEdit).
const SNAPSHOT_FIELDS = [
  'manager_id',
  'service',
  'position',
  'position_constructeur',
  'sort_order',
  'is_co_manager',
  'is_group_support',
];

function canAccessCompany(user, companyId) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role !== 'rh') return false;
  const ids = user.accessible_company_ids || [];
  // Liste vide = accès à toutes les sociétés (convention de l'app).
  if (ids.length === 0) return true;
  return ids.includes(companyId);
}

async function getServiceLayout(base44, companyId) {
  const layouts = await base44.asServiceRole.entities.ServiceLayout.filter({ company_id: companyId });
  return layouts && layouts.length ? layouts[0] : null;
}

function buildSnapshotData(employees, serviceLayout) {
  return {
    version: 1,
    employees: employees.map((e) => {
      const rec = { id: e.id };
      for (const f of SNAPSHOT_FIELDS) rec[f] = e[f] ?? null;
      return rec;
    }),
    service_layout: serviceLayout
      ? { positions: serviceLayout.positions || [], page_format: serviceLayout.page_format || null }
      : null,
  };
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'rh') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    // ── Créer une archive manuelle de l'état courant ────────────────────────
    if (action === 'create') {
      const companyId = body?.company_id;
      if (!companyId) return Response.json({ error: 'company_id requis' }, { status: 400 });
      if (!canAccessCompany(user, companyId)) return Response.json({ error: 'Forbidden' }, { status: 403 });

      const employees = await base44.asServiceRole.entities.Employee.filter({ company_id: companyId });
      const serviceLayout = await getServiceLayout(base44, companyId);
      const data = buildSnapshotData(employees, serviceLayout);
      const snap = await base44.asServiceRole.entities.OrgSnapshot.create({
        company_id: companyId,
        label: body?.label || `Archive manuelle — ${new Date().toLocaleString('fr-FR')}`,
        source: 'manual',
        created_via: 'rh',
        employee_count: employees.length,
        data: JSON.stringify(data),
      });
      return Response.json({ ok: true, snapshot: { id: snap.id, label: snap.label } });
    }

    // ── Restaurer une archive ───────────────────────────────────────────────
    if (action === 'restore') {
      const snapshotId = body?.snapshot_id;
      if (!snapshotId) return Response.json({ error: 'snapshot_id requis' }, { status: 400 });

      const snap = await base44.asServiceRole.entities.OrgSnapshot.get(snapshotId);
      if (!snap) return Response.json({ error: 'Archive introuvable' }, { status: 404 });
      if (!canAccessCompany(user, snap.company_id)) return Response.json({ error: 'Forbidden' }, { status: 403 });

      let parsed;
      try {
        parsed = JSON.parse(snap.data);
      } catch (_) {
        return Response.json({ error: 'Archive corrompue' }, { status: 422 });
      }
      const companyId = snap.company_id;

      // 1. Archive de sécurité de l'état AVANT restauration (pour pouvoir annuler)
      const currentEmployees = await base44.asServiceRole.entities.Employee.filter({ company_id: companyId });
      const currentLayout = await getServiceLayout(base44, companyId);
      await base44.asServiceRole.entities.OrgSnapshot.create({
        company_id: companyId,
        label: `Avant restauration — ${new Date().toLocaleString('fr-FR')}`,
        source: 'pre_restore',
        created_via: 'rh',
        employee_count: currentEmployees.length,
        data: JSON.stringify(buildSnapshotData(currentEmployees, currentLayout)),
      });

      // 2. Réapplication des champs archivés aux fiches encore existantes
      const currentById = new Map(currentEmployees.map((e) => [e.id, e]));
      let restored = 0;
      for (const rec of parsed.employees || []) {
        if (!currentById.has(rec.id)) continue; // fiche supprimée depuis : ignorée
        const fields = {};
        for (const f of SNAPSHOT_FIELDS) {
          if (Object.prototype.hasOwnProperty.call(rec, f)) fields[f] = rec[f];
        }
        await base44.asServiceRole.entities.Employee.update(rec.id, fields);
        restored += 1;
      }

      // 3. Restauration de la disposition des blocs de services
      if (parsed.service_layout) {
        const payload = {
          company_id: companyId,
          positions: parsed.service_layout.positions || [],
        };
        if (parsed.service_layout.page_format) payload.page_format = parsed.service_layout.page_format;
        if (currentLayout) {
          await base44.asServiceRole.entities.ServiceLayout.update(currentLayout.id, payload);
        } else {
          await base44.asServiceRole.entities.ServiceLayout.create(payload);
        }
      }

      // 4. Journalisation
      try {
        await base44.asServiceRole.entities.AuditLog.create({
          company_id: companyId,
          user_id: user.id,
          user_name: user.full_name || user.email || 'RH',
          user_email: user.email,
          action: 'update',
          entity_type: 'employee',
          details: `Restauration de l'archive « ${snap.label || snapshotId} » (${restored} fiche(s))`,
        });
      } catch (_) { /* ignore */ }

      return Response.json({ ok: true, restored });
    }

    return Response.json({ error: 'Action inconnue' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
