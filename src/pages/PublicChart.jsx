import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Printer } from 'lucide-react';
import OrgChartExactPrint from '@/components/OrgChartExactPrint';

function buildChildrenMap(pool) {
  const ids = new Set(pool.map(e => e.id));
  const map = {};
  pool.forEach(e => {
    if (e.manager_id && ids.has(e.manager_id)) (map[e.manager_id] ||= []).push(e);
  });
  return map;
}

export default function PublicChart() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    base44.functions.invoke('publicChart', { token })
      .then(res => setData(res.data))
      .catch(() => setError('Ce lien de partage est invalide ou désactivé.'));
  }, []);

  if (error) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">{error}</div>;
  if (!data) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-lavender border-t-primary rounded-full animate-spin" />
    </div>
  );

  const childrenMap = buildChildrenMap(data.employees);
  const ids = new Set(data.employees.map(e => e.id));
  const roots = data.employees.filter(e => !e.manager_id || !ids.has(e.manager_id));

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="no-print flex items-center gap-3 px-6 py-4 border-b border-border bg-white print:hidden">
        {data.company?.logo_url && <img src={data.company.logo_url} alt="" className="h-8 object-contain" />}
        <h1 className="font-heading font-semibold text-foreground">{data.company?.name} — Organigramme</h1>
        <span className="text-xs text-muted-foreground">Consultation seule</span>
        <button onClick={() => window.print()} className="ml-auto flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-white text-sm font-medium">
          <Printer className="w-3.5 h-3.5" /> Imprimer / PDF A3
        </button>
      </div>
      <div className="p-6 overflow-auto">
        <OrgChartExactPrint
          roots={roots}
          childrenMap={childrenMap}
          pageFormat="A3-paysage"
          template="classique"
          company={data.company}
        />
      </div>
    </div>
  );
}