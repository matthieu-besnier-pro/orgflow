import { useState, useRef } from 'react';
import { X, Camera, UserPlus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AssignmentSelector from '@/components/AssignmentSelector';
import { useCompany } from '@/lib/CompanyContext';

export default function AddEmployeeModal({ agencies, allEmployees, onClose, onAdd }) {
  const { services: SERVICES, statuses: STATUSES, selectedCompanyId } = useCompany();
  const [form, setForm] = useState({ status: 'Actif' });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();
  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handlePhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set('photo_url', file_url);
    setUploading(false);
  };

  const handleSave = async () => {
    if (!form.first_name || !form.last_name || !form.position) return;
    setSaving(true);
    const created = await base44.entities.Employee.create({ ...form, company_id: selectedCompanyId });
    onAdd && onAdd(created);
    setSaving(false);
  };

  const initials = `${form.first_name?.[0] || ''}${form.last_name?.[0] || ''}`.toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-heading font-semibold text-foreground">Nouveau collaborateur</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Avatar */}
          <div className="flex justify-center">
            <div className="relative">
              {form.photo_url ? (
                <img src={form.photo_url} alt={initials} className="w-20 h-20 rounded-2xl object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-lavender flex items-center justify-center">
                  <span className="text-xl font-bold text-primary">{initials || '?'}</span>
                </div>
              )}
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center shadow"
              >
                {uploading ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Camera className="w-3 h-3" />}
              </button>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Prénom *</label>
              <Input value={form.first_name || ''} onChange={e => set('first_name', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nom *</label>
              <Input value={form.last_name || ''} onChange={e => set('last_name', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Poste *</label>
            <Input value={form.position || ''} onChange={e => set('position', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Email</label>
            <Input value={form.email || ''} onChange={e => set('email', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Téléphone</label>
            <Input value={form.phone || ''} onChange={e => set('phone', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Service</label>
            <Select value={form.service || ''} onValueChange={v => set('service', v)}>
              <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
              <SelectContent>
                {SERVICES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <AssignmentSelector form={form} agencies={agencies} onChange={setForm} />
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Manager direct</label>
            <Select value={form.manager_id || ''} onValueChange={v => set('manager_id', v)}>
              <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Aucun</SelectItem>
                {allEmployees.map(m => <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Statut</label>
            <Select value={form.status || 'Actif'} onValueChange={v => set('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Date d'entrée</label>
            <Input type="date" value={form.hire_date || ''} onChange={e => set('hire_date', e.target.value)} />
          </div>
        </div>

        <div className="px-6 pb-6">
          <Button
            className="w-full gap-2"
            onClick={handleSave}
            disabled={saving || !form.first_name || !form.last_name || !form.position}
          >
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Créer le collaborateur
          </Button>
        </div>
      </div>
    </div>
  );
}