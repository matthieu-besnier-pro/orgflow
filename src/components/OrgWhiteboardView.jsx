import { useState } from 'react';
import { Pin, Printer } from 'lucide-react';

const STATUS_DOT = {
  'Actif': 'bg-emerald-400',
  'En recrutement': 'bg-yellow-400',
  'Apprenti': 'bg-blue-400',
  'Alternant': 'bg-purple-400',
  'Départ': 'bg-red-400',
};

const SERVICE_COLORS = [
  { header: 'bg-primary', text: 'text-white' },
  { header: 'bg-blue-600', text: 'text-white' },
  { header: 'bg-emerald-600', text: 'text-white' },
  { header: 'bg-amber-500', text: 'text-white' },
  { header: 'bg-rose-500', text: 'text-white' },
  { header: 'bg-violet-600', text: 'text-white' },
  { header: 'bg-cyan-600', text: 'text-white' },
  { header: 'bg-orange-500', text: 'text-white' },
  { header: 'bg-teal-600', text: 'text-white' },
  { header: 'bg-indigo-600', text: 'text-white' },
  { header: 'bg-fuchsia-600', text: 'text-white' },
  { header: 'bg-lime-600', text: 'text-white' },
];

const SERVICES_ORDER = [
  'Direction',
  'Service Commercial',
  'Magasin',
  'Atelier',
  'Administratif',
  'Ressources Humaines',
  'Comptabilité',
  'Gestion',
  'Informatique',
  'Communication Marketing',
  'Support Technique',
  'Garanties',
  'Agriculture de Précision',
  'RSE',
  'Accueil Tél.',
  'Service Occasions',
  'Commercial Quads',
  'Commercial TP',
  'PY Pneus',
];

function StickyCard({ employee, agencyName, onSelect, searchTerm }) {
  const initials = `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`.toUpperCase();
  const dot = STATUS_DOT[employee.status] || 'bg-gray-300';

  const haystack = `${employee.first_name} ${employee.last_name} ${employee.position || ''}`.toLowerCase();
  const isHighlighted = searchTerm && haystack.includes(searchTerm.toLowerCase());
  const isDimmed = searchTerm && !isHighlighted;

  return (
    <div
      onClick={() => onSelect(employee)}
      className={`relative bg-white rounded-md shadow-sm border border-border/70 px-2 py-1.5 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 ${isDimmed ? 'opacity-25' : 'opacity-100'} ${isHighlighted ? 'ring-2 ring-amber-400' : ''}`}
    >
      <div className="flex items-center gap-1.5">
        <div className="relative flex-shrink-0">
          {employee.photo_url ? (
            <img src={employee.photo_url} alt={initials} className="w-7 h-7 rounded-full object-cover border border-border" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-lavender flex items-center justify-center">
              <span className="text-[9px] font-bold text-primary">{initials}</span>
            </div>
          )}
          <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${dot}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold text-foreground leading-tight truncate">{employee.first_name}</p>
          <p className="text-[10px] font-bold text-foreground leading-tight truncate">{employee.last_name}</p>
        </div>
      </div>
      <p className="text-muted-foreground leading-tight mt-0.5 truncate" style={{ fontSize: '8px' }}>{employee.position}</p>
      {agencyName && (
        <p className="text-muted-foreground/60 leading-tight truncate" style={{ fontSize: '7px' }}>{agencyName}</p>
      )}
    </div>
  );
}

