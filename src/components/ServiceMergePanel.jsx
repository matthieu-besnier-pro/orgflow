import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Merge } from 'lucide-react';
import { getServiceColor } from '@/lib/serviceColors';
import { useToast } from '@/components/ui/use-toast';

export default function ServiceMergePanel({ employees, onChanged }) {
  const [selected, setSelected] = useState([]);
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const counts = {};
  employees.forEach(e => {
    const k = e.service || 'Sans service';
    counts[k] = (counts[k] || 0) + 1;
  });
  const services = Object.keys(counts).sort((a, b) => a.localeCompare(b, 'fr'));

  // Doublons probables : libellés identiques hors casse/accents/espaces
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');
  const dupGroups = {};
  services.forEach(s => {
    const k = norm(s);
    if (!dupGroups[k]) dupGroups[k] = [];
    dupGroups[k].push(s);
  });
  const suspects = Object.values(dupGroups).filter(g => g.length > 1);

  const toggle = (s) => setSelected(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const merge = async () => {
    const finalName = target.trim();
    if (!finalName || selected.length === 0) return;
    setBusy(true);
    const ids = employees.filter(e => selected.includes(e.service || 'Sans service')).map(e => e.id);
    await base44.entities.Employee.bulkUpdate(ids.map(id => ({ id, service: finalName })));
    setBusy(false);
    setSelected([]);
    setTarget('');
    toast({ title: 'Services fusionnés', description: `${ids.length} fiche(s) mises à jour vers « ${finalName} »`, duration: 3000 });
    onChanged();
  };

  return (
    <div className="space-y-6">
      {suspects.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-900 mb-2">Doublons probables</p>
          <div className="space-y-1">
            {suspects.map((g, i) => (
              <button key={i} onClick={() => { setSelected(g); setTarget(g[0]); }}
                className="block text-xs text-amber-900 hover:underline text-left">
                {g.join('  ·  ')} → cliquer pour préparer la fusion
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-sm font-semibold text-foreground mb-2">Sélectionnez les libellés à fusionner</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {services.map(s => (
            <label key={s}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer text-sm transition-colors ${selected.includes(s) ? 'border-primary bg-primary/5' : 'border-border bg-white hover:bg-secondary/50'}`}>
              <input type="checkbox" checked={selected.includes(s)} onChange={() => toggle(s)} className="accent-primary" />
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: getServiceColor(s).bg }} />
              <span className="flex-1 truncate text-foreground">{s}</span>
              <span className="text-xs text-muted-foreground">{counts[s]}</span>
            </label>
          ))}
        </div>
      </div>

      {selected.length > 0 && (
        <div className="sticky bottom-4 bg-white border border-border rounded-xl p-4 shadow-lg flex items-center gap-3 flex-wrap">
          <p className="text-sm text-foreground">{selected.length} libellé(s) → </p>
          <input value={target} onChange={e => setTarget(e.target.value)} placeholder="Nom final du service"
            className="h-9 flex-1 min-w-48 border border-border rounded-lg px-3 text-sm" />
          <button onClick={merge} disabled={busy || !target.trim()}
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-50">
            <Merge className="w-4 h-4" /> Fusionner
          </button>
          <button onClick={() => setSelected([])} className="h-9 px-3 rounded-lg bg-secondary text-sm">Annuler</button>
        </div>
      )}
    </div>
  );
}