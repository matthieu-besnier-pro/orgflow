import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCompany } from '@/lib/CompanyContext';

export default function ServiceCombobox({ value, onChange, placeholder = 'Sélectionner ou créer...' }) {
  const { services: SERVICES, selectedCompanyId } = useCompany();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = SERVICES.filter(s => s.toLowerCase().includes(search.toLowerCase()));
  const isNew = search.trim() && !SERVICES.some(s => s.toLowerCase() === search.trim().toLowerCase());

  const addNewService = async (name) => {
    setAdding(true);
    const cleanName = name.trim();
    const updated = [...SERVICES, cleanName];
    await base44.entities.Company.update(selectedCompanyId, { services: updated });
    onChange(cleanName);
    setOpen(false);
    setSearch('');
    setAdding(false);
  };

  return (
    <div className="relative" ref={ref}>
      <div
        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm cursor-pointer hover:bg-secondary/50 transition-colors"
        onClick={() => { setOpen(true); setSearch(value || ''); }}
      >
        <span className={value ? 'text-foreground' : 'text-muted-foreground'}>
          {value || placeholder}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-border rounded-lg shadow-lg overflow-hidden">
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && isNew && !adding) {
                e.preventDefault();
                addNewService(search);
              }
            }}
            placeholder="Rechercher ou saisir un nouveau service..."
            className="w-full px-3 py-2 text-sm border-b border-border focus:outline-none focus:ring-0"
          />
          <div className="max-h-48 overflow-y-auto">
            {filtered.map(s => (
              <div
                key={s}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-secondary flex items-center justify-between ${value === s ? 'bg-lavender font-medium' : ''}`}
                onClick={() => { onChange(s); setOpen(false); setSearch(''); }}
              >
                {s}
                {value === s && <Check className="w-3.5 h-3.5 text-primary" />}
              </div>
            ))}
            {isNew && (
              <div
                className="px-3 py-2 text-sm cursor-pointer hover:bg-emerald-50 text-emerald-700 font-medium flex items-center gap-1.5 border-t border-border"
                onClick={() => !adding && addNewService(search)}
              >
                <Plus className="w-3.5 h-3.5" />
                {adding ? 'Ajout en cours...' : `Ajouter "${search.trim()}"`}
              </div>
            )}
            {filtered.length === 0 && !isNew && (
              <div className="px-3 py-2 text-sm text-muted-foreground">Aucun service trouvé</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}