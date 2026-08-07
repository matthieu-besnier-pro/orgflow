import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { ZoomIn, ZoomOut, Maximize, Search, X } from 'lucide-react';
import OrgTreeNode from '@/components/OrgTreeNode';
import usePanDrag from '@/hooks/usePanDrag';

function buildChildrenMap(pool) {
  const ids = new Set(pool.map(e => e.id));
  const map = {};
  pool.forEach(e => {
    if (e.manager_id && ids.has(e.manager_id)) (map[e.manager_id] ||= []).push(e);
  });
  return map;
}

const noop = () => {};

export default function PublicChart() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(0.85);
  const [search, setSearch] = useState('');
  const [size, setSize] = useState(null);
  const contentRef = useRef(null);
  const pan = usePanDrag();

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    base44.functions.invoke('publicChart', { token })
      .then(res => {
        setData(res.data);
        const name = res.data?.company?.name;
        if (name) document.title = `Organigramme ${name} — consultation publique`;
      })
      .catch(() => setError('Ce lien de partage est invalide ou désactivé.'));
  }, []);

  const fitToScreen = () => {
    const el = contentRef.current;
    if (!el) return;
    const avail = (pan.ref.current?.clientWidth || 0) - 48;
    const w = el.offsetWidth;
    setZoom(w > avail ? Math.max(0.15, Math.min(1, avail / w)) : 0.85);
  };

  useEffect(() => {
    if (data) setTimeout(fitToScreen, 250);
  }, [data]);

  // Dimensions réelles après mise à l'échelle → pas de marge blanche parasite
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.offsetWidth * zoom, h: el.offsetHeight * zoom });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [zoom, data]);

  if (error) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">{error}</div>;
  if (!data) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-lavender border-t-primary rounded-full animate-spin" />
    </div>
  );

  const childrenMap = buildChildrenMap(data.employees);
  const ids = new Set(data.employees.map(e => e.id));
  const roots = data.employees.filter(e => !e.manager_id || !ids.has(e.manager_id));
  const searchTerm = search.trim().toLowerCase();

  return (
    <div className="h-screen flex flex-col bg-white">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-wrap">
        {data.company?.logo_url && <img src={data.company.logo_url} alt="" className="h-7 object-contain" />}
        <h1 className="font-heading font-semibold text-foreground text-base">{data.company?.name} — Organigramme</h1>
        <span className="text-xs text-muted-foreground hidden sm:inline">Consultation seule</span>

        <div className="relative flex-1 max-w-xs ml-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            className="w-full h-8 pl-8 pr-7 text-sm rounded-md border border-input bg-transparent"
            placeholder="Rechercher un collaborateur..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setSearch('')}>
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        <div className="ml-auto flex items-center gap-0.5 bg-secondary rounded-lg p-0.5">
          <button onClick={() => setZoom(z => Math.max(0.1, +(z - 0.1).toFixed(2)))}
            className="w-7 h-7 rounded-md hover:bg-white flex items-center justify-center text-muted-foreground">
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-medium px-1 text-muted-foreground w-9 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(1.5, +(z + 0.1).toFixed(2)))}
            className="w-7 h-7 rounded-md hover:bg-white flex items-center justify-center text-muted-foreground">
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button onClick={fitToScreen} title="Ajuster à l'écran"
            className="w-7 h-7 rounded-md bg-primary/10 hover:bg-primary/20 flex items-center justify-center text-primary">
            <Maximize className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div
        ref={pan.ref}
        {...pan.handlers}
        className={`flex-1 overflow-auto p-6 ${pan.panning ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        <div style={{ width: size?.w, height: size?.h, margin: 'auto' }}>
          <div ref={contentRef} style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', transition: 'transform 0.2s ease', width: 'max-content' }}>
            <div className="flex gap-12 items-start justify-center flex-nowrap w-max">
              {roots.map(root => (
                <OrgTreeNode
                  key={root.id}
                  employee={root}
                  childrenMap={childrenMap}
                  onSelect={noop}
                  defaultExpanded
                  depth={0}
                  onDragStart={noop}
                  onDrop={noop}
                  template="classique"
                  searchTerm={searchTerm}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}