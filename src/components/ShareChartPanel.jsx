import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Copy, Check, Link2, Power, Building2, Users } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const MODES = [
  { key: 'standard', label: 'Lien public standard', desc: 'Intitulés de poste classiques', icon: Users },
  { key: 'constructeur', label: 'Lien public constructeur', desc: 'Intitulés de poste constructeur', icon: Building2 },
];

function ShareSection({ companyId, mode, onShareChange }) {
  const [share, setShare] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [sortMode, setSortMode] = useState('alpha');
  const cfg = MODES.find(m => m.key === mode);
  const Icon = cfg.icon;

  useEffect(() => {
    base44.entities.ChartShare.filter({ company_id: companyId, view_mode: mode }).then(list => {
      const s = list[0] || null;
      setShare(s);
      setSortMode(s?.service_sort_mode || 'alpha');
      setLoading(false);
      onShareChange(mode, s);
    });
  }, [companyId, mode]);

  const url = share ? `${window.location.origin}/partage?token=${share.token}` : '';

  const createLink = async () => {
    setLoading(true);
    const token = crypto.randomUUID().replace(/-/g, '');
    const rec = await base44.entities.ChartShare.create({ company_id: companyId, token, is_active: true, service_sort_mode: 'alpha', view_mode: mode });
    setShare(rec);
    setSortMode('alpha');
    setLoading(false);
    onShareChange(mode, rec);
  };

  const toggle = async () => {
    const updated = await base44.entities.ChartShare.update(share.id, { is_active: !(share.is_active !== false) });
    setShare(updated);
    onShareChange(mode, updated);
  };

  const updateSortMode = async (m) => {
    setSortMode(m);
    if (share) {
      const updated = await base44.entities.ChartShare.update(share.id, { service_sort_mode: m });
      setShare(updated);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{cfg.label}</p>
          <p className="text-xs text-muted-foreground">{cfg.desc}</p>
        </div>
      </div>

      {loading ? (
        <div className="h-9 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-lavender border-t-primary rounded-full animate-spin" />
        </div>
      ) : !share ? (
        <button onClick={createLink} className="w-full h-9 rounded-lg bg-primary text-white text-sm font-medium flex items-center justify-center gap-2">
          <Link2 className="w-4 h-4" /> Générer le lien
        </button>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input readOnly value={url} className="flex-1 h-9 px-3 rounded-lg border border-border text-xs bg-secondary/50" />
            <button onClick={copy} className="h-9 px-3 rounded-lg bg-primary text-white text-sm flex items-center gap-1.5">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <button onClick={toggle} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
            <Power className="w-3.5 h-3.5" />
            {share.is_active !== false ? 'Désactiver le lien' : 'Réactiver le lien'}
          </button>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Tri des services</label>
            <Select value={sortMode} onValueChange={updateSortMode}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
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
  );
}

export default function ShareChartPanel({ companyId, companyName, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-semibold text-foreground">Partager l'organigramme — {companyName}</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Générez des liens publics en lecture seule. Le lien <strong>standard</strong> affiche les intitulés classiques, le lien <strong>constructeur</strong> affiche les intitulés constructeur (avec repli sur l'intitulé classique si non renseigné).
        </p>
        <div className="space-y-3">
          {MODES.map(m => (
            <ShareSection key={m.key} companyId={companyId} mode={m.key} onShareChange={() => {}} />
          ))}
        </div>
      </div>
    </div>
  );
}