import { useState } from 'react';
import { Building2, Layers, MapPin, Globe } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ANCIENNES_ENTITES = ['GONNIN', 'QUITTE', 'DURIS', 'DBS'];
const ZONES = ['Zone Centre', 'Zone Ouest'];

const ASSIGNMENT_TYPES = [
  { value: 'agency', label: 'Agence', icon: Building2 },
  { value: 'ancienne_entite', label: 'Ancienne entité', icon: Layers },
  { value: 'zone', label: 'Zone', icon: MapPin },
  { value: 'groupe', label: 'Groupe entier', icon: Globe },
];

// Détermine le type d'affectation d'un employé
export function getAssignmentType(employee) {
  if (employee.agency_id) return 'agency';
  if (employee.ancienne_entite) return 'ancienne_entite';
  if (employee.zone) return 'zone';
  return 'groupe';
}

// Retourne le libellé d'affectation d'un employé
export function getAssignmentLabel(employee, agencies = []) {
  const type = getAssignmentType(employee);
  switch (type) {
    case 'agency': {
      const a = agencies.find(ag => ag.id === employee.agency_id);
      return a ? a.name : 'Agence inconnue';
    }
    case 'ancienne_entite':
      return employee.ancienne_entite;
    case 'zone':
      return employee.zone;
    case 'groupe':
      return 'Groupe GONNIN DURIS';
    default:
      return 'Non assigné';
  }
}

export default function AssignmentSelector({ form, agencies, onChange }) {
  const [selectedType, setSelectedType] = useState(() => getAssignmentType(form));

  const handleTypeChange = (type) => {
    setSelectedType(type);
    // Reset all assignment fields, then set the relevant one
    const update = { agency_id: null, ancienne_entite: null, zone: null, is_group_support: false };
    if (type === 'groupe') update.is_group_support = true;
    onChange({ ...form, ...update });
  };

  const set = (field, value) => onChange({ ...form, [field]: value });

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground mb-1 block">Affectation</label>
      <Select value={selectedType} onValueChange={handleTypeChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {ASSIGNMENT_TYPES.map(t => {
            const Icon = t.icon;
            return (
              <SelectItem key={t.value} value={t.value}>
                <span className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {selectedType === 'agency' && (
        <Select value={form.agency_id || ''} onValueChange={v => set('agency_id', v)}>
          <SelectTrigger><SelectValue placeholder="Sélectionner une agence..." /></SelectTrigger>
          <SelectContent>
            {agencies.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
      )}

      {selectedType === 'ancienne_entite' && (
        <Select value={form.ancienne_entite || ''} onValueChange={v => set('ancienne_entite', v)}>
          <SelectTrigger><SelectValue placeholder="Sélectionner une entité..." /></SelectTrigger>
          <SelectContent>
            {ANCIENNES_ENTITES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
      )}

      {selectedType === 'zone' && (
        <Select value={form.zone || ''} onValueChange={v => set('zone', v)}>
          <SelectTrigger><SelectValue placeholder="Sélectionner une zone..." /></SelectTrigger>
          <SelectContent>
            {ZONES.map(z => <SelectItem key={z} value={z}>{z}</SelectItem>)}
          </SelectContent>
        </Select>
      )}

      {selectedType === 'groupe' && (
        <div className="flex items-center gap-2 px-3 py-2 bg-lavender/50 rounded-lg text-sm text-primary">
          <Globe className="w-4 h-4" />
          <span>Rattaché au groupe GONNIN DURIS (transversal)</span>
        </div>
      )}
    </div>
  );
}