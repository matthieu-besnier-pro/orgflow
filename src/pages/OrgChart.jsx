import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';
import EmployeeDrawer from '@/components/EmployeeDrawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Ordre des colonnes de services (comme dans le PDF)
const SERVICE_COLUMNS = {
  "Zone Ouest": [
    "Service Commercial", "Magasin", "Atelier", "Administratif",
    "Accueil Tél.", "Service Occasions", "Commercial Quads", "Commercial TP"
  ],
  "Zone Centre": [
    "Service Commercial", "Magasin", "Atelier", "Administratif",
    "Accueil Tél.", "Service Occasions", "Commercial Quads", "Commercial TP"
  ],
  "Support Groupe": [
    "Direction", "Administratif", "Ressources Humaines", "Comptabilité",
    "Gestion", "Informatique", "Communication Marketing", "Support Technique",
    "Garanties", "Agriculture de Précision", "RSE", "Service Occasions",
    "Service Commercial", "Magasin", "Atelier", "Accueil Tél.", "PY Pneus"
  ]
};

const STATUS_COLORS = {
  'Actif': 'border-emerald-400',
  'En recrutement': 'border-yellow-400',
  'Apprenti': 'border-blue-400',
  'Alternant': 'border-purple-400',
  'Départ': 'border-red-400',
};

const STATUS_BADGE = {
  'En recrutement': 'bg-yellow-100 text-yellow-700',
  'Apprenti': 'bg-blue-100 text-blue-700',
  'Alternant': 'bg-purple-100 text-purple-700',
  'Départ': 'bg-red-100 text-red-700',
};

function EmployeeCard({ employee, onSelect }) {
  const initials = `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`.toUpperCase();
  const borderColor = STATUS_COLORS[employee.status] || 'border-gray-200';
  const badge = STATUS_BADGE[employee.status];

  return (
    <div
      onClick={() => onSelect(employee)}
      className={`bg-white rounded-xl border-2 ${borderColor} shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 cursor-pointer p-2 flex flex-col items-center text-center w-28 flex-shrink-0`}
    >
      {employee.photo_url ? (
        <img src={employee.photo_url} alt={initials} className="w-14 h-14 rounded-full object-cover mb-1.5" />
      ) : (
        <div className="w-14 h-14 rounded-full bg-lavender flex items-center justify-center mb-1.5 flex-shrink-0">
          <span className="text-base font-bold text-primary">{initials}</span>
        </div>
      )}
      <p className="text-xs font-semibold text-foreground leading-tight">{employee.first_name}</p>
      <p className="text-xs font-semibold text-foreground leading-tight">{employee.last_name}</p>
      <p className="text-xs text-muted-foreground mt-0.5 leading-tight text-center" style={{fontSize:'9px'}}>{employee.position}</p>
      {badge && (
        <span className={`mt-1 text-xs px-1.5 py-0.5 rounded-full font-medium ${badge}`} style={{fontSize:'8px'}}>{employee.status}</span>
      )}
    </div>
  );
}

