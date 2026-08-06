import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Inbox, Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function AccessRequestList() {
  const [requests, setRequests] = useState([]);
  const { toast } = useToast();

  const load = () => base44.entities.AccessRequest.filter({ status: 'En attente' }, '-created_date').then(setRequests);

  useEffect(() => { load(); }, []);

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
            <button onClick={() => markDone(r)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-primary text-white hover:opacity-90">
              <Check className="w-3 h-3" /> Marquer traitée
            </button>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-3">Attribuez ensuite les sociétés à l'utilisateur ci-dessous.</p>
    </div>
  );
}