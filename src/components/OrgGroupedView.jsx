import { useState } from 'react';
import { ChevronDown, ChevronRight, MapPin } from 'lucide-react';

const STATUS_DOT = {
  'Actif': 'bg-emerald-400',
  'En recrutement': 'bg-yellow-400',
  'Apprenti': 'bg-blue-400',
  'Alternant': 'bg-purple-400',
  'Départ': 'bg-red-400',
};

const ANCIENNE_ENTITE_MAP = {
  'Sauze': 'GONNIN', 'Sauzé': 'GONNIN', 'Sauzé-Vaussais': 'GONNIN', 'Vaussais': 'GONNIN',
  'Naintré': 'GONNIN', 'Chasseneuil': 'GONNIN', 'La Ferrière': 'GONNIN',
  'Melle': 'QUITTE', 'Niort': 'QUITTE', 'Chatillon': 'QUITTE', 'Vasles': 'QUITTE',
  'Luçay': 'DURIS', 'Saint Maur': 'DURIS', 'Issoudun': 'DURIS', 'Noyers': 'DURIS', 'PY Pneus': 'DURIS',
  'Arnac': 'DBS', 'Arnac la Poste': 'DBS', 'Rivarennes': 'DBS', 'Béthines': 'DBS',
};

const ZONE_ORDER = ['Zone Centre', 'Zone Ouest', 'Support Groupe'];
const ENTITE_ORDER = ['GONNIN', 'QUITTE', 'DURIS', 'DBS'];

const ZONE_STYLES = {
  'Zone Centre': { bg: 'bg-blue-50/50', border: 'border-blue-200', header: 'bg-blue-100 text-blue-700' },
  'Zone Ouest': { bg: 'bg-emerald-50/50', border: 'border-emerald-200', header: 'bg-emerald-100 text-emerald-700' },
  'Support Groupe': { bg: 'bg-purple-50/50', border: 'border-purple-200', header: 'bg-purple-100 text-purple-700' },
};

const ENTITE_STYLES = {
  'GONNIN': { bg: 'bg-blue-50/50', border: 'border-blue-200', header: 'bg-blue-100 text-blue-700' },
  'QUITTE': { bg: 'bg-emerald-50/50', border: 'border-emerald-200', header: 'bg-emerald-100 text-emerald-700' },
  'DURIS': { bg: 'bg-amber-50/50', border: 'border-amber-200', header: 'bg-amber-100 text-amber-700' },
  'DBS': { bg: 'bg-purple-50/50', border: 'border-purple-200', header: 'bg-purple-100 text-purple-700' },
};

const DEFAULT_STYLE = { bg: 'bg-white', border: 'border-border', header: 'bg-lavender text-primary' };

const positionOrder = ['Directeur', 'Président', 'Responsable', 'Resp.', 'Manager', 'Chef', 'Commercial', 'Technicien', 'Magasinier'];

function getAncienneEntite(agency) {
  if (!agency) return null;
  const city = agency.city || '';
  const name = agency.name || '';
  for (const [key, entite] of Object.entries(ANCIENNE_ENTITE_MAP)) {
    if (city.toLowerCase().includes(key.toLowerCase()) || name.toLowerCase().includes(key.toLowerCase())) {
      return entite;
    }
  }
  return null;
}

