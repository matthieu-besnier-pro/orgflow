import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Printer, Save, RotateCcw, Check } from 'lucide-react';
import FreeServiceBlock from '@/components/FreeServiceBlock';
import FreeBoardLinks from '@/components/FreeBoardLinks';
import { useToast } from '@/components/ui/use-toast';

// Formats de page à 96 dpi
const FORMATS = {
  'A4-portrait': { w: 794, h: 1123, label: 'A4 portrait', css: 'A4 portrait' },
  'A4-paysage': { w: 1123, h: 794, label: 'A4 paysage', css: 'A4 landscape' },
  'A3-portrait': { w: 1123, h: 1587, label: 'A3 portrait', css: 'A3 portrait' },
  'A3-paysage': { w: 1587, h: 1123, label: 'A3 paysage', css: 'A3 landscape' },
};
const BLOCK_W = 250;

const GAP_X = 24;
const GAP_Y = 50;

// Hauteur estimée d'un bloc selon son effectif (en-tête + lignes)
function blockHeight(count) {
  return 34 + Math.max(1, count) * 34 + 12;
}

// Disposition automatique en pyramide hiérarchique :
// les services sans manager extérieur en haut, leurs services rattachés en dessous.
function autoLayout(services, links = [], groups = {}, pageW = 1587) {
  const parents = {};
  links.forEach(({ from, to }) => { if (!parents[to]) parents[to] = from; });

  // Niveau de chaque service = profondeur dans la chaîne de rattachement
  const levelOf = (s, seen = new Set()) => {
    if (!parents[s] || seen.has(s) || !services.includes(parents[s])) return 0;
    seen.add(s);
    return 1 + levelOf(parents[s], seen);
  };

  const rows = {};
  services.forEach(s => {
    const lvl = levelOf(s);
    (rows[lvl] ||= []).push(s);
  });

  const map = {};
  let y = 20;
  Object.keys(rows).map(Number).sort((a, b) => a - b).forEach(lvl => {
    // Regrouper les enfants sous leur parent pour un rendu pyramidal lisible
    const row = rows[lvl].sort((a, b) => {
      const pa = parents[a] || '';
      const pb = parents[b] || '';
      return pa.localeCompare(pb, 'fr') || (groups[b]?.length || 0) - (groups[a]?.length || 0);
    });
    const perRow = Math.max(1, Math.floor((pageW - 40) / (BLOCK_W + GAP_X)));
    let maxH = 0;
    for (let i = 0; i < row.length; i += perRow) {
      const chunk = row.slice(i, i + perRow);
      const totalW = chunk.length * BLOCK_W + (chunk.length - 1) * GAP_X;
      const startX = Math.max(20, (pageW - totalW) / 2);
      let chunkH = 0;
      chunk.forEach((s, j) => {
        map[s] = { x: Math.round(startX + j * (BLOCK_W + GAP_X)), y: Math.round(y) };
        chunkH = Math.max(chunkH, blockHeight(groups[s]?.length || 0));
      });
      if (i + perRow < row.length) y += chunkH + GAP_Y;
      maxH = chunkH;
    }
    y += maxH + GAP_Y;
  });
  return map;
}

export default function OrgFreeBoard({ employees, onSelect, searchTerm, companyId, company }) {
  const [positions, setPositions] = useState(null);
  const [recordId, setRecordId] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [format, setFormat] = useState('A3-paysage');
  const PAGE_W = FORMATS[format].w;
  const PAGE_H = FORMATS[format].h;
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

  // Liens de rattachement entre services (un collaborateur dont le manager est dans un autre bloc)
  const empById = {};
  employees.forEach(e => { empById[e.id] = e; });
  const links = (() => {
    const seen = new Set();
    const list = [];
    employees.forEach(e => {
      const m = e.manager_id && empById[e.manager_id];
      if (!m) return;
      const from = m.service || 'Sans service';
      const to = e.service || 'Sans service';
      if (from === to) return;
      const key = `${from}->${to}`;
      if (seen.has(key)) return;
      seen.add(key);
      list.push({ from, to });
    });
    return list;
  })();

  useEffect(() => {
    if (!companyId) return;
    base44.entities.ServiceLayout.filter({ company_id: companyId }).then(recs => {
      const rec = recs[0];
      const saved = {};
      (rec?.positions || []).forEach(p => { saved[p.service] = { x: p.x, y: p.y }; });
      const auto = autoLayout(services, links, groups, PAGE_W);
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
    const auto = autoLayout(services, links, groups, PAGE_W);
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
  }, [PAGE_W]);

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
    setPositions(autoLayout(services, links, groups, PAGE_W));
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
          @page { size: ${FORMATS[format].css}; margin: 6mm; }
          body * { visibility: hidden; }
          .freeboard-page, .freeboard-page * {
            visibility: visible;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          .freeboard-page { position: absolute; left: 0; top: 0; box-shadow: none !important; border: none !important; }
          .freeboard-toolbar { display: none !important; }
        }
      `}</style>

      <div className="freeboard-toolbar flex items-center gap-2 print:hidden">
        <span className="text-xs text-muted-foreground mr-2">Glissez l'en-tête d'un bloc pour l'aérer</span>
        <select
          value={format}
          onChange={e => setFormat(e.target.value)}
          className="h-8 px-2 rounded-lg text-sm border border-border bg-white text-foreground"
        >
          {Object.entries(FORMATS).map(([key, f]) => (
            <option key={key} value={key}>{f.label}</option>
          ))}
        </select>
        <button onClick={save} disabled={!dirty}
          className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-sm font-medium ${dirty ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground'}`}>
          {dirty ? <Save className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
          {dirty ? 'Enregistrer' : 'Enregistré'}
        </button>
        <button onClick={reset} className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-sm font-medium bg-secondary text-foreground hover:bg-secondary/70">
          <RotateCcw className="w-3.5 h-3.5" /> Pyramide auto
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
          <FreeBoardLinks
            links={links}
            positions={positions}
            width={PAGE_W}
            height={maxY - 56}
            heights={Object.fromEntries(services.map(s => [s, blockHeight(groups[s].length)]))}
          />
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