import { useState } from 'react';
import { X, Save, Loader2 } from 'lucide-react';

// Modale d'édition simple pour le lien « direction » (sans compte).
// Ne modifie que des champs sûrs : libellés de poste et rattachement.
export default function PublicEditModal({ employee, employees, services = [], onClose, onSave }) {
  const [position, setPosition] = useState(employee.position || '');
  const [positionConstructeur, setPositionConstructeur] = useState(employee.position_constructeur || '');
  const [service, setService] = useState(employee.service || '');
  const [managerId, setManagerId] = useState(employee.manager_id || '');
  const [saving, setSaving] = useState(false);

  // Empêche de créer un cycle : on exclut le collaborateur et ses descendants
  // de la liste des managers possibles.
  const descendantIds = (() => {
    const childrenByMgr = {};
    employees.forEach(e => { if (e.manager_id) (childrenByMgr[e.manager_id] ||= []).push(e.id); });
    const out = new Set();
    const stack = [employee.id];
    while (stack.length) {
      const cur = stack.pop();
      (childrenByMgr[cur] || []).forEach(cid => { if (!out.has(cid)) { out.add(cid); stack.push(cid); } });
    }
    return out;
  })();

  const managerOptions = employees
    .filter(e => e.id !== employee.id && !descendantIds.has(e.id))
    .sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`, 'fr'));

  const handleSave = async () => {
    const fields = {};
    if (position !== (employee.position || '')) fields.position = position;
    if (positionConstructeur !== (employee.position_constructeur || '')) fields.position_constructeur = positionConstructeur;
    if (service !== (employee.service || '')) fields.service = service;
    const normalizedManager = managerId || null;
    if (normalizedManager !== (employee.manager_id || null)) fields.manager_id = normalizedManager;
    if (Object.keys(fields).length === 0) { onClose(); return; }
    setSaving(true);
    try {
      await onSave(fields);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="font-heading font-semibold text-foreground">Modifier — {employee.first_name} {employee.last_name}</h2>
            <p className="text-xs text-amber-600">Modification de l'organigramme réel</p>
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Poste</label>
            <input
              value={position}
              onChange={e => setPosition(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-input text-sm"
              placeholder="Intitulé de poste"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Poste (intitulé constructeur)</label>
            <input
              value={positionConstructeur}
              onChange={e => setPositionConstructeur(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-input text-sm"
              placeholder="Optionnel"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Service</label>
            <input
              list="public-edit-services"
              value={service}
              onChange={e => setService(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-input text-sm"
              placeholder="Service"
            />
            <datalist id="public-edit-services">
              {services.map(s => <option key={s} value={s} />)}
            </datalist>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Manager direct (rattachement)</label>
            <select
              value={managerId}
              onChange={e => setManagerId(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-input text-sm bg-white"
            >
              <option value="">— Aucun (racine) —</option>
              {managerOptions.map(m => (
                <option key={m.id} value={m.id}>
                  {m.last_name} {m.first_name}{m.position ? ` · ${m.position}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-border text-sm text-muted-foreground hover:bg-secondary">
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-9 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium flex items-center gap-2 disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
