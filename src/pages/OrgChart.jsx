import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { ZoomIn, ZoomOut, RotateCcw, ChevronDown, ChevronUp, Search, X, SlidersHorizontal, LayoutGrid, LayoutList, Rows3, Users } from 'lucide-react';
import EmployeeDrawer from '@/components/EmployeeDrawer';
import OrgTreeNode from '@/components/OrgTreeNode';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

const positionOrder = ['Directeur', 'Président', 'Responsable', 'Resp.', 'Manager', 'Chef', 'Commercial', 'Technicien', 'Magasinier'];

// Anciennes entités : mapping ville → entité
const ANCIENNE_ENTITE_MAP = {
  'Sauze': 'GONNIN',
  'Naintré': 'GONNIN',
  'Chasseneuil': 'GONNIN',
  'La Ferrière': 'GONNIN',
  'Melle': 'QUITTE',
  'Niort': 'QUITTE',
  'Chatillon': 'QUITTE',
  'Vasles': 'QUITTE',
  'Luçay': 'DURIS',
  'Saint Maur': 'DURIS',
  'Issoudun': 'DURIS',
  'Noyers': 'DURIS',
  'PY Pneus': 'DURIS',
  'Arnac': 'DBS',
  'Rivarennes': 'DBS',
  'Béthines': 'DBS',
};

const ANCIENNES_ENTITES = ['GONNIN', 'QUITTE', 'DURIS', 'DBS'];

function getAncienneEntite(agency) {
  if (!agency) return null;
  const city = agency.city || '';
  const name = agency.name || '';
  for (const [key, entite] of Object.entries(ANCIENNE_ENTITE_MAP)) {
    if (city.toLowerCase().includes(key.toLowerCase()) || name.toLowerCase().includes(key.toLowerCase())) {
      return entite;
    }
  }
  return null;
}

