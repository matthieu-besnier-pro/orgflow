import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Building2, MapPin, Phone, Mail, Pencil, Trash2, Users, Layers } from 'lucide-react';
import AddAgencyModal from '@/components/AddAgencyModal';
import { useToast } from '@/components/ui/use-toast';
import { useCompany } from '@/lib/CompanyContext';
import AccessRequestButton from '@/components/AccessRequestButton';

const ZONE_COLORS = {
  'Zone Centre': 'bg-blue-100 text-blue-700',
  'Zone Ouest': 'bg-emerald-100 text-emerald-700',
  'Support Groupe': 'bg-purple-100 text-purple-700',
};

// Anciennes entités du groupe GONNIN DURIS
const ANCIENNE_ENTITE_MAP = {
  'Sauze': 'GONNIN',
  'Sauzé': 'GONNIN',
  'Sauzé-Vaussais': 'GONNIN',
  'Vaussais': 'GONNIN',
  'Naintré': 'GONNIN',
  'Chasseneuil': 'GONNIN',
  'La Ferrière': 'GONNIN',
  'Melle': 'QUITTE',
  'Niort': 'QUITTE',
  'Chatillon': 'QUITTE',
  'Vasles': 'QUITTE',
  'Luçay': 'DURIS',
  'Saint Maur': 'DURIS',
  'Issoudun': 'DURIS',
  'Noyers': 'DURIS',
  'PY Pneus': 'DURIS',
  'Arnac': 'DBS',
  'Arnac la Poste': 'DBS',
  'Rivarennes': 'DBS',
  'Béthines': 'DBS',
};

const ANCIENNES_ENTITES = ['GONNIN', 'QUITTE', 'DURIS', 'DBS'];

const ENTITE_COLORS = {
  'GONNIN': 'bg-blue-50 border-blue-200',
  'QUITTE': 'bg-emerald-50 border-emerald-200',
  'DURIS': 'bg-amber-50 border-amber-200',
  'DBS': 'bg-purple-50 border-purple-200',
};

const ENTITE_BADGE = {
  'GONNIN': 'bg-blue-100 text-blue-700',
  'QUITTE': 'bg-emerald-100 text-emerald-700',
  'DURIS': 'bg-amber-100 text-amber-700',
  'DBS': 'bg-purple-100 text-purple-700',
};

function getAncienneEntite(agency) {
  if (!agency) return null;
  const city = (agency.city || '').toLowerCase();
  const name = (agency.name || '').toLowerCase();
  for (const [key, entite] of Object.entries(ANCIENNE_ENTITE_MAP)) {
    if (city.includes(key.toLowerCase()) || name.includes(key.toLowerCase())) {
      return entite;
    }
  }
  return null;
}

