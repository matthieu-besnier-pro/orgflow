import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ZoomIn, ZoomOut, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import OrgNode from '@/components/OrgNode';
import EmployeeDrawer from '@/components/EmployeeDrawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const SERVICE_ORDER = [
  "Direction", "Service Commercial", "Magasin", "Atelier",
  "Administratif", "Ressources Humaines", "Comptabilité", "Gestion",
  "Informatique", "Communication Marketing", "Support Technique", "Garanties",
  "Agriculture de Précision", "RSE", "Accueil Tél.", "Service Occasions",
  "Commercial Quads", "Commercial TP", "PY Pneus"
];

const SERVICE_COLORS = {
  "Direction": "bg-purple-100 text-purple-700 border-purple-200",
  "Service Commercial": "bg-blue-100 text-blue-700 border-blue-200",
  "Magasin": "bg-amber-100 text-amber-700 border-amber-200",
  "Atelier": "bg-orange-100 text-orange-700 border-orange-200",
  "Administratif": "bg-slate-100 text-slate-700 border-slate-200",
  "Ressources Humaines": "bg-pink-100 text-pink-700 border-pink-200",
  "Comptabilité": "bg-teal-100 text-teal-700 border-teal-200",
  "Gestion": "bg-cyan-100 text-cyan-700 border-cyan-200",
  "Informatique": "bg-indigo-100 text-indigo-700 border-indigo-200",
  "Communication Marketing": "bg-rose-100 text-rose-700 border-rose-200",
  "Support Technique": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Garanties": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Agriculture de Précision": "bg-lime-100 text-lime-700 border-lime-200",
  "RSE": "bg-green-100 text-green-700 border-green-200",
  "Accueil Tél.": "bg-sky-100 text-sky-700 border-sky-200",
  "Service Occasions": "bg-violet-100 text-violet-700 border-violet-200",
  "Commercial Quads": "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200",
  "Commercial TP": "bg-red-100 text-red-700 border-red-200",
  "PY Pneus": "bg-stone-100 text-stone-700 border-stone-200",
};

function ServiceSection({ service, employees, onSelect, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  const colorClass = SERVICE_COLORS[service] || "bg-gray-100 text-gray-700 border-gray-200";

  return (
    <div className={`border rounded-2xl overflow-hidden ${colorClass.split(' ')[2]}`}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-4 py-2.5 ${colorClass.split(' ')[0]} font-semibold text-sm`}
      >
        <span className={colorClass.split(' ')[1]}>{service} <span className="font-normal opacity-70">({employees.length})</span></span>
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {open && (
        <div className="p-4 bg-white">
          <div className="flex flex-wrap gap-3">
            {employees.map(e => (
              <OrgNode key={e.id} employee={e} onSelect={onSelect} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AgencyBlock({ agency, employees, onSelect }) {
  const [open, setOpen] = useState(true);

  const byService = {};
  employees.forEach(e => {
    const s = e.service || 'Autre';
    if (!byService[s]) byService[s] = [];
    byService[s].push(e);
  });

  const services = SERVICE_ORDER.filter(s => byService[s]).concat(
    Object.keys(byService).filter(s => !SERVICE_ORDER.includes(s))
  );

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 bg-primary/5 hover:bg-primary/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span className="font-heading font-semibold text-foreground">{agency.name}</span>
          <span className="text-sm text-muted-foreground">· {employees.length} collaborateurs</span>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="p-4 space-y-3">
          {services.map(s => (
            <ServiceSection
              key={s}
              service={s}
              employees={byService[s]}
              onSelect={onSelect}
              defaultOpen={employees.length < 30}
            />
          ))}
        </div>
      )}
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
  const [zoom, setZoom] = useState(1);
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

  const zones = ['all', 'Zone Centre', 'Zone Ouest', 'Support Groupe'];

  const filteredAgencies = agencies.filter(a => {
    if (selectedZone !== 'all' && a.zone !== selectedZone) return false;
    if (selectedAgency !== 'all' && a.id !== selectedAgency) return false;
    return true;
  });

  const getAgencyEmployees = (agencyId) =>
    employees.filter(e => e.agency_id === agencyId);

  const supportGroupEmployees = employees.filter(e => e.is_group_support);

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

        <Select value={selectedAgency} onValueChange={setSelectedAgency}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Agence" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les agences</SelectItem>
            {agencies
              .filter(a => selectedZone === 'all' || a.zone === selectedZone)
              .map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1 bg-secondary rounded-xl p-1">
          <button onClick={() => setZoom(z => Math.max(0.5, +(z - 0.1).toFixed(1)))} className="w-8 h-8 rounded-lg hover:bg-white flex items-center justify-center transition-colors">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-medium px-2 text-muted-foreground">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(1.5, +(z + 0.1).toFixed(1)))} className="w-8 h-8 rounded-lg hover:bg-white flex items-center justify-center transition-colors">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={() => setZoom(1)} className="w-8 h-8 rounded-lg hover:bg-white flex items-center justify-center transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-auto p-6">
        <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', transition: 'transform 0.2s ease' }}>
          <div className="space-y-6 min-w-max">
            {/* Support Groupe */}
            {(selectedZone === 'all' || selectedZone === 'Support Groupe') && selectedAgency === 'all' && supportGroupEmployees.length > 0 && (
              <AgencyBlock
                agency={{ name: 'Support Groupe', id: 'support' }}
                employees={supportGroupEmployees}
                onSelect={setSelectedEmployee}
              />
            )}

            {/* Agences */}
            {filteredAgencies
              .filter(a => a.name !== 'Support Groupe')
              .map(agency => {
                const agEmps = getAgencyEmployees(agency.id);
                if (agEmps.length === 0) return null;
                return (
                  <AgencyBlock
                    key={agency.id}
                    agency={agency}
                    employees={agEmps}
                    onSelect={setSelectedEmployee}
                  />
                );
              })}
          </div>
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