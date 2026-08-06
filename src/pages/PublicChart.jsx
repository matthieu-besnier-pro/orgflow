import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Printer } from 'lucide-react';
import OrgTreeNode from '@/components/OrgTreeNode';

function buildChildrenMap(pool) {
  const ids = new Set(pool.map(e => e.id));
  const map = {};
  pool.forEach(e => {
    if (e.manager_id && ids.has(e.manager_id)) (map[e.manager_id] ||= []).push(e);
  });
  return map;
}

const noop = () => {};

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
    <div className="min-h-screen bg-white">
      <style>{`
        @media print {
          @page { size: A3 landscape; margin: 8mm; }
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
      <div className="no-print flex items-center gap-3 px-6 py-4 border-b border-border">
        {data.company?.logo_url && <img src={data.company.logo_url} alt="" className="h-8 object-contain" />}
        <h1 className="font-heading font-semibold text-foreground">{data.company?.name} — Organigramme</h1>
        <span className="text-xs text-muted-foreground">Consultation seule</span>
        <button onClick={() => window.print()} className="ml-auto flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-white text-sm font-medium">
          <Printer className="w-3.5 h-3.5" /> Imprimer / PDF A3
        </button>
      </div>
      <div className="p-8 overflow-auto">
        <div className="flex gap-12 items-start justify-center flex-wrap">
          {roots.map(root => (
            <OrgTreeNode
              key={root.id}
              employee={root}
              childrenMap={childrenMap}
              onSelect={noop}
              defaultExpanded
              depth={0}
              onDragStart={noop}
              onDrop={noop}
              template="classique"
            />
          ))}
        </div>
      </div>
    </div>
  );
}