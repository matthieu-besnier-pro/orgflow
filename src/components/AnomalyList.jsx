import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

function anomaliesOf(e, managerIds) {
  const list = [];
  if (!e.service) list.push('Sans service');
  if (!e.agency_id && !e.is_group_support) list.push('Sans agence');
  // Un collaborateur sans manager mais qui encadre une équipe est un sommet légitime (direction)
  if (!e.manager_id && !managerIds.has(e.id)) list.push('Sans manager');
  if (!e.position) list.push('Sans poste');
  return list;
}

export default function AnomalyList({ employees, agencies, onChanged }) {
  const [saving, setSaving] = useState(null);
  const { toast } = useToast();

  const managerIds = new Set(employees.map(e => e.manager_id).filter(Boolean));

  const flagged = employees
    .map(e => ({ e, issues: anomaliesOf(e, managerIds) }))
    .filter(x => x.issues.length > 0)
    .sort((a, b) => b.issues.length - a.issues.length);

  const services = [...new Set(employees.map(e => e.service).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'));
  const managers = employees.slice().sort((a, b) => `${a.last_name}`.localeCompare(`${b.last_name}`, 'fr'));

  const patch = async (id, data) => {
    setSaving(id);
    await base44.entities.Employee.update(id, data);
    setSaving(null);
    toast({ title: 'Fiche corrigée', duration: 2000 });
    onChanged();
  };

  if (flagged.length === 0) return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <CheckCircle2 className="w-10 h-10 text-emerald-500" />
      <p className="font-medium text-foreground">Aucune anomalie détectée</p>
    </div>
  );

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground mb-3">
        <AlertTriangle className="w-4 h-4 inline mr-1 text-amber-500" />
        {flagged.length} fiche(s) à compléter
      </p>
      {flagged.map(({ e, issues }) => (
        <div key={e.id} className={`bg-white border border-border rounded-xl p-3 ${saving === e.id ? 'opacity-50' : ''}`}>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <p className="font-semibold text-sm text-foreground">{e.last_name} {e.first_name}</p>
            <span className="text-xs text-muted-foreground">{e.position || '—'}</span>
            {issues.map(i => (
              <span key={i} className="text-[10px] font-medium bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">{i}</span>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {!e.service && (
              <select defaultValue="" onChange={ev => ev.target.value && patch(e.id, { service: ev.target.value })}
                className="h-8 text-xs border border-border rounded-lg px-2 bg-white">
                <option value="">Choisir un service…</option>
                {services.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            {!e.agency_id && !e.is_group_support && (
              <select defaultValue="" onChange={ev => ev.target.value && patch(e.id, { agency_id: ev.target.value })}
                className="h-8 text-xs border border-border rounded-lg px-2 bg-white">
                <option value="">Choisir une agence…</option>
                {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            )}
            {!e.manager_id && (
              <select defaultValue="" onChange={ev => ev.target.value && patch(e.id, { manager_id: ev.target.value })}
                className="h-8 text-xs border border-border rounded-lg px-2 bg-white">
                <option value="">Choisir un manager…</option>
                {managers.filter(m => m.id !== e.id).map(m => (
                  <option key={m.id} value={m.id}>{m.last_name} {m.first_name} — {m.position}</option>
                ))}
              </select>
            )}
            {!e.position && (
              <input placeholder="Poste…" className="h-8 text-xs border border-border rounded-lg px-2"
                onKeyDown={ev => { if (ev.key === 'Enter' && ev.target.value.trim()) patch(e.id, { position: ev.target.value.trim() }); }} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}