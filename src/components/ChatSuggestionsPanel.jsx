import { ChevronRight, Search, Trash2, ArrowRight } from 'lucide-react';

export default function ChatSuggestionsPanel({ onSelect }) {
  const categories = [
    {
      title: '🔍 Rechercher',
      icon: Search,
      examples: [
        'Qui sont tous les techniciens atelier ?',
        'Liste les commerciaux de la Zone Ouest',
        'Combien de collaborateurs actifs ?',
        'Qui est en recrutement actuellement ?',
      ]
    },
    {
      title: '❌ Supprimer',
      icon: Trash2,
      examples: [
        'Supprime EDDY DEBIAIS',
        'Enlève Pierre Martin de la base',
      ]
    },
    {
      title: '📊 Statistiques',
      icon: ArrowRight,
      examples: [
        'Combien de collaborateurs par agence ?',
        'Qui sont les apprentis du groupe ?',
        'Liste les départs prévus',
      ]
    }
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="text-center mb-6">
        <h2 className="font-heading font-semibold text-foreground text-lg">Que puis-je faire pour vous ?</h2>
        <p className="text-sm text-muted-foreground mt-1">Cliquez sur un exemple ou écrivez votre demande en français naturel</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map(({ title, icon: Icon, examples }) => (
          <div key={title} className="border border-border rounded-xl overflow-hidden">
            <div className="bg-secondary px-4 py-3 flex items-center gap-2">
              <Icon className="w-4 h-4 text-primary" />
              <p className="font-semibold text-sm text-foreground">{title}</p>
            </div>
            <div className="divide-y divide-border">
              {examples.map((example, i) => (
                <button
                  key={i}
                  onClick={() => onSelect(example)}
                  className="w-full text-left px-4 py-3 text-sm hover:bg-lavender/40 transition-colors flex items-start justify-between group"
                >
                  <span className="text-foreground group-hover:text-primary">{example}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary flex-shrink-0 ml-2 mt-0.5" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-mint/30 border border-emerald-200 rounded-xl">
        <p className="text-xs font-medium text-emerald-900 mb-2">💬 Vous pouvez aussi :</p>
        <ul className="text-xs text-emerald-800 space-y-1">
          <li>• Poser des questions : "Qui est le responsable..."</li>
          <li>• Donner des ordres : "Ajoute...", "Supprime...", "Passe..."</li>
          <li>• Combiner : "Ajoute Jean à Niort ET passe Pierre à Naintré"</li>
        </ul>
      </div>
    </div>
  );
}