import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Inbox, Check, UserPlus, Shield } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function AccessRequestList() {
  const [requests, setRequests] = useState([]);
  const [inviting, setInviting] = useState(null);
  const { toast } = useToast();

  const load = () => base44.entities.AccessRequest.filter({ status: 'En attente' }, '-created_date').then(setRequests);

  useEffect(() => { load(); }, []);

  const invite = async (r, role = 'user') => {
    setInviting(r.id);
    try {
      await base44.users.inviteUser(r.user_email, role);
      await base44.entities.AccessRequest.update(r.id, { status: 'Traitée' });
      setRequests(prev => prev.filter(x => x.id !== r.id));
      toast({ title: 'Invitation envoyée', description: `${r.user_email} peut maintenant se connecter.`, duration: 4000 });
    } catch (err) {
      toast({ title: 'Erreur', description: err?.message || "Impossible d'inviter cet utilisateur.", variant: 'destructive', duration: 4000 });
    }
    setInviting(null);
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
                onClick={() => invite(r, 'user')}
                disabled={inviting === r.id}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-primary text-white hover:opacity-90 disabled:opacity-50"
              >
                <UserPlus className="w-3 h-3" /> {inviting === r.id ? 'Envoi…' : 'Inviter'}
              </button>
              <button
                onClick={() => invite(r, 'admin')}
                disabled={inviting === r.id}
                title="Inviter en tant qu'administrateur"
                className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full bg-amber-100 text-amber-800 hover:bg-amber-200 disabled:opacity-50"
              >
                <Shield className="w-3 h-3" /> Admin
              </button>
              <button
                onClick={() => markDone(r)}
                disabled={inviting === r.id}
                className="text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                Ignorer
              </button>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-3">L'utilisateur invité apparaîtra ci-dessous pour l'attribution des sociétés.</p>
    </div>
  );
}