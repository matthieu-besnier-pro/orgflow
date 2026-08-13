import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Inbox, Check, Link2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function AccessRequestList() {
  const [requests, setRequests] = useState([]);
  const [copied, setCopied] = useState(null);
  const { toast } = useToast();

  const load = () => base44.entities.AccessRequest.filter({ status: 'En attente' }, '-created_date').then(setRequests);

  useEffect(() => { load(); }, []);

  const registerUrl = `${window.location.origin}/register`;

  const copyLink = async (r) => {
    try {
      await navigator.clipboard.writeText(registerUrl);
      setCopied(r.id);
      setTimeout(() => setCopied(null), 2000);
      toast({ title: 'Lien copié', description: `Envoyez ce lien à ${r.user_email} pour qu'elle s'inscrive.`, duration: 5000 });
    } catch {
      toast({ title: 'Lien', description: registerUrl, duration: 8000 });
    }
  };

  const markDone = async (r) => {
    await base44.entities.AccessRequest.update(r.id, { status: 'Traitée' });
    setRequests(prev => prev.filter(x => x.id !== r.id));
    toast({ title: 'Demande traitée', duration: 2000 });
  };

  if (requests.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-border p-6">
      <div className="flex items-center gap-2 mb-4">
        <Inbox className="w-5 h-5 text-primary" />
        <h2 className="font-heading font-semibold text-foreground">Demandes d'accès ({requests.length})</h2>
      </div>
      <div className="space-y-2">
        {requests.map(r => (
          <div key={r.id} className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{r.user_name || r.user_email}</p>
              <p className="text-xs text-muted-foreground truncate">{r.user_email}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => copyLink(r)}
                title="Copier le lien d'inscription"
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-primary text-white hover:opacity-90"
              >
                {copied === r.id ? <Check className="w-3 h-3" /> : <Link2 className="w-3 h-3" />}
                {copied === r.id ? 'Copié !' : 'Copier le lien'}
              </button>
              <button
                onClick={() => markDone(r)}
                className="text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                Ignorer
              </button>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-3">Envoyez le lien à la personne : elle crée son compte directement depuis l'app, sans Base44. Elle apparaîtra ensuite ci-dessous.</p>
    </div>
  );
}