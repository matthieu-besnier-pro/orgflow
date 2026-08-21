import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { ZoomIn, ZoomOut, Maximize, Search, X, ChevronUp, ChevronDown } from 'lucide-react';
import OrgTreeNode from '@/components/OrgTreeNode';
import PublicEmployeeModal from '@/components/PublicEmployeeModal';
import usePanDrag from '@/hooks/usePanDrag';
import { buildAgencyEntiteMap, buildEntiteToZone } from '@/lib/ancienneEntite';

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
  const [filterZone, setFilterZone] = useState('');
  const [filterAgency, setFilterAgency] = useState('');
  const [filterAncienneEntite, setFilterAncienneEntite] = useState('');
  const [matchIndex, setMatchIndex] = useState(0);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
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

  const scrollToMatch = (idx) => {
    const nodes = document.querySelectorAll('[data-match="true"]');
    if (!nodes.length) return;
    const node = nodes[Math.min(idx, nodes.length - 1)];
    node.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  };

  useEffect(() => {
    setMatchIndex(0);
    if (search.trim()) setTimeout(() => scrollToMatch(0), 200);
  }, [search]);

  if (error) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">{error}</div>;
  if (!data) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-lavender border-t-primary rounded-full animate-spin" />
    </div>
  );

  // Options de filtre
  const zones = [...new Set(data.employees.map(e => e.zone).filter(Boolean))].sort();
  const anciennesEntites = (() => {
    const companyList = data.company?.anciennes_entites || [];
    if (!companyList.length) return [];
    const employeeValues = new Set(data.employees.map(e => e.ancienne_entite).filter(Boolean));
    return companyList.filter(v => employeeValues.has(v));
  })();
  const agencies = data.agencies || [];

  // Mapping dynamique entité → zone (basé sur les agences et collaborateurs)
  const companyEntites = data.company?.anciennes_entites || null;
  const agencyEntiteMap = buildAgencyEntiteMap(agencies, companyEntites);
  const entiteToZone = buildEntiteToZone(agencies, data.employees, companyEntites);

  // Filtrage par zone / agence / ancienne entité (+ supports groupe + ancêtres)
  // Hiérarchie : Zone → Ancienne entité → Agence → Collaborateurs
  // Les supports groupe sont toujours inclus mais grisés (hors directIds)
  const hasFilters = filterZone || filterAgency || filterAncienneEntite;
  const { filteredEmployees, filterMatchIds } = (() => {
    if (!hasFilters) return { filteredEmployees: data.employees, filterMatchIds: null };
    const empById = {};
    data.employees.forEach(e => { empById[e.id] = e; });
    let matching;
    if (filterAgency) {
      matching = data.employees.filter(e => e.agency_id === filterAgency);
    } else if (filterAncienneEntite) {
      const entiteAgencyIds = new Set(agencies.filter(a => agencyEntiteMap[a.id] === filterAncienneEntite).map(a => a.id));
      matching = data.employees.filter(e => entiteAgencyIds.has(e.agency_id) || e.ancienne_entite === filterAncienneEntite);
    } else if (filterZone) {
      const zoneAgencyIds = new Set(agencies.filter(a => a.zone === filterZone).map(a => a.id));
      agencies.forEach(a => {
        const entite = agencyEntiteMap[a.id];
        if (entite && entiteToZone[entite] === filterZone) zoneAgencyIds.add(a.id);
      });
      matching = data.employees.filter(e => zoneAgencyIds.has(e.agency_id) || e.zone === filterZone || (e.ancienne_entite && entiteToZone[e.ancienne_entite] === filterZone));
    }
    const directIds = new Set(matching.map(e => e.id));
    // Supports groupe : toujours inclus mais grisés (hors directIds)
    const groupSupport = data.employees.filter(e => e.is_group_support && !directIds.has(e.id));
    const base = [...matching, ...groupSupport];
    // Ajouter les ancêtres pour préserver l'arbre
    const resultIds = new Set(base.map(e => e.id));
    base.forEach(e => {
      let cur = empById[e.id];
      while (cur?.manager_id && empById[cur.manager_id]) {
        resultIds.add(cur.manager_id);
        cur = empById[cur.manager_id];
      }
    });
    return { filteredEmployees: data.employees.filter(e => resultIds.has(e.id)), filterMatchIds: directIds };
  })();

  const childrenMap = buildChildrenMap(filteredEmployees);
  const ids = new Set(filteredEmployees.map(e => e.id));
  const roots = filteredEmployees.filter(e => !e.manager_id || !ids.has(e.manager_id));
  const rootsWithChildren = roots.filter(r => (childrenMap[r.id]?.length || 0) > 0);
  const orphanLeaves = roots.filter(r => !(childrenMap[r.id]?.length || 0) > 0);
  const searchTerm = search.trim().toLowerCase();

  // Précalcul des IDs visibles : correspondances + leurs ancêtres (+ racine si une carte latérale correspond)
  const visibleIds = (() => {
    if (!searchTerm) return null;
    const empById = {};
    filteredEmployees.forEach(e => { empById[e.id] = e; });
    const matches = filteredEmployees.filter(e => `${e.first_name} ${e.last_name} ${e.position || ''} ${e.service || ''}`.toLowerCase().includes(searchTerm));
    const result = new Set(matches.map(e => e.id));
    result.forEach(id => {
      let e = empById[id];
      while (e?.manager_id && empById[e.manager_id]) {
        result.add(e.manager_id);
        e = empById[e.manager_id];
      }
    });
    if (orphanLeaves.some(e => `${e.first_name} ${e.last_name} ${e.position || ''} ${e.service || ''}`.toLowerCase().includes(searchTerm))) {
      rootsWithChildren.forEach(r => result.add(r.id));
    }
    return result;
  })();

  // Ordre des services : utilise le mode figé sur le lien de partage (défaut: alphabétique)
  const serviceOrder = (() => {
    const counts = {};
    filteredEmployees.forEach(e => {
      const s = e.service || 'Sans service';
      counts[s] = (counts[s] || 0) + 1;
    });
    const all = Object.keys(counts);
    const mode = data.service_sort_mode || 'alpha';
    if (mode === 'alpha') {
      return all.sort((a, b) => a.localeCompare(b, 'fr'));
    } else if (mode === 'custom') {
      const custom = data.company?.services || [];
      return all.sort((a, b) => {
        const ia = custom.indexOf(a);
        const ib = custom.indexOf(b);
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      });
    }
    return all.sort((a, b) => counts[b] - counts[a]);
  })();

  const matchCount = searchTerm
    ? filteredEmployees.filter(e => `${e.first_name} ${e.last_name} ${e.position || ''} ${e.service || ''}`.toLowerCase().includes(searchTerm)).length
    : 0;

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

        {searchTerm && (
          <div className="flex items-center gap-1 bg-secondary rounded-lg px-2 h-8">
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
              {matchCount > 0 ? `${matchIndex + 1}/${matchCount}` : '0'}
            </span>
            <button
              onClick={() => { const i = Math.max(0, matchIndex - 1); setMatchIndex(i); scrollToMatch(i); }}
              disabled={matchCount === 0}
              className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { const i = Math.min(matchCount - 1, matchIndex + 1); setMatchIndex(i); scrollToMatch(i); }}
              disabled={matchCount === 0}
              className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

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

      {/* Barre de filtres */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-secondary/30 flex-wrap">
        <select
          value={filterZone}
          onChange={e => setFilterZone(e.target.value)}
          className="h-8 text-sm rounded-md border border-input bg-white px-2 pr-7"
        >
          <option value="">Toutes zones</option>
          {zones.map(z => <option key={z} value={z}>{z}</option>)}
        </select>
        <select
          value={filterAgency}
          onChange={e => setFilterAgency(e.target.value)}
          className="h-8 text-sm rounded-md border border-input bg-white px-2 pr-7"
        >
          <option value="">Toutes agences</option>
          {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        {anciennesEntites.length > 0 && (
          <select
            value={filterAncienneEntite}
            onChange={e => setFilterAncienneEntite(e.target.value)}
            className="h-8 text-sm rounded-md border border-input bg-white px-2 pr-7"
          >
            <option value="">Toutes entités</option>
            {anciennesEntites.map(ae => <option key={ae} value={ae}>{ae}</option>)}
          </select>
        )}
        {hasFilters && (
          <button
            onClick={() => { setFilterZone(''); setFilterAgency(''); setFilterAncienneEntite(''); }}
            className="text-xs text-primary hover:underline h-8 px-2"
          >
            Réinitialiser
          </button>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {filteredEmployees.length} / {data.employees.length} collaborateurs
        </span>
      </div>

      <div
        ref={pan.ref}
        {...pan.handlers}
        className={`flex-1 overflow-auto p-6 ${pan.panning ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        <div style={{ width: size?.w, height: size?.h, margin: 'auto' }}>
          <div ref={contentRef} style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', transition: 'transform 0.2s ease', width: 'max-content' }}>
            {rootsWithChildren.length === 1 ? (
              <div className="flex justify-center">
                <OrgTreeNode
                  key={rootsWithChildren[0].id}
                  employee={rootsWithChildren[0]}
                  childrenMap={childrenMap}
                  onSelect={setSelectedEmployee}
                  defaultExpanded
                  depth={0}
                  onDragStart={noop}
                  onDrop={noop}
                  template="classique"
                  searchTerm={searchTerm}
                  serviceOrder={serviceOrder}
                  sideCards={orphanLeaves}
                  visibleIds={visibleIds}
                  filterMatchIds={filterMatchIds}
                />
              </div>
            ) : rootsWithChildren.length > 1 ? (
              <div className="flex gap-12 items-start justify-center flex-nowrap w-max">
                {rootsWithChildren.map((root, i) => (
                  <OrgTreeNode
                    key={root.id}
                    employee={root}
                    childrenMap={childrenMap}
                    onSelect={setSelectedEmployee}
                    defaultExpanded
                    depth={0}
                    onDragStart={noop}
                    onDrop={noop}
                    template="classique"
                    searchTerm={searchTerm}
                    serviceOrder={serviceOrder}
                    sideCards={i === 0 ? orphanLeaves : []}
                    visibleIds={visibleIds}
                    filterMatchIds={filterMatchIds}
                  />
                ))}
              </div>
            ) : (
              <div className="flex gap-4 items-start justify-center flex-wrap">
                {orphanLeaves.map(e => (
                  <OrgTreeNode
                    key={e.id}
                    employee={e}
                    childrenMap={{}}
                    onSelect={setSelectedEmployee}
                    defaultExpanded
                    depth={0}
                    onDragStart={noop}
                    onDrop={noop}
                    template="classique"
                    searchTerm={searchTerm}
                    visibleIds={visibleIds}
                    filterMatchIds={filterMatchIds}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedEmployee && (
        <PublicEmployeeModal
          employee={selectedEmployee}
          employees={data.employees}
          agencies={data.agencies || []}
          onClose={() => setSelectedEmployee(null)}
        />
      )}
    </div>
  );
}