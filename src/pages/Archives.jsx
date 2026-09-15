import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useCompany } from '@/lib/CompanyContext';
import { Archive, RotateCcw, Plus, AlertTriangle, Loader2, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const SOURCE_BADGES = {
  pre_edit: { label: 'Avant modification', color: 'bg-amber-100 text-amber-800' },
  manual: { label: 'Manuelle', color: 'bg-blue-100 text-blue-800' },
  pre_restore: { label: 'Avant restauration', color: 'bg-slate-100 text-slate-700' },
};

export default function Archives() {
  const { companies, selectedCompanyId, setSelectedCompany } = useCompany();
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(null);
  const [message, setMessage] = useState(null);

  const load = () => {
    setLoading(true);
    base44.entities.OrgSnapshot.list('-created_date', 200)
      .then((list) => { setSnapshots(list); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return snapshots.filter(s => !selectedCompanyId || s.company_id === selectedCompanyId);
  }, [snapshots, selectedCompanyId]);

  const companyName = (id) => companies.find(c => c.id === id)?.name || '—';

  const createArchive = async () => {
    if (!selectedCompanyId) return;
    setBusy(true);
    setMessage(null);
    try {
      await base44.functions.invoke('orgSnapshots', { action: 'create', company_id: selectedCompanyId });
      setMessage({ type: 'success', text: 'Archive créée.' });
      load();
    } catch {
      setMessage({ type: 'error', text: 'Échec de la création de l\'archive.' });
    } finally {
      setBusy(false);
    }
  };

  const doRestore = async () => {
    if (!confirmRestore) return;
    setBusy(true);
    setMessage(null);
    const snap = confirmRestore;
    setConfirmRestore(null);
    try {
      const res = await base44.functions.invoke('orgSnapshots', { action: 'restore', snapshot_id: snap.id });
      const n = res?.data?.restored ?? 0;
      setMessage({ type: 'success', text: `Archive restaurée (${n} fiche${n > 1 ? 's' : ''} rétablie${n > 1 ? 's' : ''}). Une archive de sécurité a été créée avant la restauration.` });
      load();
    } catch {
      setMessage({ type: 'error', text: 'Échec de la restauration.' });
    } finally {
      setBusy(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-lavender border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center">
            <Archive className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-heading font-semibold text-xl text-foreground">Archives de l'organigramme</h1>
            <p className="text-sm text-muted-foreground">Points de sauvegarde restaurables — notamment avant chaque modification via le lien direction</p>
          </div>
        </div>
        <Button onClick={createArchive} disabled={busy || !selectedCompanyId} className="gap-2">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Créer une archive
        </Button>
      </div>

      {message && (
        <div className={`rounded-xl px-4 py-3 text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      {/* Company filter */}
      <div className="flex flex-wrap items-center gap-3 bg-white rounded-2xl border border-border p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Filter className="w-4 h-4" />
          Société :
        </div>
        <Select value={selectedCompanyId || 'all'} onValueChange={(v) => setSelectedCompany(v === 'all' ? null : v)}>
          <SelectTrigger className="w-56 h-9 text-sm">
            <SelectValue placeholder="Toutes les sociétés" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les sociétés</SelectItem>
            {companies.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!selectedCompanyId && (
          <span className="text-xs text-muted-foreground">Sélectionnez une société pour créer une archive manuelle.</span>
        )}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Archive className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Aucune archive pour l'instant.</p>
          <p className="text-xs mt-1">Une archive est créée automatiquement avant chaque session de modification via le lien direction.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-border divide-y divide-border overflow-hidden">
          {filtered.map((s) => {
            const badge = SOURCE_BADGES[s.source] || SOURCE_BADGES.manual;
            return (
              <div key={s.id} className="flex items-center gap-4 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground truncate">{s.label || 'Archive'}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${badge.color}`}>{badge.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(s.created_date).toLocaleString('fr-FR')}
                    {!selectedCompanyId && <> · {companyName(s.company_id)}</>}
                    {typeof s.employee_count === 'number' && <> · {s.employee_count} collaborateur{s.employee_count > 1 ? 's' : ''}</>}
                    {s.created_via === 'lien-direction' && <> · via lien direction</>}
                  </p>
                </div>
                <Button variant="outline" size="sm" className="gap-1.5 shrink-0" disabled={busy} onClick={() => setConfirmRestore(s)}>
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restaurer
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Restore confirmation */}
      {confirmRestore && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setConfirmRestore(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="font-heading font-semibold text-foreground">Restaurer cette archive ?</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  L'organigramme réel ({companyName(confirmRestore.company_id)}) sera rétabli à l'état du{' '}
                  <strong>{new Date(confirmRestore.created_date).toLocaleString('fr-FR')}</strong> (rattachements, services, libellés, ordre).
                  Une archive de l'état actuel est créée automatiquement avant, pour pouvoir annuler.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setConfirmRestore(null)} className="h-9 px-4 rounded-lg border border-border text-sm text-muted-foreground hover:bg-secondary">
                Annuler
              </button>
              <button onClick={doRestore} className="h-9 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium">
                Restaurer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