function ServiceColumn({ service, employees, onSelect }) {
  return (
    <div className="flex flex-col items-center min-w-0">
      {/* Header */}
      <div className="bg-primary/10 border border-primary/20 rounded-xl px-3 py-1.5 mb-3 w-full text-center">
        <p className="text-xs font-semibold text-primary leading-tight">{service}</p>
      </div>
      {/* Cards */}
      <div className="flex flex-col gap-2 items-center">
        {employees.map(e => (
          <EmployeeCard key={e.id} employee={e} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

function AgencyOrgChart({ agency, employees, onSelect, zone }) {
  const columnOrder = SERVICE_COLUMNS[zone] || SERVICE_COLUMNS["Zone Ouest"];

  const byService = {};
  employees.forEach(e => {
    const s = e.service || 'Autre';
    if (!byService[s]) byService[s] = [];
    byService[s].push(e);
  });

  const orderedServices = [
    ...columnOrder.filter(s => byService[s]),
    ...Object.keys(byService).filter(s => !columnOrder.includes(s))
  ];

  if (orderedServices.length === 0) return null;

  return (
    <div className="mb-10">
      {/* Agency Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-border" />
        <div className="bg-primary text-white rounded-xl px-5 py-2 shadow-sm">
          <span className="font-heading font-semibold text-sm">{agency.name}</span>
          <span className="text-white/70 text-xs ml-2">· {employees.length} collaborateurs</span>
        </div>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Columns */}
      <div className="flex gap-4 items-start overflow-x-auto pb-2">
        {orderedServices.map(service => (
          <ServiceColumn
            key={service}
            service={service}
            employees={byService[service]}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

export default function OrgChart() {
  const [employees, setEmployees] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [selectedZone, setSelectedZone] = useState('all');
  const [selectedAgency, setSelectedAgency] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [user, setUser] = useState(null);
  const [zoom, setZoom] = useState(0.9);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Employee.list(),
      base44.entities.Agency.list(),
      base44.auth.me()
    ]).then(([emps, ags, u]) => {
      setEmployees(emps);
      setAgencies(ags);
      setUser(u);
      setLoading(false);
    });
  }, []);

  const isHR = user?.role === 'admin';

  const filteredAgencies = agencies.filter(a => {
    if (selectedZone !== 'all' && a.zone !== selectedZone) return false;
    if (selectedAgency !== 'all' && a.id !== selectedAgency) return false;
    return true;
  });

  const getEmployees = (agencyId, isSupport = false) => {
    if (isSupport) return employees.filter(e => e.is_group_support);
    return employees.filter(e => e.agency_id === agencyId && !e.is_group_support);
  };

  const handleSave = (updated) => {
    setEmployees(prev => prev.map(e => e.id === updated.id ? updated : e));
    setSelectedEmployee(null);
  };
  const handleDelete = (id) => {
    setEmployees(prev => prev.filter(e => e.id !== id));
    setSelectedEmployee(null);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-lavender border-t-primary rounded-full animate-spin" />
    </div>
  );

  const showSupport = selectedZone === 'all' || selectedZone === 'Support Groupe';
  const showAgencies = selectedZone !== 'Support Groupe';

  return (
    <div className="flex flex-col h-full bg-canvas">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-4 bg-white border-b border-border flex-wrap">
        <h1 className="font-heading font-semibold text-foreground text-lg flex-1 min-w-0">Organigramme</h1>

        <Select value={selectedZone} onValueChange={v => { setSelectedZone(v); setSelectedAgency('all'); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Zone" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les zones</SelectItem>
            <SelectItem value="Zone Centre">Zone Centre</SelectItem>
            <SelectItem value="Zone Ouest">Zone Ouest</SelectItem>
            <SelectItem value="Support Groupe">Support Groupe</SelectItem>
          </SelectContent>
        </Select>

        {selectedZone !== 'Support Groupe' && (
          <Select value={selectedAgency} onValueChange={setSelectedAgency}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Agence" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les agences</SelectItem>
              {agencies
                .filter(a => selectedZone === 'all' || a.zone === selectedZone)
                .map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        <div className="flex items-center gap-1 bg-secondary rounded-xl p-1">
          <button onClick={() => setZoom(z => Math.max(0.4, +(z - 0.1).toFixed(1)))} className="w-8 h-8 rounded-lg hover:bg-white flex items-center justify-center transition-colors">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-medium px-2 text-muted-foreground">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(1.5, +(z + 0.1).toFixed(1)))} className="w-8 h-8 rounded-lg hover:bg-white flex items-center justify-center transition-colors">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={() => setZoom(0.9)} className="w-8 h-8 rounded-lg hover:bg-white flex items-center justify-center transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-auto p-6">
        <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', transition: 'transform 0.2s ease', minWidth: 'max-content' }}>

          {/* SUPPORT GROUPE */}
          {showSupport && selectedAgency === 'all' && (
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-px bg-border" />
                <div className="bg-foreground text-white rounded-xl px-6 py-2.5 shadow-md">
                  <span className="font-heading font-bold text-base tracking-wide">SUPPORT GROUPE</span>
                </div>
                <div className="flex-1 h-px bg-border" />
              </div>
              <AgencyOrgChart
                agency={{ name: 'Support Groupe' }}
                employees={getEmployees(null, true)}
                onSelect={setSelectedEmployee}
                zone="Support Groupe"
              />
            </div>
          )}

          {/* AGENCES */}
          {showAgencies && filteredAgencies
            .filter(a => a.name !== 'Support Groupe')
            .map(agency => {
              const emps = getEmployees(agency.id);
              if (emps.length === 0) return null;
              return (
                <AgencyOrgChart
                  key={agency.id}
                  agency={agency}
                  employees={emps}
                  onSelect={setSelectedEmployee}
                  zone={agency.zone}
                />
              );
            })}
        </div>
      </div>

      {selectedEmployee && (
        <EmployeeDrawer
          employee={selectedEmployee}
          agencies={agencies}
          allEmployees={employees}
          isHR={isHR}
          onClose={() => setSelectedEmployee(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}