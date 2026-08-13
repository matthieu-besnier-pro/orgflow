import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const allCompanies = await base44.asServiceRole.entities.Company.list();

    // Admin → toutes les sociétés
    if (user.role === 'admin') {
      return Response.json({ companies: allCompanies });
    }

    // accessible_company_ids vide = super admin (toutes les sociétés)
    const accessIds = user.accessible_company_ids || [];
    if (accessIds.length === 0) {
      return Response.json({ companies: allCompanies });
    }

    // Filtrer les sociétés par accessible_company_ids
    const accessSet = new Set(accessIds);
    const companies = allCompanies.filter(c => accessSet.has(c.id));
    return Response.json({ companies });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}