import { useState, useRef, useEffect } from 'react';
import { useCompany } from '@/lib/CompanyContext';
import { ChevronDown, Building2, Check } from 'lucide-react';

export default function CompanySwitcher({ compact = false }) {
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

  if (loading || companies.length <= 1) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 ${compact ? 'h-8 px-2.5' : 'h-9 px-3'} rounded-lg border border-border bg-white hover:bg-secondary transition-colors flex-shrink-0`}
      >
        {selectedCompany?.logo_url ? (
          <img src={selectedCompany.logo_url} alt="" className="w-5 h-5 rounded object-cover flex-shrink-0" />
        ) : (
          <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: selectedCompany?.brand_color || '#6366f1' }}>
            <Building2 className="w-3 h-3 text-white" />
          </div>
        )}
        <span className="text-sm font-semibold text-foreground truncate max-w-[140px]">
          {selectedCompany?.name || 'Choisir...'}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 bg-white border border-border rounded-xl shadow-xl z-50 overflow-hidden min-w-[220px]">
          {companies.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setSelectedCompany(c.id);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-secondary transition-colors text-left ${
                selectedCompany?.id === c.id ? 'bg-lavender/40' : ''
              }`}
            >
              {c.logo_url ? (
                <img src={c.logo_url} alt="" className="w-6 h-6 rounded object-cover flex-shrink-0" />
              ) : (
                <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: c.brand_color || '#6366f1' }}>
                  <Building2 className="w-3.5 h-3.5 text-white" />
                </div>
              )}
              <span className="text-sm font-medium text-foreground truncate flex-1">{c.name}</span>
              {selectedCompany?.id === c.id && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}