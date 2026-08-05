import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ArrowLeftRight, Plus, X, Check, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCompany } from '@/lib/CompanyContext';

const MOVEMENT_TYPES = ["Arrivée","Départ","Mutation","Changement de poste","Promotion"];
const STATUSES = ["En attente","Validé","Annulé"];

const typeColors = {
  'Arrivée': 'bg-mint text-emerald-700',
  'Départ': 'bg-red-100 text-red-700',
  'Mutation': 'bg-lavender text-purple-700',
  'Changement de poste': 'bg-blue-100 text-blue-700',
  'Promotion': 'bg-yellow-100 text-yellow-700',
};

const emptyForm = () => ({ status: 'Validé', movement_date: new Date().toISOString().split('T')[0] });

export default function Movements() {
  const [movements, setMovements] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const { selectedCompanyId } = useCompany();

  useEffect(() => {
    if (!selectedCompanyId) return;
    setLoading(true);
    Promise.all([
      base44.entities.HRMovement.filter({ company_id: selectedCompanyId }, '-created_date'),
      base44.entities.Employee.filter({ company_id: selectedCompanyId }),
      base44.entities.Agency.filter({ company_id: selectedCompanyId }),
      base44.auth.me()
    ]).then(([movs, emps, ags, u]) => {
      setMovements(movs);
      setEmployees(emps);
      setAgencies(ags);
      setUser(u);
      setLoading(false);
    });
  }, [selectedCompanyId]);

  const isHR = user?.role === 'admin';
  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleEmployeeSelect = (empId) => {
    const emp = employees.find(e => e.id === empId);
    set('employee_id', empId);
    set('employee_name', emp ? `${emp.first_name} ${emp.last_name}` : '');
    if (!editingId) {
      set('from_agency_id', emp?.agency_id || '');
      set('from_position', emp?.position || '');
    }
  };

  const openAdd = () => {
    setForm(emptyForm());
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (m) => {
    setForm({ ...m });
    setEditingId(m.id);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
  };

  const handleSave = async () => {
    if (!form.movement_type || !form.movement_date) return;
    setSaving(true);
    try {
      if (editingId) {
        const updated = await base44.entities.HRMovement.update(editingId, form);
        setMovements(prev => prev.map(m => m.id === editingId ? updated : m));
      } else {
        const created = await base44.entities.HRMovement.create({ ...form, company_id: selectedCompanyId });
        setMovements(prev => [created, ...prev]);
      }
      closeForm();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (m) => {
    if (!confirm(`Supprimer le mouvement de ${m.employee_name || 'ce collaborateur'} ?`)) return;
    await base44.entities.HRMovement.delete(m.id);
    setMovements(prev => prev.filter(x => x.id !== m.id));
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-lavender border-t-primary rounded-full animate-spin" />
    </div>
  );

  const agencyName = (id) => agencies.find(a => a.id === id)?.name || '—';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-border flex items-center justify-between">
        <div>
          <h1 className="font-heading font-semibold text-foreground text-lg">Mouvements RH</h1>
          <p className="text-sm text-muted-foreground">{movements.length} mouvement{movements.length > 1 ? 's' : ''} enregistré{movements.length > 1 ? 's' : ''}</p>
        </div>
        {isHR && (
          <Button className="gap-2" onClick={openAdd}>
            <Plus className="w-4 h-4" />
            Nouveau mouvement
          </Button>
        )}
      </div>

      {/* Add/Edit form */}
      {showForm && isHR && (
        <div className="bg-lavender/40 border-b border-border p-6">
          <div className="max-w-3xl mx-auto bg-white rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-semibold">{editingId ? 'Modifier le mouvement' : 'Nouveau mouvement RH'}</h2>
              <button onClick={closeForm} className="w-7 h-7 rounded-lg hover:bg-secondary flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Collaborateur</label>
                <Select value={form.employee_id || ''} onValueChange={handleEmployeeSelect}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Type de mouvement</label>
                <Select value={form.movement_type || ''} onValueChange={v => set('movement_type', v)}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    {MOVEMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Date</label>
                <Input type="date" value={form.movement_date || ''} onChange={e => set('movement_date', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Statut</label>
                <Select value={form.status || 'Validé'} onValueChange={v => set('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Agence d'origine</label>
                <Select value={form.from_agency_id || ''} onValueChange={v => set('from_agency_id', v)}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {agencies.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Agence de destination</label>
                <Select value={form.to_agency_id || ''} onValueChange={v => set('to_agency_id', v)}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {agencies.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Ancien poste</label>
                <Input value={form.from_position || ''} onChange={e => set('from_position', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Nouveau poste</label>
                <Input value={form.to_position || ''} onChange={e => set('to_position', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Validé par</label>
                <Input value={form.validated_by || ''} onChange={e => set('validated_by', e.target.value)} placeholder="Optionnel" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Motif</label>
                <Input value={form.reason || ''} onChange={e => set('reason', e.target.value)} placeholder="Optionnel" />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={closeForm}>Annuler</Button>
              <Button className="gap-2" onClick={handleSave} disabled={saving || !form.movement_type}>
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                {editingId ? 'Mettre à jour' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto p-6">
        {movements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ArrowLeftRight className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="font-heading font-semibold text-foreground">Aucun mouvement</p>
            <p className="text-sm text-muted-foreground">Les mouvements RH apparaîtront ici</p>
          </div>
        ) : (
          <div className="space-y-3 max-w-4xl mx-auto">
            {movements.map(m => (
              <div key={m.id} className="bg-white rounded-2xl border border-border p-5 hover:shadow-md transition-all duration-200">
                <div className="flex items-start gap-4">
                  <span className={`text-xs px-3 py-1 rounded-full font-medium flex-shrink-0 ${typeColors[m.movement_type] || 'bg-gray-100 text-gray-600'}`}>
                    {m.movement_type}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-foreground">{m.employee_name || 'Collaborateur non défini'}</p>
                      <p className="text-xs text-muted-foreground">{m.movement_date}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground flex-wrap">
                      {m.from_agency_id && <span>{agencyName(m.from_agency_id)}</span>}
                      {m.from_agency_id && m.to_agency_id && <ArrowLeftRight className="w-3 h-3" />}
                      {m.to_agency_id && <span className="text-foreground">{agencyName(m.to_agency_id)}</span>}
                      {m.from_position && <span className="text-muted-foreground">· {m.from_position}</span>}
                      {m.to_position && <><span>→</span><span className="text-foreground font-medium">{m.to_position}</span></>}
                    </div>
                    {m.reason && <p className="text-xs text-muted-foreground mt-1 italic">{m.reason}</p>}
                    {m.status && m.status !== 'Validé' && (
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 ${m.status === 'Annulé' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>{m.status}</span>
                    )}
                  </div>
                  {isHR && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => openEdit(m)} className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(m)} className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}