import { useState, useRef } from 'react';
import { X, Mail, Phone, Building2, User, Camera, Save, Trash2, Search, Trash, Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AssignmentSelector, { getAssignmentLabel } from '@/components/AssignmentSelector';
import ServiceCombobox from '@/components/ServiceCombobox';
import { useCompany } from '@/lib/CompanyContext';
import { logAuditAction } from '@/lib/auditLog';
import { processPhoto } from '@/lib/imageProcessing';

export default function EmployeeDrawer({ employee, agencies, allEmployees, isHR, onClose, onSave, onDelete }) {
  const { services: SERVICES, statuses: STATUSES } = useCompany();
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
    try {
      const processed = await processPhoto(file);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: processed });
      set('photo_url', file_url);
    } catch { /* erreur de traitement */ }
    setUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Employee.update(employee.id, form);
    const changedFields = Object.keys(form).filter(k => form[k] !== employee[k]);
    logAuditAction({ action: 'update', entityId: employee.id, entityName: `${employee.first_name} ${employee.last_name}`, details: changedFields.join(', ') || 'Modification fiche', companyId: employee.company_id });
    onSave && onSave({ ...employee, ...form });
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm(`Supprimer ${employee.first_name} ${employee.last_name} ?`)) return;
    await base44.entities.Employee.delete(employee.id);
    logAuditAction({ action: 'delete', entityId: employee.id, entityName: `${employee.first_name} ${employee.last_name}`, details: 'Suppression collaborateur', companyId: employee.company_id });
    onDelete && onDelete(employee.id);
    onClose();
  };

  const [managerSearch, setManagerSearch] = useState('');
  const [managerDropdownOpen, setManagerDropdownOpen] = useState(false);

  const managers = allEmployees
    .filter(e => e.id !== employee.id)
    .sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`, 'fr'));

  const filteredManagers = managers.filter(m =>
    `${m.first_name} ${m.last_name}`.toLowerCase().includes(managerSearch.toLowerCase())
  );

  const currentManager = managers.find(m => m.id === form.manager_id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col animate-fade-in overflow-hidden"
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
                <>
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                  >
                    {uploading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                  </button>
                  {form.photo_url && (
                    <button
                      onClick={() => set('photo_url', null)}
                      className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-destructive text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                      title="Supprimer la photo"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  )}
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*,.heic,.heif,.avif" className="hidden" onChange={handlePhotoUpload} />
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
                <ServiceCombobox value={form.service || ''} onChange={v => set('service', v)} />
              </div>
              <AssignmentSelector form={form} agencies={agencies} onChange={setForm} />
              <div className="relative">
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-xs font-medium text-muted-foreground">Manager direct</label>
                  <button
                    type="button"
                    onClick={() => set('is_co_manager', !form.is_co_manager)}
                    className={`flex items-center gap-0.5 px-1.5 h-5 rounded text-[10px] font-medium transition-colors ${form.is_co_manager ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground hover:bg-accent'}`}
                    title="Co-manager : affiché côte à côte avec les autres managers du même service"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    Co-manager
                  </button>
                </div>
                <div
                  className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm cursor-pointer hover:bg-secondary/50 transition-colors"
                  onClick={() => { setManagerDropdownOpen(v => !v); setManagerSearch(''); }}
                >
                  <span className={currentManager ? 'text-foreground' : 'text-muted-foreground'}>
                    {currentManager ? `${currentManager.first_name} ${currentManager.last_name}` : 'Aucun'}
                  </span>
                  <Search className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                {managerDropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-border rounded-lg shadow-lg overflow-hidden">
                    <div className="p-2 border-b border-border">
                      <Input
                        autoFocus
                        placeholder="Rechercher..."
                        value={managerSearch}
                        onChange={e => setManagerSearch(e.target.value)}
                        className="h-8 text-sm"
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      <div
                        className="px-3 py-2 text-sm text-muted-foreground hover:bg-secondary cursor-pointer"
                        onClick={() => { set('manager_id', null); setManagerDropdownOpen(false); }}
                      >
                        Aucun
                      </div>
                      {filteredManagers.map(m => (
                        <div
                          key={m.id}
                          className={`px-3 py-2 text-sm cursor-pointer hover:bg-secondary ${form.manager_id === m.id ? 'bg-lavender font-medium' : ''}`}
                          onClick={() => { set('manager_id', m.id); setManagerDropdownOpen(false); setManagerSearch(''); }}
                        >
                          {m.last_name} {m.first_name}
                        </div>
                      ))}
                      {filteredManagers.length === 0 && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">Aucun résultat</div>
                      )}
                    </div>
                  </div>
                )}
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
              <div className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
                <Building2 className="w-4 h-4 text-primary" />
                <span className="text-sm text-foreground">{getAssignmentLabel(employee, agencies)}</span>
              </div>
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