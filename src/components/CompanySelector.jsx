import { useState, useRef, useEffect } from 'react';
import { useCompany } from '@/lib/CompanyContext';
import { ChevronDown, Building2, Check } from 'lucide-react';

export default function CompanySelector() {
  const { companies, selectedCompany, setSelectedCompany, loading } = useCompany();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (loading || companies.length === 0) return null;
  if (companies.length === 1) {
    return (
      <div className="px-3 py-2 mx-2 mb-2 bg-lavender/50 rounded-xl flex items-center gap-2">
        {selectedCompany?.logo_url ? (
          <img src={selectedCompany.logo_url} alt="" className="w-6 h-6 rounded-md object-cover" />
        ) : (
          <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
            <Building2 className="w-3.5 h-3.5 text-white" />
          </div>
        )}
        <span className="text-xs font-semibold text-foreground truncate">{selectedCompany?.name}</span>
      </div>
    );
  }

  return (
    <div className="relative mx-2 mb-2" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-lavender/50 hover:bg-lavender rounded-xl transition-colors"
      >
        {selectedCompany?.logo_url ? (
          <img src={selectedCompany.logo_url} alt="" className="w-6 h-6 rounded-md object-cover flex-shrink-0" />
        ) : (
          <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
            <Building2 className="w-3.5 h-3.5 text-white" />
          </div>
        )}
        <span className="text-xs font-semibold text-foreground truncate flex-1 text-left">
          {selectedCompany?.name || 'Choisir...'}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-border rounded-xl shadow-lg z-50 overflow-hidden">
          {companies.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setSelectedCompany(c.id);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-secondary transition-colors text-left ${
                selectedCompany?.id === c.id ? 'bg-lavender/50' : ''
              }`}
            >
              {c.logo_url ? (
                <img src={c.logo_url} alt="" className="w-5 h-5 rounded-md object-cover flex-shrink-0" />
              ) : (
                <div className="w-5 h-5 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-3 h-3 text-white" />
                </div>
              )}
              <span className="text-xs font-medium text-foreground truncate flex-1">{c.name}</span>
              {selectedCompany?.id === c.id && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}