function buildChildrenMap(pool) {
  const poolIds = new Set(pool.map(e => e.id));
  const map = {};
  pool.forEach(e => {
    if (e.manager_id && poolIds.has(e.manager_id)) {
      if (!map[e.manager_id]) map[e.manager_id] = [];
      map[e.manager_id].push(e);
    }
  });
  Object.keys(map).forEach(k => {
    map[k].sort((a, b) => {
      const ia = positionOrder.findIndex(p => a.position?.includes(p));
      const ib = positionOrder.findIndex(p => b.position?.includes(p));
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
  });
  return map;
}

function getDescendantIds(managerId, childrenMap) {
  const result = new Set();
  const traverse = (id) => {
    (childrenMap[id] || []).forEach(child => { result.add(child.id); traverse(child.id); });
  };
  traverse(managerId);
  return result;
}

export default function OrgChart() {
  const [employees, setEmployees] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [zoom, setZoom] = useState(0.85);
  const [loading, setLoading] = useState(true);
  const [expandAll, setExpandAll] = useState(false);
  const [template, setTemplate] = useState('classique');

  // Filters
  const [search, setSearch] = useState('');
  const [selectedZone, setSelectedZone] = useState('all');
  const [selectedAgency, setSelectedAgency] = useState('all');
  const [selectedAncienneEntite, setSelectedAncienneEntite] = useState('all');
  const [selectedManagerId, setSelectedManagerId] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [managerSearch, setManagerSearch] = useState('');
  const [managerDropOpen, setManagerDropOpen] = useState(false);

  const draggedId = useRef(null);
  const filterPanelRef = useRef(null);
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([
      base44.entities.Employee.list(),
      base44.entities.Agency.list(),
    ]).then(([emps, ags]) => {
      setEmployees(emps);
      setAgencies(ags);
      setLoading(false);
    });
  }, []);

  // Close filter panel on outside click
  useEffect(() => {
    const handler = (e) => {
      if (filterPanelRef.current && !filterPanelRef.current.contains(e.target)) {
        setFiltersOpen(false);
      }
    };
    if (filtersOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [filtersOpen]);

  // Build pool from zone/agency/ancienne entité filters
  const pool = (() => {
    if (selectedZone === 'Support Groupe') return employees.filter(e => e.is_group_support);
    if (selectedAgency !== 'all') return employees.filter(e => e.agency_id === selectedAgency);
    if (selectedAncienneEntite !== 'all') {
      const entiteAgencyIds = new Set(
        agencies.filter(a => getAncienneEntite(a) === selectedAncienneEntite).map(a => a.id)
      );
      // Also include PY Pneus service employees for DURIS
      if (selectedAncienneEntite === 'DURIS') {
        return employees.filter(e => entiteAgencyIds.has(e.agency_id) || e.service === 'PY Pneus');
      }
      return employees.filter(e => entiteAgencyIds.has(e.agency_id));
    }
    if (selectedZone !== 'all') {
      const ids = new Set(agencies.filter(a => a.zone === selectedZone).map(a => a.id));
      return employees.filter(e => ids.has(e.agency_id));
    }
    return employees;
  })();

  const baseChildrenMap = buildChildrenMap(pool);

  // Apply manager filter
  let filteredPool = pool;
  if (selectedManagerId !== 'all') {
    const fullMap = buildChildrenMap(employees);
    const desc = getDescendantIds(selectedManagerId, fullMap);
    desc.add(selectedManagerId);
    filteredPool = pool.filter(e => desc.has(e.id));
  }

  const finalChildrenMap = buildChildrenMap(filteredPool);
  const finalPoolIds = new Set(filteredPool.map(e => e.id));
  const roots = filteredPool.filter(e => !e.manager_id || !finalPoolIds.has(e.manager_id));

  // Search: highlight matching nodes (passed as prop)
  const searchTerm = search.trim().toLowerCase();

  // Count active filters
  const activeFilters = [selectedZone !== 'all', selectedAgency !== 'all', selectedAncienneEntite !== 'all', selectedManagerId !== 'all'].filter(Boolean).length;

  // Managers list for filter dropdown (people with at least one direct report in pool)
  const managersInPool = pool.filter(e => baseChildrenMap[e.id]?.length > 0);

  const handleDragStart = (e, employee) => {
    draggedId.current = employee.id;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (e, targetEmployee) => {
    const sourceId = draggedId.current;
    draggedId.current = null;
    if (!sourceId || sourceId === targetEmployee.id) return;
    const isDescendant = (parentId, checkId) => {
      const children = (finalChildrenMap[parentId] || []).map(c => c.id);
      if (children.includes(checkId)) return true;
      return children.some(cid => isDescendant(cid, checkId));
    };
    if (isDescendant(sourceId, targetEmployee.id)) {
      toast({ title: 'Impossible', description: "Vous ne pouvez pas déplacer un collaborateur vers l'un de ses subordonnés.", variant: 'destructive' });
      return;
    }
    try {
      await base44.entities.Employee.update(sourceId, { manager_id: targetEmployee.id });
      setEmployees(prev => prev.map(e => e.id === sourceId ? { ...e, manager_id: targetEmployee.id } : e));
      toast({ title: 'Hiérarchie mise à jour', description: `Rattaché à ${targetEmployee.first_name} ${targetEmployee.last_name}` });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de mettre à jour la hiérarchie.', variant: 'destructive' });
    }
  };

  const handleSave = (updated) => {
    setEmployees(prev => prev.map(e => e.id === updated.id ? updated : e));
    setSelectedEmployee(null);
  };
  const handleDelete = (id) => {
    setEmployees(prev => prev.filter(e => e.id !== id));
    setSelectedEmployee(null);
  };

  const resetFilters = () => {
    setSelectedZone('all');
    setSelectedAgency('all');
    setSelectedAncienneEntite('all');
    setSelectedManagerId('all');
    setSearch('');
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-lavender border-t-primary rounded-full animate-spin" />
    </div>
  );

  const selectedManagerName = selectedManagerId !== 'all'
    ? (() => { const m = employees.find(e => e.id === selectedManagerId); return m ? `${m.first_name} ${m.last_name}` : null; })()
    : null;

  return (
    <div className="flex flex-col h-full bg-canvas">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-border">

        {/* Title */}
        <h1 className="font-heading font-semibold text-foreground text-base hidden sm:block mr-2">Organigramme</h1>

        {/* Search bar */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder="Rechercher un collaborateur..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setSearch('')}>
              <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        {/* Filters button */}
        <div className="relative" ref={filterPanelRef}>
          <button
            onClick={() => setFiltersOpen(v => !v)}
            className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-sm font-medium border transition-colors ${filtersOpen || activeFilters > 0 ? 'bg-primary text-white border-primary' : 'bg-white text-muted-foreground border-border hover:bg-secondary'}`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filtres</span>
            {activeFilters > 0 && (
              <span className="w-4 h-4 rounded-full bg-white text-primary text-xs font-bold flex items-center justify-center">{activeFilters}</span>
            )}
          </button>

          {/* Filter panel dropdown */}
          {filtersOpen && (
            <div className="absolute left-0 top-full mt-2 w-72 bg-white border border-border rounded-xl shadow-xl z-50 p-4 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold text-foreground">Filtres</p>
                {activeFilters > 0 && (
                  <button onClick={resetFilters} className="text-xs text-primary hover:underline">Réinitialiser</button>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Ancienne entité</label>
                <Select value={selectedAncienneEntite} onValueChange={v => { setSelectedAncienneEntite(v); setSelectedZone('all'); setSelectedAgency('all'); }}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les entités</SelectItem>
                    {ANCIENNES_ENTITES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Zone géographique</label>
                <Select value={selectedZone} onValueChange={v => { setSelectedZone(v); setSelectedAgency('all'); setSelectedAncienneEntite('all'); }}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les zones</SelectItem>
                    <SelectItem value="Zone Centre">Zone Centre</SelectItem>
                    <SelectItem value="Zone Ouest">Zone Ouest</SelectItem>
                    <SelectItem value="Support Groupe">Support Groupe</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedZone !== 'Support Groupe' && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Agence</label>
                  <Select value={selectedAgency} onValueChange={setSelectedAgency}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les agences</SelectItem>
                      {agencies
                        .filter(a => selectedZone === 'all' || a.zone === selectedZone)
                        .map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Vue centrée sur un manager</label>
                <div className="relative">
                  <div
                    className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 text-sm cursor-pointer hover:bg-secondary/50 transition-colors"
                    onClick={() => { setManagerDropOpen(v => !v); setManagerSearch(''); }}
                  >
                    <span className={selectedManagerId !== 'all' ? 'text-foreground truncate' : 'text-muted-foreground'}>
                      {selectedManagerName || 'Choisir un manager'}
                    </span>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                      {selectedManagerId !== 'all' && (
                        <X className="w-3 h-3 text-muted-foreground hover:text-foreground" onClick={e => { e.stopPropagation(); setSelectedManagerId('all'); }} />
                      )}
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  </div>
                  {managerDropOpen && (
                    <div className="absolute z-50 mt-1 w-full bg-white border border-border rounded-lg shadow-lg overflow-hidden">
                      <div className="p-2 border-b border-border">
                        <Input autoFocus placeholder="Rechercher..." value={managerSearch}
                          onChange={e => setManagerSearch(e.target.value)}
                          className="h-7 text-xs" onClick={e => e.stopPropagation()} />
                      </div>
                      <div className="max-h-40 overflow-y-auto">
                        <div className="px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary cursor-pointer"
                          onClick={() => { setSelectedManagerId('all'); setManagerDropOpen(false); }}>
                          Tous les managers
                        </div>
                        {managersInPool
                          .filter(e => `${e.first_name} ${e.last_name}`.toLowerCase().includes(managerSearch.toLowerCase()))
                          .sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`, 'fr'))
                          .map(m => (
                            <div key={m.id}
                              className={`px-3 py-1.5 text-xs cursor-pointer hover:bg-secondary ${selectedManagerId === m.id ? 'bg-lavender font-medium' : ''}`}
                              onClick={() => { setSelectedManagerId(m.id); setManagerDropOpen(false); setManagerSearch(''); }}>
                              {m.last_name} {m.first_name}
                              <span className="text-muted-foreground ml-1">— {m.position}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Active filter chips */}
        {selectedAncienneEntite !== 'all' && (
          <span className="hidden md:flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded-full">
            Entité {selectedAncienneEntite}
            <X className="w-3 h-3 cursor-pointer hover:text-primary/70" onClick={() => setSelectedAncienneEntite('all')} />
          </span>
        )}
        {selectedZone !== 'all' && (
          <span className="hidden md:flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded-full">
            {selectedZone}
            <X className="w-3 h-3 cursor-pointer hover:text-primary/70" onClick={() => { setSelectedZone('all'); setSelectedAgency('all'); }} />
          </span>
        )}
        {selectedAgency !== 'all' && (
          <span className="hidden md:flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded-full">
            {agencies.find(a => a.id === selectedAgency)?.name}
            <X className="w-3 h-3 cursor-pointer hover:text-primary/70" onClick={() => setSelectedAgency('all')} />
          </span>
        )}
        {selectedManagerId !== 'all' && selectedManagerName && (
          <span className="hidden md:flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded-full">
            <Users className="w-3 h-3" />
            {selectedManagerName}
            <X className="w-3 h-3 cursor-pointer hover:text-primary/70" onClick={() => setSelectedManagerId('all')} />
          </span>
        )}

        <div className="flex-1" />

        {/* Template toggle */}
        <div className="flex items-center gap-0.5 bg-secondary rounded-lg p-0.5">
          {[
            { key: 'classique', icon: <LayoutGrid className="w-3.5 h-3.5" />, label: 'Classique' },
            { key: 'moderne', icon: <Rows3 className="w-3.5 h-3.5" />, label: 'Moderne' },
            { key: 'compact', icon: <LayoutList className="w-3.5 h-3.5" />, label: 'Compact' },
          ].map(t => (
            <button key={t.key} onClick={() => setTemplate(t.key)} title={t.label}
              className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${template === t.key ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {t.icon}
            </button>
          ))}
        </div>

        {/* Expand/collapse */}
        <button onClick={() => setExpandAll(v => !v)} title={expandAll ? 'Tout réduire' : 'Tout déplier'}
          className="w-8 h-8 rounded-lg bg-secondary hover:bg-accent flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground">
          {expandAll ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {/* Zoom controls */}
        <div className="flex items-center gap-0.5 bg-secondary rounded-lg p-0.5">
          <button onClick={() => setZoom(z => Math.max(0.3, +(z - 0.1).toFixed(1)))}
            className="w-7 h-7 rounded-md hover:bg-white flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground">
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-medium px-1 text-muted-foreground w-9 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(1.5, +(z + 0.1).toFixed(1)))}
            className="w-7 h-7 rounded-md hover:bg-white flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground">
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setZoom(0.85)} title="Réinitialiser le zoom"
            className="w-7 h-7 rounded-md hover:bg-white flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground">
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* ── Canvas ── */}
      <div className="flex-1 overflow-auto p-8">
        <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.2s ease', minWidth: 'max-content' }}>
          {roots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
              <Search className="w-10 h-10 text-muted-foreground/40" />
              <p className="text-muted-foreground font-medium">Aucun collaborateur trouvé</p>
              {(activeFilters > 0 || search) && (
                <button onClick={resetFilters} className="text-sm text-primary hover:underline">Réinitialiser les filtres</button>
              )}
            </div>
          ) : roots.length === 1 ? (
            <div className="flex justify-center">
              <OrgTreeNode
                key={`${roots[0].id}-${expandAll}`}
                employee={roots[0]}
                childrenMap={finalChildrenMap}
                onSelect={setSelectedEmployee}
                defaultExpanded={expandAll}
                depth={0}
                onDragStart={handleDragStart}
                onDrop={handleDrop}
                template={template}
                searchTerm={searchTerm}
              />
            </div>
          ) : (
            <div className="flex gap-12 items-start justify-center flex-wrap">
              {roots.map(root => (
                <OrgTreeNode
                  key={`${root.id}-${expandAll}`}
                  employee={root}
                  childrenMap={finalChildrenMap}
                  onSelect={setSelectedEmployee}
                  defaultExpanded={expandAll}
                  depth={0}
                  onDragStart={handleDragStart}
                  onDrop={handleDrop}
                  template={template}
                  searchTerm={searchTerm}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedEmployee && (
        <EmployeeDrawer
          employee={selectedEmployee}
          agencies={agencies}
          allEmployees={employees}
          isHR={true}
          onClose={() => setSelectedEmployee(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}