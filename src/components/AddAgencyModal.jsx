import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ZONES = ['Zone Centre', 'Zone Ouest', 'Support Groupe'];

export default function AddAgencyModal({ agency, onClose, onSaved }) {
  const isEdit = !!agency;
  const [form, setForm] = useState({
    name: agency?.name || '',
    zone: agency?.zone || 'Zone Centre',
    city: agency?.city || '',
    department_code: agency?.department_code || '',
    email: agency?.email || '',
    phone: agency?.phone || '',
    address: agency?.address || '',
    is_active: agency?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSave = async () => {
    if (!form.name || !form.zone || !form.city) return;
    setSaving(true);
    try {
      if (isEdit) {
        await base44.entities.Agency.update(agency.id, form);
      } else {
        await base44.entities.Agency.create(form);
      }
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-heading font-semibold text-foreground">{isEdit ? 'Modifier l\'agence' : 'Nouvelle agence'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Nom de l'agence *</label>
            <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex: GONNIN DURIS Niort" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Zone *</label>
              <Select value={form.zone} onValueChange={v => set('zone', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ZONES.map(z => <SelectItem key={z} value={z}>{z}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Ville *</label>
              <Input value={form.city} onChange={e => set('city', e.target.value)} placeholder="Ex: Niort" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Département</label>
              <Input value={form.department_code} onChange={e => set('department_code', e.target.value)} placeholder="Ex: 79" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Téléphone</label>
              <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="05 49 xx xx xx" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Email</label>
            <Input value={form.email} onChange={e => set('email', e.target.value)} placeholder="agence@gonnin-duris.fr" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Adresse</label>
            <Input value={form.address} onChange={e => set('address', e.target.value)} placeholder="12 rue des..." />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="w-4 h-4 rounded border-border" />
            <span className="text-sm text-foreground">Agence active</span>
          </label>
        </div>

        <div className="px-6 py-4 border-t border-border flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Annuler</Button>
          <Button className="flex-1 gap-2" onClick={handleSave} disabled={saving || !form.name || !form.city}>
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? 'Enregistrer' : 'Créer'}
          </Button>
        </div>
      </div>
    </div>
  );
}