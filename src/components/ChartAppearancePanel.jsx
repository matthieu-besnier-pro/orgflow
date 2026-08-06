import { useState } from 'react';
import { X, RotateCcw, LayoutGrid, Rows3, LayoutList, Presentation } from 'lucide-react';

export const DEFAULT_DEPTH_HEX = ['#003D7A', '#0056B3', '#0070D0', '#FDB913'];

const TEMPLATES = [
  { key: 'classique', label: 'Classique', icon: LayoutGrid },
  { key: 'moderne', label: 'Moderne', icon: Rows3 },
  { key: 'compact', label: 'Compact', icon: LayoutList },
  { key: 'presentation', label: 'Présentation', icon: Presentation },
];

export default function ChartAppearancePanel({ companyName, initial, onSave, onClose }) {
  const [template, setTemplate] = useState(initial.template || 'classique');
  const [colorMode, setColorMode] = useState(initial.colorMode || 'depth');
  const [colors, setColors] = useState(initial.depthColors?.length ? [...initial.depthColors] : [...DEFAULT_DEPTH_HEX]);
  const [saving, setSaving] = useState(false);

  const setColor = (i, v) => setColors(prev => prev.map((c, idx) => idx === i ? v : c));

  const handleSave = async () => {
    setSaving(true);
    await onSave({ template, color_mode: colorMode, depth_colors: colors });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-heading font-semibold text-lg text-foreground">Apparence des cartes</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Réglages propres à <span className="font-medium text-foreground">{companyName}</span></p>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-secondary text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modèle de carte */}
        <div>
          <p className="text-sm font-medium text-foreground mb-2">Modèle de carte</p>
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATES.map(t => (
              <button key={t.key} onClick={() => setTemplate(t.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${template === t.key ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-border text-muted-foreground hover:bg-secondary'}`}>
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mode de couleur */}
        <div>
          <p className="text-sm font-medium text-foreground mb-2">Couleurs des cartes</p>
          <div className="flex gap-2">
            {[{ key: 'depth', label: 'Par niveau hiérarchique' }, { key: 'service', label: 'Par service' }].map(m => (
              <button key={m.key} onClick={() => setColorMode(m.key)}
                className={`flex-1 px-3 py-2 rounded-lg border text-sm transition-colors ${colorMode === m.key ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-border text-muted-foreground hover:bg-secondary'}`}>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Palette par niveau */}
        {colorMode === 'depth' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-foreground">Palette par niveau</p>
              <button onClick={() => setColors([...DEFAULT_DEPTH_HEX])}
                className="flex items-center gap-1 text-xs text-primary hover:underline">
                <RotateCcw className="w-3 h-3" /> Palette par défaut
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {colors.map((c, i) => (
                <label key={i} className="flex flex-col items-center gap-1 cursor-pointer">
                  <input type="color" value={c} onChange={e => setColor(i, e.target.value)}
                    className="w-full h-10 rounded-lg border border-border cursor-pointer p-0.5" />
                  <span className="text-[10px] text-muted-foreground">{i === colors.length - 1 ? `Niv. ${i + 1}+` : `Niv. ${i + 1}`}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium bg-secondary text-foreground hover:bg-secondary/80">
            Annuler
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:opacity-90 disabled:opacity-50">
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}