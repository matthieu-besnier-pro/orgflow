import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Copy, Check, Link2, Power } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ShareChartPanel({ companyId, companyName, onClose }) {
  const [share, setShare] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [sortMode, setSortMode] = useState('alpha');

  useEffect(() => {
    base44.entities.ChartShare.filter({ company_id: companyId }).then(list => {
      setShare(list[0] || null);
      setSortMode(list[0]?.service_sort_mode || 'alpha');
      setLoading(false);
    });
  }, [companyId]);

  const url = share ? `${window.location.origin}/partage?token=${share.token}` : '';

  const createLink = async () => {
    setLoading(true);
    const token = crypto.randomUUID().replace(/-/g, '');
    const rec = await base44.entities.ChartShare.create({ company_id: companyId, token, is_active: true, service_sort_mode: 'alpha' });
    setShare(rec);
    setSortMode('alpha');
    setLoading(false);
  };

  const toggle = async () => {
    const updated = await base44.entities.ChartShare.update(share.id, { is_active: !(share.is_active !== false) });
    setShare(updated);
  };

  const updateSortMode = async (mode) => {
    setSortMode(mode);
    if (share) {
      const updated = await base44.entities.ChartShare.update(share.id, { service_sort_mode: mode });
      setShare(updated);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-semibold text-foreground">Partager l'organigramme — {companyName}</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Génère un lien public en lecture seule. Toute personne disposant du lien pourra consulter la vue hiérarchique complète de {companyName}, sans connexion et sans possibilité de modifier les données.
        </p>

        {loading ? (
          <div className="h-10 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-lavender border-t-primary rounded-full animate-spin" />
          </div>
        ) : !share ? (
          <button onClick={createLink} className="w-full h-10 rounded-lg bg-primary text-white text-sm font-medium flex items-center justify-center gap-2">
            <Link2 className="w-4 h-4" /> Générer le lien de partage public
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input readOnly value={url} className="flex-1 h-9 px-3 rounded-lg border border-border text-xs bg-secondary/50" />
              <button onClick={copy} className="h-9 px-3 rounded-lg bg-primary text-white text-sm flex items-center gap-1.5">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <button onClick={toggle} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <Power className="w-3.5 h-3.5" />
              {share.is_active !== false ? 'Désactiver le lien (plus accessible)' : 'Réactiver le lien (accessible à nouveau)'}
            </button>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Tri des services affiché sur le lien de partage</label>
              <Select value={sortMode} onValueChange={updateSortMode}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alpha">Par ordre alphabétique</SelectItem>
                  <SelectItem value="count">Par nombre de collaborateurs</SelectItem>
                  <SelectItem value="custom">Ordre libre (personnalisé)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}