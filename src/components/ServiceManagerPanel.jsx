import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Pencil, Trash2, Check } from 'lucide-react';
import { getServiceColor } from '@/lib/serviceColors';
import { useToast } from '@/components/ui/use-toast';

export default function ServiceManagerPanel({ employees, onClose, onChanged }) {
  const [editing, setEditing] = useState(null);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const counts = {};
  employees.forEach(e => {
    const k = e.service || 'Sans service';
    counts[k] = (counts[k] || 0) + 1;
  });
  const services = Object.keys(counts).sort((a, b) => a.localeCompare(b, 'fr'));

  const idsOf = (s) => employees.filter(e => (e.service || 'Sans service') === s).map(e => e.id);

  const apply = async (s, newValue) => {
    setBusy(true);
    const ids = idsOf(s);
    await base44.entities.Employee.bulkUpdate(ids.map(id => ({ id, service: newValue })));
    setBusy(false);
    setEditing(null);
    toast({ title: newValue ? 'Service renommé' : 'Service supprimé', description: `${ids.length} fiche(s) mises à jour`, duration: 3000 });
    onChanged();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <p className="font-heading font-semibold text-foreground">Gérer les services</p>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground hover:text-foreground" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {services.map(s => (
            <div key={s} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: getServiceColor(s).bg }} />
              {editing === s ? (
                <>
                  <input autoFocus value={value} onChange={e => setValue(e.target.value)}
                    className="flex-1 h-8 border border-border rounded-lg px-2 text-sm" />
                  <button disabled={busy || !value.trim()} onClick={() => apply(s, value.trim())}
                    className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center disabled:opacity-50">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditing(null)} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 truncate text-sm text-foreground">{s}</span>
                  <span className="text-xs text-muted-foreground">{counts[s]}</span>
                  <button onClick={() => { setEditing(s); setValue(s === 'Sans service' ? '' : s); }}
                    className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center text-muted-foreground">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {s !== 'Sans service' && (
                    <button disabled={busy}
                      onClick={() => { if (confirm(`Supprimer le libellé « ${s} » ? Les ${counts[s]} collaborateurs passeront sans service.`)) apply(s, ''); }}
                      className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}