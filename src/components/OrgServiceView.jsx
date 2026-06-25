import { useState } from 'react';

const STATUS_BORDER = {
  'Actif': 'border-emerald-400',
  'En recrutement': 'border-yellow-400',
  'Apprenti': 'border-blue-400',
  'Alternant': 'border-purple-400',
  'Départ': 'border-red-400',
};

const STATUS_DOT = {
  'Actif': 'bg-emerald-400',
  'En recrutement': 'bg-yellow-400',
  'Apprenti': 'bg-blue-400',
  'Alternant': 'bg-purple-400',
  'Départ': 'bg-red-400',
};

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

function EmployeeCard({ employee, agencyName, onSelect, searchTerm }) {
  const initials = `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`.toUpperCase();
  const borderColor = STATUS_BORDER[employee.status] || 'border-gray-200';
  const dot = STATUS_DOT[employee.status] || 'bg-gray-300';

  const haystack = `${employee.first_name} ${employee.last_name} ${employee.position || ''}`.toLowerCase();
  const isHighlighted = searchTerm && haystack.includes(searchTerm.toLowerCase());
  const isDimmed = searchTerm && !isHighlighted;

  return (
    <div
      onClick={() => onSelect(employee)}
      className={`flex flex-col items-center text-center cursor-pointer group transition-opacity duration-150 ${isDimmed ? 'opacity-25' : 'opacity-100'}`}
    >
      <div className={`relative mb-1.5`}>
        {employee.photo_url ? (
          <img
            src={employee.photo_url}
            alt={initials}
            className={`w-14 h-14 rounded-full object-cover border-2 ${isHighlighted ? 'border-amber-400 ring-2 ring-amber-300' : borderColor} group-hover:scale-105 transition-transform`}
          />
        ) : (
          <div className={`w-14 h-14 rounded-full bg-lavender border-2 ${isHighlighted ? 'border-amber-400 ring-2 ring-amber-300' : borderColor} flex items-center justify-center group-hover:scale-105 transition-transform`}>
            <span className="text-sm font-bold text-primary">{initials}</span>
          </div>
        )}
        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${dot}`} />
      </div>
      <p className="text-xs font-semibold text-foreground leading-tight">{employee.first_name} {employee.last_name}</p>
      <p className="text-muted-foreground leading-tight mt-0.5" style={{ fontSize: '9px' }}>{employee.position}</p>
      {agencyName && (
        <p className="text-muted-foreground/70 leading-tight mt-0.5" style={{ fontSize: '8px' }}>{agencyName}</p>
      )}
    </div>
  );
}

function ServiceColumn({ service, employees, agencyMap, onSelect, searchTerm }) {
  const [collapsed, setCollapsed] = useState(false);

  // Group by agency within service
  const byAgency = {};
  employees.forEach(e => {
    const agName = agencyMap[e.agency_id] || 'Support Groupe';
    if (!byAgency[agName]) byAgency[agName] = [];
    byAgency[agName].push(e);
  });

  const agencyGroups = Object.entries(byAgency);
  const showAgencyGroups = agencyGroups.length > 1;

  return (
    <div className="flex flex-col min-w-[110px] max-w-[140px]">
      {/* Service header */}
      <button
        onClick={() => setCollapsed(v => !v)}
        className="mb-3 pb-1 border-b-2 border-primary/40 text-left group"
      >
        <p className="text-xs font-bold text-primary leading-tight group-hover:text-primary/80 transition-colors">{service}</p>
        <p className="text-muted-foreground" style={{ fontSize: '9px' }}>{employees.length} pers.</p>
      </button>

      {!collapsed && (
        <div className="flex flex-col gap-4">
          {showAgencyGroups ? agencyGroups.map(([agName, emps]) => (
            <div key={agName}>
              <p className="text-muted-foreground font-medium mb-2 pb-0.5 border-b border-border/60" style={{ fontSize: '8px' }}>{agName}</p>
              <div className="flex flex-col gap-3">
                {emps.map(e => (
                  <EmployeeCard
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
            <div className="flex flex-col gap-3">
              {employees.map(e => (
                <EmployeeCard
                  key={e.id}
                  employee={e}
                  agencyName={agencyGroups.length === 1 ? null : agencyMap[e.agency_id]}
                  onSelect={onSelect}
                  searchTerm={searchTerm}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function OrgServiceView({ employees, agencies, onSelect, searchTerm = '' }) {
  const agencyMap = {};
  agencies.forEach(a => { agencyMap[a.id] = a.name; });

  // Group employees by service
  const byService = {};
  employees.forEach(e => {
    const svc = e.service || 'Autre';
    if (!byService[svc]) byService[svc] = [];
    byService[svc].push(e);
  });

  // Sort services by predefined order, then alphabetically
  const sortedServices = Object.keys(byService).sort((a, b) => {
    const ia = SERVICES_ORDER.indexOf(a);
    const ib = SERVICES_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b, 'fr');
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  return (
    <div className="flex gap-6 items-start flex-wrap px-2">
      {sortedServices.map(service => (
        <ServiceColumn
          key={service}
          service={service}
          employees={byService[service]}
          agencyMap={agencyMap}
          onSelect={onSelect}
          searchTerm={searchTerm}
        />
      ))}
    </div>
  );
}