function ServiceColumn({ service, employees, agencyMap, onSelect, searchTerm, colorIndex }) {
  const [collapsed, setCollapsed] = useState(false);
  const color = SERVICE_COLORS[colorIndex % SERVICE_COLORS.length];

  const byAgency = {};
  employees.forEach(e => {
    const agName = agencyMap[e.agency_id] || 'Support Groupe';
    if (!byAgency[agName]) byAgency[agName] = [];
    byAgency[agName].push(e);
  });
  const agencyGroups = Object.entries(byAgency);
  const showAgencyGroups = agencyGroups.length > 1;

  return (
    <div className="flex flex-col min-w-[120px] max-w-[150px] flex-1">
      <button
        onClick={() => setCollapsed(v => !v)}
        className={`mb-1.5 px-2 py-1.5 rounded-t-md ${color.header} ${color.text} text-left flex items-center justify-between gap-1`}
      >
        <div className="min-w-0">
          <p className="text-[11px] font-bold leading-tight truncate">{service}</p>
          <p className="opacity-80 leading-tight" style={{ fontSize: '8px' }}>{employees.length} pers.</p>
        </div>
        <Pin className="w-3 h-3 flex-shrink-0 opacity-70" />
      </button>
      <div className="bg-secondary/30 rounded-b-md p-1.5 flex-1 min-h-[40px]">
        {!collapsed && (
          <div className="flex flex-col gap-1.5">
            {showAgencyGroups ? agencyGroups.map(([agName, emps]) => (
              <div key={agName}>
                <p className="text-muted-foreground font-medium mb-1 px-0.5" style={{ fontSize: '7px' }}>{agName}</p>
                <div className="flex flex-col gap-1">
                  {emps.map(e => (
                    <StickyCard
                      key={e.id}
                      employee={e}
                      agencyName={null}
                      onSelect={onSelect}
                      searchTerm={searchTerm}
                    />
                  ))}
                </div>
              </div>
            )) : (
              employees.map(e => (
                <StickyCard
                  key={e.id}
                  employee={e}
                  agencyName={null}
                  onSelect={onSelect}
                  searchTerm={searchTerm}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function OrgWhiteboardView({ employees, agencies, onSelect, searchTerm = '', company = null }) {
  const agencyMap = {};
  agencies.forEach(a => { agencyMap[a.id] = a.name; });

  const byService = {};
  employees.forEach(e => {
    const svc = e.service || 'Autre';
    if (!byService[svc]) byService[svc] = [];
    byService[svc].push(e);
  });

  const sortedServices = Object.keys(byService).sort((a, b) => {
    const ia = SERVICES_ORDER.indexOf(a);
    const ib = SERVICES_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b, 'fr');
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  return (
    <div className="mx-auto" style={{ width: '100%', maxWidth: '1600px' }}>
      <style>{`
        @media print {
          @page { size: A3 landscape; margin: 8mm; }
          body * { visibility: hidden; }
          #whiteboard-print, #whiteboard-print * { visibility: visible; }
          #whiteboard-print { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; border: none; }
          .whiteboard-no-print { display: none !important; }
        }
      `}</style>

      <div className="flex justify-end mb-2 whiteboard-no-print">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-sm font-medium bg-primary text-white hover:opacity-90"
        >
          <Printer className="w-3.5 h-3.5" />
          Imprimer / PDF (A3 paysage)
        </button>
      </div>

      {/* Whiteboard surface */}
      <div id="whiteboard-print" className="relative bg-white rounded-lg shadow-xl border-4 border-slate-200 p-4"
        style={{
          backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)',
          backgroundSize: '16px 16px',
          minHeight: '500px',
        }}
      >
        {/* Company title */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-slate-200">
          <div className="flex items-center gap-2">
            {company?.logo_url && <img src={company.logo_url} alt={company.name} className="h-7 w-auto object-contain" />}
            <h2 className="font-heading font-bold text-slate-700 text-lg">{company?.name || 'Organigramme'}</h2>
          </div>
          <span className="text-xs text-slate-400 font-medium">Tableau blanc — {employees.length} collaborateurs</span>
        </div>

        {/* Services row */}
        <div className="flex gap-2 items-stretch flex-wrap">
          {sortedServices.map((service, i) => (
            <ServiceColumn
              key={service}
              service={service}
              employees={byService[service]}
              agencyMap={agencyMap}
              onSelect={onSelect}
              searchTerm={searchTerm}
              colorIndex={i}
            />
          ))}
        </div>
      </div>
    </div>
  );
}