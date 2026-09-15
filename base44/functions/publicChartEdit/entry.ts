import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Champs employé modifiables via le lien direction (liste blanche de sécurité).
// Le lien ne peut JAMAIS toucher aux données sensibles (email, téléphone, statut,
// dates, notes RH) ni créer/supprimer une fiche.
const EMPLOYEE_EDITABLE_FIELDS = [
  'manager_id',
  'service',
  'position',
  'position_constructeur',
  'sort_order',
  'is_co_manager',
];

// Champs capturés dans une archive pour permettre la restauration.
const SNAPSHOT_FIELDS = [
  'manager_id',
  'service',
  'position',
  'position_constructeur',
  'sort_order',
  'is_co_manager',
  'is_group_support',
];

// Délai minimal entre deux archives automatiques « avant modification » (ms).
const PRE_EDIT_THROTTLE_MS = 60 * 60 * 1000; // 1 heure

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

async function getServiceLayout(base44, companyId) {
  const layouts = await base44.asServiceRole.entities.ServiceLayout.filter({ company_id: companyId });
  return layouts && layouts.length ? layouts[0] : null;
}

async function ensurePreEditSnapshot(base44, companyId, employees, serviceLayout) {
  // Vérifie qu'une archive récente existe déjà ; sinon en crée une "avant modification".
  const existing = await base44.asServiceRole.entities.OrgSnapshot.filter({ company_id: companyId });
  const now = Date.now();
  const hasRecent = (existing || []).some((s) => {
    const t = new Date(s.created_date || s.updated_date || 0).getTime();
    return Number.isFinite(t) && now - t < PRE_EDIT_THROTTLE_MS;
  });
  if (hasRecent) return null;

  const data = buildSnapshotData(employees, serviceLayout);
  return base44.asServiceRole.entities.OrgSnapshot.create({
    company_id: companyId,
    label: `Avant modification — ${new Date().toLocaleString('fr-FR')}`,
    source: 'pre_edit',
    created_via: 'lien-direction',
    employee_count: employees.length,
    data: JSON.stringify(data),
  });
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const token = body?.token;
    if (!token) return Response.json({ error: 'Lien invalide' }, { status: 400 });

    // 1. Résolution + contrôle du jeton de partage
    const shares = await base44.asServiceRole.entities.ChartShare.filter({ token });
    const share = (shares || []).find((s) => s.is_active !== false);
    if (!share) return Response.json({ error: 'Lien invalide ou désactivé' }, { status: 404 });
    if (share.can_edit !== true) {
      return Response.json({ error: 'Ce lien ne permet pas la modification' }, { status: 403 });
    }

    const companyId = share.company_id;
    const ops = Array.isArray(body?.ops) ? body.ops : [];
    if (!ops.length) return Response.json({ error: 'Aucune modification fournie' }, { status: 400 });

    // 2. Charge l'état courant (scellé à la société du lien)
    const employees = await base44.asServiceRole.entities.Employee.filter({ company_id: companyId });
    const employeeById = new Map(employees.map((e) => [e.id, e]));
    const serviceLayout = await getServiceLayout(base44, companyId);

    // 3. Archive automatique "avant modification" (throttlée)
    const snapshot = await ensurePreEditSnapshot(base44, companyId, employees, serviceLayout);

    // 4. Application des opérations
    const applied = [];
    for (const op of ops) {
      if (op?.type === 'employee') {
        const target = employeeById.get(op.id);
        // Scellé : on refuse toute fiche hors de la société du lien.
        if (!target) continue;
        const fields = {};
        for (const f of EMPLOYEE_EDITABLE_FIELDS) {
          if (op.fields && Object.prototype.hasOwnProperty.call(op.fields, f)) {
            fields[f] = op.fields[f];
          }
        }
        // manager_id doit rester dans la même société (ou être vide = racine)
        if (Object.prototype.hasOwnProperty.call(fields, 'manager_id')) {
          const mid = fields.manager_id;
          if (mid && !employeeById.has(mid)) {
            delete fields.manager_id; // rattachement invalide ignoré
          }
        }
        if (Object.keys(fields).length === 0) continue;
        await base44.asServiceRole.entities.Employee.update(op.id, fields);
        applied.push({ type: 'employee', id: op.id, fields });
      } else if (op?.type === 'service_layout') {
        const positions = Array.isArray(op.positions) ? op.positions : [];
        const payload = { company_id: companyId, positions };
        if (op.page_format) payload.page_format = op.page_format;
        if (serviceLayout) {
          await base44.asServiceRole.entities.ServiceLayout.update(serviceLayout.id, payload);
        } else {
          await base44.asServiceRole.entities.ServiceLayout.create(payload);
        }
        applied.push({ type: 'service_layout', count: positions.length });
      }
    }

    // 5. Journalisation (best effort)
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        company_id: companyId,
        user_name: 'Lien direction',
        user_email: `partage:${String(token).slice(0, 8)}…`,
        action: 'update',
        entity_type: 'employee',
        details: `Modification via lien direction (${applied.length} opération(s))`,
      });
    } catch (_) { /* ignore */ }

    return Response.json({
      ok: true,
      applied: applied.length,
      snapshot_created: snapshot ? { id: snapshot.id, label: snapshot.label } : null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
