import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useCompany } from '@/lib/CompanyContext';
import { History, User as UserIcon, Building2, Filter, Download } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const ACTION_LABELS = {
  create: { label: 'Création', color: 'bg-emerald-100 text-emerald-800' },
  update: { label: 'Modification', color: 'bg-blue-100 text-blue-800' },
  delete: { label: 'Suppression', color: 'bg-red-100 text-red-800' },
  move: { label: 'Déplacement hiérarchique', color: 'bg-purple-100 text-purple-800' },
  photo: { label: 'Photo', color: 'bg-orange-100 text-orange-800' },
  service_reorder: { label: 'Réorganisation services', color: 'bg-cyan-100 text-cyan-800' },
  role_change: { label: 'Changement de rôle', color: 'bg-amber-100 text-amber-800' },
  access_change: { label: 'Modification d\'accès', color: 'bg-indigo-100 text-indigo-800' },
};

export default function AuditLog() {
  const { companies, selectedCompanyId, setSelectedCompanyId } = useCompany();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('all');
  const [filterUser, setFilterUser] = useState('all');

  useEffect(() => {
    base44.entities.AuditLog.list('-created_date', 500).then((list) => {
      setLogs(list);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const uniqueUsers = useMemo(() => {
    const map = {};
    logs.forEach(l => { if (l.user_id) map[l.user_id] = l.user_name || l.user_email || '—'; });
    return Object.entries(map);
  }, [logs]);

  const filtered = useMemo(() => {
    return logs.filter(l => {
      if (filterAction !== 'all' && l.action !== filterAction) return false;
      if (filterUser !== 'all' && l.user_id !== filterUser) return false;
      if (selectedCompanyId && l.company_id !== selectedCompanyId) return false;
      return true;
    });
  }, [logs, filterAction, filterUser, selectedCompanyId]);

  const exportCSV = () => {
    const headers = ['Date', 'Utilisateur', 'Email', 'Action', 'Entité', 'Détails', 'Société'];
    const rows = filtered.map(l => [
      new Date(l.created_date).toLocaleString('fr-FR'),
      l.user_name || '',
      l.user_email || '',
      ACTION_LABELS[l.action]?.label || l.action,
      l.entity_name || '',
      (l.details || '').replace(/"/g, '""'),
      companies.find(c => c.id === l.company_id)?.name || '',
    ].map(v => `"${v}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `journal-audit-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-lavender border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center">
            <History className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-heading font-semibold text-xl text-foreground">Journal d'activité</h1>
            <p className="text-sm text-muted-foreground">Suivi des actions sur les organigrammes et fiches collaborateurs</p>
          </div>
        </div>
        <Button variant="outline" onClick={exportCSV} disabled={filtered.length === 0} className="gap-2">
          <Download className="w-4 h-4" />
          Exporter CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white rounded-2xl border border-border p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Filter className="w-4 h-4" />
          Filtres :
        </div>

        {/* Company filter */}
        <Select value={selectedCompanyId || 'all'} onValueChange={(v) => setSelectedCompanyId(v === 'all' ? null : v)}>
          <SelectTrigger className="w-48 h-9 text-sm">
            <SelectValue placeholder="Toutes les sociétés" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les sociétés</SelectItem>
            {companies.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Action filter */}
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-44 h-9 text-sm">
            <SelectValue placeholder="Toutes les actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les actions</SelectItem>
            {Object.entries(ACTION_LABELS).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* User filter */}
        <Select value={filterUser} onValueChange={setFilterUser}>
          <SelectTrigger className="w-48 h-9 text-sm">
            <SelectValue placeholder="Tous les utilisateurs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les utilisateurs</SelectItem>
            {uniqueUsers.map(([id, name]) => (
              <SelectItem key={id} value={id}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground ml-auto">
          {filtered.length} action{filtered.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Log table */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <History className="w-10 h-10 text-muted-foreground/30" />
            <p className="text-muted-foreground font-medium mt-3">Aucune action enregistrée</p>
            <p className="text-sm text-muted-foreground">Les modifications sur les organigrammes apparaîtront ici.</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-secondary z-10">
                <tr className="text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Utilisateur</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cible</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((log) => {
                  const cfg = ACTION_LABELS[log.action] || { label: log.action, color: 'bg-gray-100 text-gray-800' };
                  const company = companies.find(c => c.id === log.company_id);
                  return (
                    <tr key={log.id} className="hover:bg-secondary/50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-sm text-foreground">{new Date(log.created_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</p>
                        <p className="text-xs text-muted-foreground">{new Date(log.created_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-lavender flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0">
                            {(log.user_name || log.user_email || '?')[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{log.user_name || '—'}</p>
                            <p className="text-xs text-muted-foreground truncate">{log.user_email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {log.entity_name ? (
                          <div className="flex items-center gap-1.5">
                            <UserIcon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm text-foreground">{log.entity_name}</span>
                          </div>
                        ) : company ? (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm text-foreground">{company.name}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-md">
                        <p className="text-sm text-muted-foreground">{log.details || '—'}</p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}