export default function Agencies() {
  const [agencies, setAgencies] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAgency, setEditingAgency] = useState(null);
  const { toast } = useToast();
  const { selectedCompanyId, loading: companyLoading } = useCompany();

  useEffect(() => {
    loadData();
    const unsub = base44.entities.Agency.subscribe(() => loadData());
    return unsub;
  }, [selectedCompanyId]);

  const loadData = async () => {
    if (!selectedCompanyId) return;
    const [ags, emps] = await Promise.all([
      base44.entities.Agency.filter({ company_id: selectedCompanyId }),
      base44.entities.Employee.filter({ company_id: selectedCompanyId }),
    ]);
    setAgencies(ags);
    setEmployees(emps);
    setLoading(false);
  };

  if (companyLoading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-lavender border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!selectedCompanyId) return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
      <Building2 className="w-10 h-10 text-muted-foreground/40" />
      <p className="text-muted-foreground font-medium">Aucune société accessible avec ce compte</p>
      <p className="text-sm text-muted-foreground">Demandez l'accès à un administrateur.</p>
      <AccessRequestButton />
    </div>
  );

  const handleDelete = async (agency) => {
    const count = employees.filter(e => e.agency_id === agency.id).length;
    const msg = count > 0
      ? `${count} collaborateur(s) sont rattachés à cette agence. Veuillez d'abord les réaffecter.`
      : `Supprimer l'agence "${agency.name}" ?`;
    if (count > 0) {
      toast({ title: 'Suppression impossible', description: msg, variant: 'destructive', duration: 4000 });
      return;
    }
    if (!confirm(msg)) return;
    try {
      await base44.entities.Agency.delete(agency.id);
      toast({ title: 'Agence supprimée', duration: 3000 });
      loadData();
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de supprimer.', variant: 'destructive', duration: 3000 });
    }
  };

  const countEmployees = (id) => employees.filter(e => e.agency_id === id).length;
  const countEntityEmployees = (entite) => {
    const agencyIds = new Set(agencies.filter(a => getAncienneEntite(a) === entite).map(a => a.id));
    return employees.filter(e =>
      (e.agency_id && agencyIds.has(e.agency_id)) || e.ancienne_entite === entite
    ).length;
  };

  // Group agencies by old entity
  const grouped = {};
  const ungrouped = [];
  agencies.forEach(a => {
    const entite = getAncienneEntite(a);
    if (entite) {
      if (!grouped[entite]) grouped[entite] = [];
      grouped[entite].push(a);
    } else {
      ungrouped.push(a);
    }
  });

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-lavender border-t-primary rounded-full animate-spin" />
    </div>
  );

  const renderCard = (agency) => (
    <div key={agency.id} className="bg-white rounded-2xl border border-border p-5 card-hover">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-lavender flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-heading font-semibold text-foreground text-sm leading-tight">{agency.name}</p>
            <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 ${ZONE_COLORS[agency.zone] || 'bg-secondary text-muted-foreground'}`}>
              {agency.zone}
            </span>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={() => { setEditingAgency(agency); setShowModal(true); }} className="w-7 h-7 rounded-lg hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => handleDelete(agency)} className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-muted-foreground hover:text-red-500">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="space-y-1.5 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{agency.city}{agency.department_code ? ` (${agency.department_code})` : ''}</span>
        </div>
        {agency.phone && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{agency.phone}</span>
          </div>
        )}
        {agency.email && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{agency.email}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-muted-foreground pt-1 border-t border-border mt-2">
          <Users className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="font-medium text-foreground">{countEmployees(agency.id)}</span>
          <span>collaborateur(s)</span>
        </div>
      </div>

      {!agency.is_active && (
        <span className="inline-block mt-3 text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600">Inactive</span>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-canvas">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-4 bg-white border-b border-border">
        <Building2 className="w-5 h-5 text-primary" />
        <h1 className="font-heading font-semibold text-foreground text-base">Agences</h1>
        <span className="text-sm text-muted-foreground">({agencies.length})</span>
        <div className="flex-1" />
        <button
          onClick={() => { setEditingAgency(null); setShowModal(true); }}
          className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nouvelle agence</span>
        </button>
      </div>

      {/* Grid grouped by old entity */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {ANCIENNES_ENTITES.filter(e => grouped[e]?.length > 0).map(entite => (
          <div key={entite}>
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-heading font-semibold text-foreground text-sm">{entite}</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full ${ENTITE_BADGE[entite]}`}>
                {grouped[entite].length} agence(s) · {countEntityEmployees(entite)} collab.
              </span>
              <div className="flex-1 h-px bg-border ml-2" />
            </div>
            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 rounded-2xl border ${ENTITE_COLORS[entite]}`}>
              {grouped[entite].map(renderCard)}
            </div>
          </div>
        ))}

        {ungrouped.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-heading font-semibold text-foreground text-sm">Autres</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                {ungrouped.length} agence(s)
              </span>
              <div className="flex-1 h-px bg-border ml-2" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ungrouped.map(renderCard)}
            </div>
          </div>
        )}

        {agencies.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
            <Building2 className="w-10 h-10 text-muted-foreground/40" />
            <p className="text-muted-foreground font-medium">Aucune agence</p>
            <button onClick={() => { setEditingAgency(null); setShowModal(true); }} className="text-sm text-primary hover:underline">Créer la première agence</button>
          </div>
        )}
      </div>

      {showModal && (
        <AddAgencyModal
          agency={editingAgency}
          onClose={() => setShowModal(false)}
          onSaved={loadData}
        />
      )}
    </div>
  );
}