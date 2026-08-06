import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Printer, Save, RotateCcw, Check } from 'lucide-react';
import FreeServiceBlock from '@/components/FreeServiceBlock';
import { useToast } from '@/components/ui/use-toast';

// A3 paysage à 96 dpi
const PAGE_W = 1587;
const PAGE_H = 1123;
const BLOCK_W = 250;

function autoLayout(services) {
  const perRow = Math.floor((PAGE_W - 20) / BLOCK_W);
  const map = {};
  services.forEach((s, i) => {
    map[s] = { x: 20 + (i % perRow) * BLOCK_W, y: 20 + Math.floor(i / perRow) * 300 };
  });
  return map;
}

export default function OrgFreeBoard({ employees, onSelect, searchTerm, companyId, company }) {
  const [positions, setPositions] = useState(null);
  const [recordId, setRecordId] = useState(null);
  const [dirty, setDirty] = useState(false);
  const drag = useRef(null);
  const canvasRef = useRef(null);
  const areaRef = useRef(null);
  const { toast } = useToast();

  // Regroupement par service
  const groups = {};
  employees.forEach(e => {
    const key = e.service || 'Sans service';
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  });
  const services = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length);

  useEffect(() => {
    if (!companyId) return;
    base44.entities.ServiceLayout.filter({ company_id: companyId }).then(recs => {
      const rec = recs[0];
      const saved = {};
      (rec?.positions || []).forEach(p => { saved[p.service] = { x: p.x, y: p.y }; });
      const auto = autoLayout(services);
      setPositions({ ...auto, ...saved });
      setRecordId(rec?.id || null);
      setDirty(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  // Ajouter les services apparus après le chargement
  useEffect(() => {
    if (!positions) return;
    const missing = services.filter(s => !positions[s]);
    if (missing.length === 0) return;
    const auto = autoLayout(services);
    setPositions(prev => {
      const next = { ...prev };
      missing.forEach(s => { next[s] = auto[s]; });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services.join('|')]);

  // Déplacement d'un bloc : coordonnées relatives à la zone de dépôt (areaRef)
  const handleDragStart = (e, service) => {
    e.preventDefault();
    const rect = areaRef.current.getBoundingClientRect();
    const pos = positions[service] || { x: 20, y: 20 };
    drag.current = {
      service,
      offsetX: e.clientX - rect.left - pos.x,
      offsetY: e.clientY - rect.top - pos.y,
    };
  };

  // Écoute globale pendant le glissement : le curseur peut sortir du canevas
  useEffect(() => {
    const move = (e) => {
      if (!drag.current || !areaRef.current) return;
      const rect = areaRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(PAGE_W - BLOCK_W, e.clientX - rect.left - drag.current.offsetX));
      const y = Math.max(0, e.clientY - rect.top - drag.current.offsetY);
      const service = drag.current.service;
      setPositions(prev => ({ ...prev, [service]: { x, y } }));
      setDirty(true);
    };
    const up = () => { drag.current = null; };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, []);

  const save = async () => {
    const payload = Object.entries(positions).map(([service, p]) => ({ service, x: Math.round(p.x), y: Math.round(p.y) }));
    if (recordId) {
      await base44.entities.ServiceLayout.update(recordId, { positions: payload });
    } else {
      const rec = await base44.entities.ServiceLayout.create({ company_id: companyId, positions: payload });
      setRecordId(rec.id);
    }
    setDirty(false);
    toast({ title: 'Disposition enregistrée', duration: 2500 });
  };

  const reset = () => {
    setPositions(autoLayout(services));
    setDirty(true);
  };

  if (!positions) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-4 border-lavender border-t-primary rounded-full animate-spin" />
    </div>
  );

  const maxY = Math.max(PAGE_H, ...Object.values(positions).map(p => p.y + 260));

  return (
    <div className="flex flex-col items-center gap-3">
      <style>{`
        @media print {
          @page { size: A3 landscape; margin: 6mm; }
          body * { visibility: hidden; }
          .freeboard-page, .freeboard-page * { visibility: visible; }
          .freeboard-page { position: absolute; left: 0; top: 0; box-shadow: none !important; border: none !important; }
          .freeboard-toolbar { display: none !important; }
        }
      `}</style>

      <div className="freeboard-toolbar flex items-center gap-2 print:hidden">
        <span className="text-xs text-muted-foreground mr-2">Glissez l'en-tête d'un bloc pour l'aérer — A3 paysage</span>
        <button onClick={save} disabled={!dirty}
          className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-sm font-medium ${dirty ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground'}`}>
          {dirty ? <Save className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
          {dirty ? 'Enregistrer' : 'Enregistré'}
        </button>
        <button onClick={reset} className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-sm font-medium bg-secondary text-foreground hover:bg-secondary/70">
          <RotateCcw className="w-3.5 h-3.5" /> Réorganiser
        </button>
        <button onClick={() => window.print()} className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-sm font-medium bg-secondary text-foreground hover:bg-secondary/70">
          <Printer className="w-3.5 h-3.5" /> Imprimer / PDF
        </button>
      </div>

      <div
        ref={canvasRef}
        className="freeboard-page relative bg-white border border-border shadow-lg select-none"
        style={{ width: PAGE_W, height: maxY }}
      >
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-3 border-b border-border">
          <p className="font-heading font-bold text-foreground">{company?.name || 'Organigramme'} — Services</p>
          <p className="text-xs text-muted-foreground">{employees.length} collaborateurs</p>
        </div>
        <div ref={areaRef} className="absolute inset-x-0 bottom-0" style={{ top: 56 }}>
          {services.map(s => (
            <FreeServiceBlock
              key={s}
              service={s}
              employees={groups[s]}
              x={positions[s]?.x ?? 20}
              y={positions[s]?.y ?? 20}
              onDragStart={handleDragStart}
              onSelect={onSelect}
              searchTerm={searchTerm}
            />
          ))}
        </div>
      </div>
    </div>
  );
}