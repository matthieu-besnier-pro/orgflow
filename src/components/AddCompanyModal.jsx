import { useState, useRef } from 'react';
import { X, Building2, Camera, Plus, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AddCompanyModal({ company, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: company?.name || '',
    logo_url: company?.logo_url || '',
    brand_color: company?.brand_color || '#003D7A',
    services: company?.services || [],
    statuses: company?.statuses || [],
    zones: company?.zones || [],
    anciennes_entites: company?.anciennes_entites || [],
    is_active: company?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [newService, setNewService] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [newZone, setNewZone] = useState('');
  const [newAncienneEntite, setNewAncienneEntite] = useState('');
  const fileRef = useRef();

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set('logo_url', file_url);
  };

  const addService = () => {
    if (!newService.trim()) return;
    set('services', [...form.services, newService.trim()]);
    setNewService('');
  };
  const removeService = (idx) => set('services', form.services.filter((_, i) => i !== idx));

  const addStatus = () => {
    if (!newStatus.trim()) return;
    set('statuses', [...form.statuses, newStatus.trim()]);
    setNewStatus('');
  };
  const removeStatus = (idx) => set('statuses', form.statuses.filter((_, i) => i !== idx));

  const addZone = () => {
    if (!newZone.trim()) return;
    set('zones', [...form.zones, newZone.trim()]);
    setNewZone('');
  };
  const removeZone = (idx) => set('zones', form.zones.filter((_, i) => i !== idx));

  const addAncienneEntite = () => {
    if (!newAncienneEntite.trim()) return;
    set('anciennes_entites', [...form.anciennes_entites, newAncienneEntite.trim()]);
    setNewAncienneEntite('');
  };
  const removeAncienneEntite = (idx) => set('anciennes_entites', form.anciennes_entites.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    if (company?.id) {
      await base44.entities.Company.update(company.id, form);
    } else {
      await base44.entities.Company.create(form);
    }
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-white z-10">
          <h2 className="font-heading font-semibold text-foreground">
            {company?.id ? 'Modifier la société' : 'Nouvelle société'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Logo + Name */}
          <div className="flex items-start gap-4">
            <div className="relative">
              {form.logo_url ? (
                <img src={form.logo_url} alt="" className="w-16 h-16 rounded-2xl object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-lavender flex items-center justify-center">
                  <Building2 className="w-7 h-7 text-primary" />
                </div>
              )}
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nom de la société *</label>
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex: APROLIA / AGRIZONE" />
            </div>
          </div>

          {/* Brand color */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Couleur principale</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.brand_color}
                onChange={(e) => set('brand_color', e.target.value)}
                className="w-10 h-9 rounded-lg border border-border cursor-pointer"
              />
              <Input value={form.brand_color} onChange={(e) => set('brand_color', e.target.value)} className="flex-1" />
            </div>
          </div>

          {/* Services */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Services</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {form.services.map((s, idx) => (
                <span key={idx} className="flex items-center gap-1 bg-lavender text-foreground text-xs font-medium px-2.5 py-1 rounded-full">
                  {s}
                  <button onClick={() => removeService(idx)}>
                    <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newService}
                onChange={(e) => setNewService(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addService())}
                placeholder="Ajouter un service..."
                className="h-8 text-sm"
              />
              <Button size="sm" variant="outline" onClick={addService} className="h-8">
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Statuses */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Statuts collaborateur</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {form.statuses.map((s, idx) => (
                <span key={idx} className="flex items-center gap-1 bg-mint text-foreground text-xs font-medium px-2.5 py-1 rounded-full">
                  {s}
                  <button onClick={() => removeStatus(idx)}>
                    <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addStatus())}
                placeholder="Ajouter un statut..."
                className="h-8 text-sm"
              />
              <Button size="sm" variant="outline" onClick={addStatus} className="h-8">
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Zones */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Zones géographiques</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {form.zones.map((z, idx) => (
                <span key={idx} className="flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full">
                  {z}
                  <button onClick={() => removeZone(idx)}>
                    <Trash2 className="w-3 h-3 text-blue-600 hover:text-destructive" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newZone}
                onChange={(e) => setNewZone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addZone())}
                placeholder="Ajouter une zone..."
                className="h-8 text-sm"
              />
              <Button size="sm" variant="outline" onClick={addZone} className="h-8">
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Anciennes entités */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Anciennes entités</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {form.anciennes_entites.map((ae, idx) => (
                <span key={idx} className="flex items-center gap-1 bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-1 rounded-full">
                  {ae}
                  <button onClick={() => removeAncienneEntite(idx)}>
                    <Trash2 className="w-3 h-3 text-amber-600 hover:text-destructive" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newAncienneEntite}
                onChange={(e) => setNewAncienneEntite(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAncienneEntite())}
                placeholder="Ajouter une ancienne entité..."
                className="h-8 text-sm"
              />
              <Button size="sm" variant="outline" onClick={addAncienneEntite} className="h-8">
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex gap-3 sticky bottom-0 bg-white">
          <Button variant="outline" onClick={onClose} className="flex-1">Annuler</Button>
          <Button onClick={handleSave} disabled={saving || !form.name.trim()} className="flex-1">
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </div>
  );
}