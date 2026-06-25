import { useState, useRef } from 'react';
import { X, Mail, Phone, Building2, User, Camera, Save, Trash2, ArrowLeftRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const SERVICES = ["Direction","Service Commercial","Magasin","Atelier","Administratif","Ressources Humaines","Comptabilité","Gestion","Informatique","Communication Marketing","Support Technique","Garanties","Agriculture de Précision","RSE","Accueil Tél.","Service Occasions","Commercial Quads","Commercial TP","PY Pneus"];
const STATUSES = ["Actif","En recrutement","Apprenti","Alternant","Départ"];

export default function EmployeeDrawer({ employee, agencies, allEmployees, isHR, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({ ...employee });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();
  const initials = `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`.toUpperCase();

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set('photo_url', file_url);
    setUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Employee.update(employee.id, form);
    onSave && onSave({ ...employee, ...form });
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm(`Supprimer ${employee.first_name} ${employee.last_name} ?`)) return;
    await base44.entities.Employee.delete(employee.id);
    onDelete && onDelete(employee.id);
    onClose();
  };

  const managers = allEmployees.filter(e => e.id !== employee.id);

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/20 backdrop-blur-sm" />
      <div
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-fade-in overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-heading font-semibold text-foreground">Fiche collaborateur</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              {form.photo_url ? (
                <img src={form.photo_url} alt={initials} className="w-24 h-24 rounded-2xl object-cover" />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-lavender flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">{initials}</span>
                </div>
              )}
              {isHR && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                >
                  {uploading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            {!isHR && (
              <div className="text-center">
                <p className="font-heading font-semibold text-foreground text-lg">{employee.first_name} {employee.last_name}</p>
                <p className="text-sm text-muted-foreground">{employee.position}</p>
              </div>
            )}
          </div>

          {isHR ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Prénom</label>
                  <Input value={form.first_name || ''} onChange={e => set('first_name', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Nom</label>
                  <Input value={form.last_name || ''} onChange={e => set('last_name', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Poste</label>
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
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SERVICES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Agence</label>
                <Select value={form.agency_id || ''} onValueChange={v => set('agency_id', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {agencies.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Manager direct</label>
                <Select value={form.manager_id || ''} onValueChange={v => set('manager_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Aucun</SelectItem>
                    {managers.map(m => <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>)}
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
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Notes RH (privé)</label>
                <textarea
                  value={form.notes || ''}
                  onChange={e => set('notes', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  placeholder="Notes internes..."
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {employee.email && (
                <div className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
                  <Mail className="w-4 h-4 text-primary" />
                  <span className="text-sm text-foreground">{employee.email}</span>
                </div>
              )}
              {employee.phone && (
                <div className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
                  <Phone className="w-4 h-4 text-primary" />
                  <span className="text-sm text-foreground">{employee.phone}</span>
                </div>
              )}
              {employee.service && (
                <div className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
                  <User className="w-4 h-4 text-primary" />
                  <span className="text-sm text-foreground">{employee.service}</span>
                </div>
              )}
              {agencies.find(a => a.id === employee.agency_id) && (
                <div className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
                  <Building2 className="w-4 h-4 text-primary" />
                  <span className="text-sm text-foreground">{agencies.find(a => a.id === employee.agency_id)?.name}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {isHR && (
          <div className="px-6 py-4 border-t border-border flex gap-3">
            <Button variant="destructive" size="sm" onClick={handleDelete} className="gap-2">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
            <Button className="flex-1 gap-2" onClick={handleSave} disabled={saving}>
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              Enregistrer
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}