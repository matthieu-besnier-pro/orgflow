import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const token = body?.token;
    if (!token) return Response.json({ error: 'Lien invalide' }, { status: 400 });

    const shares = await base44.asServiceRole.entities.ChartShare.filter({ token });
    const share = shares.find((s) => s.is_active !== false);
    if (!share) return Response.json({ error: 'Lien invalide ou désactivé' }, { status: 404 });

    const company = await base44.asServiceRole.entities.Company.get(share.company_id);
    const employees = await base44.asServiceRole.entities.Employee.filter({ company_id: share.company_id });

    return Response.json({
      company: company ? { name: company.name, logo_url: company.logo_url, brand_color: company.brand_color, services: company.services || [] } : null,
      service_sort_mode: share.service_sort_mode || 'alpha',
      employees: employees.map((e) => ({
        id: e.id,
        first_name: e.first_name,
        last_name: e.last_name,
        position: e.position,
        service: e.service,
        photo_url: e.photo_url,
        status: e.status,
        manager_id: e.manager_id,
      })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}