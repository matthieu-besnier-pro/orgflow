import { X, Sparkles, MessageSquare, Users, Network, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OnboardingModal({ onClose }) {
  const steps = [
    {
      icon: Network,
      title: 'Visualisez l\'organigramme',
      desc: 'Voyez la hiérarchie de votre groupe en un coup d\'œil. Cliquez sur une personne pour voir ses détails.'
    },
    {
      icon: Users,
      title: 'Gérez l\'annuaire',
      desc: 'Consultez et modifiez les fiches de tous vos collaborateurs (coordonnées, poste, agence...).'
    },
    {
      icon: MessageSquare,
      title: 'Utilisez l\'assistant RH',
      desc: 'Posez des questions en français naturel : "Qui sont les techniciens à Niort ?" ou "Ajoute Maurice magasinier à Naintré".'
    },
    {
      icon: AlertCircle,
      title: 'Enregistrez les mouvements',
      desc: 'Tracez les arrivées, départs, mutations et promotions pour une gestion RH complète.'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-96 overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 bg-white border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h2 className="font-heading font-semibold text-foreground text-lg">Bienvenue dans GONNIN RH</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Voici comment utiliser votre outil RH : 4 étapes simples.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {steps.map(({ icon: Icon, title, desc }, i) => (
              <div key={i} className="p-4 border border-border rounded-xl hover:bg-secondary/30 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-lavender flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-heading font-semibold text-foreground text-sm">{title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-xs font-medium text-blue-900 mb-2">💡 Conseil : Commencez par l'assistant RH</p>
            <p className="text-xs text-blue-800">
              L'assistant répond à toutes vos questions et peut modifier les données. C'est l'outil le plus puissant pour les RH qui découvrent !
            </p>
          </div>
        </div>

        <div className="sticky bottom-0 px-6 py-4 bg-white border-t border-border flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>Fermer</Button>
          <Button onClick={onClose}>C'est parti !</Button>
        </div>
      </div>
    </div>
  );
}