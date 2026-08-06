import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

export default function AccessRequestButton() {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    base44.entities.AccessRequest.list().then(list => {
      if (list.some(r => r.status === 'En attente')) setSent(true);
    }).catch(() => {});
  }, []);

  const send = async () => {
    setSending(true);
    try {
      const me = await base44.auth.me();
      await base44.entities.AccessRequest.create({
        user_email: me.email,
        user_name: me.full_name || me.email,
        status: 'En attente',
      });
      setSent(true);
      toast({ title: 'Demande envoyée', description: 'Un administrateur va traiter votre demande.', duration: 4000 });
    } catch {
      toast({ title: 'Erreur', description: "Impossible d'envoyer la demande.", variant: 'destructive', duration: 3000 });
    }
    setSending(false);
  };

  if (sent) return (
    <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 px-4 py-2 rounded-xl">
      <Check className="w-4 h-4" />
      Demande d'accès envoyée — en attente de validation
    </div>
  );

  return (
    <Button onClick={send} disabled={sending} className="gap-2">
      <Send className="w-4 h-4" />
      {sending ? 'Envoi…' : "Demander l'accès"}
    </Button>
  );
}