function sortEmployees(emps) {
  return [...emps].sort((a, b) => {
    const ia = positionOrder.findIndex(p => a.position?.includes(p));
    const ib = positionOrder.findIndex(p => b.position?.includes(p));
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

function EmployeeCard({ employee, agencyName, onSelect, searchTerm, showAgency }) {
  const initials = `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`.toUpperCase();
  const dot = STATUS_DOT[employee.status] || 'bg-gray-300';
  const haystack = `${employee.first_name} ${employee.last_name} ${employee.position || ''} ${employee.service || ''}`.toLowerCase();
  const isHighlighted = searchTerm && haystack.includes(searchTerm.toLowerCase());
  const isDimmed = searchTerm && !isHighlighted;

  return (
    <div
      onClick={() => onSelect(employee)}
      className={`flex items-center gap-3 bg-white rounded-xl border border-border p-3 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer ${isDimmed ? 'opacity-25' : 'opacity-100'} ${isHighlighted ? 'ring-2 ring-amber-400' : ''}`}
    >
      <div className="relative flex-shrink-0">
        {employee.photo_url ? (
          <img src={employee.photo_url} alt={initials} className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-lavender flex items-center justify-center">
            <span className="text-xs font-bold text-primary">{initials}</span>
          </div>
        )}
        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${dot}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{employee.first_name} {employee.last_name}</p>
        <p className="text-xs text-muted-foreground truncate">{employee.position}</p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {employee.service && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground truncate max-w-[120px]">{employee.service}</span>
          )}
          {showAgency && agencyName && (
            <span className="text-[10px] text-muted-foreground/70 truncate flex items-center gap-0.5">
              <MapPin className="w-2.5 h-2.5 flex-shrink-0" />{agencyName}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function GroupSection({ title, employees, agencyMap, onSelect, searchTerm, showAgency, style }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`rounded-2xl border ${style.border} ${style.bg} overflow-hidden`}>
      <button
        onClick={() => setCollapsed(v => !v)}
        className={`w-full flex items-center gap-2 px-4 py-3 ${style.header} font-semibold text-sm`}
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        <span>{title}</span>
        <span className="ml-auto text-xs font-normal px-2 py-0.5 rounded-full bg-white/60">
          {employees.length} pers.
        </span>
      </button>
      {!collapsed && (
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {employees.map(e => (
            <EmployeeCard
              key={e.id}
              employee={e}
              agencyName={agencyMap[e.agency_id]}
              onSelect={onSelect}
              searchTerm={searchTerm}
              showAgency={showAgency}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function OrgGroupedView({ employees, agencies, groupBy, onSelect, searchTerm = '' }) {
  const agencyMap = {};
  agencies.forEach(a => { agencyMap[a.id] = a; });

  const getGroup = (e) => {
    if (groupBy === 'zone') {
      if (e.is_group_support) return 'Support Groupe';
      const agency = agencyMap[e.agency_id];
      return agency?.zone || e.zone || 'Autre';
    }
    if (groupBy === 'entite') {
      if (e.is_group_support) return 'Support Groupe';
      if (e.ancienne_entite) return e.ancienne_entite;
      const agency = agencyMap[e.agency_id];
      return getAncienneEntite(agency) || 'Autre';
    }
    if (groupBy === 'agency') {
      if (e.is_group_support) return 'Support Groupe';
      const agency = agencyMap[e.agency_id];
      return agency?.name || 'Autre';
    }
    return 'Autre';
  };

  const groups = {};
  employees.forEach(e => {
    const g = getGroup(e);
    if (!groups[g]) groups[g] = [];
    groups[g].push(e);
  });

  let sortedGroups;
  if (groupBy === 'zone') {
    sortedGroups = Object.keys(groups).sort((a, b) => {
      const ia = ZONE_ORDER.indexOf(a), ib = ZONE_ORDER.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
  } else if (groupBy === 'entite') {
    sortedGroups = Object.keys(groups).sort((a, b) => {
      const ia = ENTITE_ORDER.indexOf(a), ib = ENTITE_ORDER.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
  } else {
    sortedGroups = Object.keys(groups).sort((a, b) => a.localeCompare(b, 'fr'));
  }

  const getStyle = (group) => {
    if (groupBy === 'zone') return ZONE_STYLES[group] || DEFAULT_STYLE;
    if (groupBy === 'entite') return ENTITE_STYLES[group] || DEFAULT_STYLE;
    return DEFAULT_STYLE;
  };

  const showAgency = groupBy !== 'agency';

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {sortedGroups.map(group => (
        <GroupSection
          key={group}
          title={group}
          employees={sortEmployees(groups[group])}
          agencyMap={agencyMap}
          onSelect={onSelect}
          searchTerm={searchTerm}
          showAgency={showAgency}
          style={getStyle(group)}
        />
      ))}
    </div>
  );
}