import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { ZoomIn, ZoomOut, RotateCcw, Maximize, ChevronDown, ChevronUp, Search, X, SlidersHorizontal, LayoutGrid, LayoutList, Rows3, Users, Printer, Clipboard, Presentation, Palette, AlertTriangle, Brush } from 'lucide-react';
import EmployeeDrawer from '@/components/EmployeeDrawer';
import CompanySwitcher from '@/components/CompanySwitcher';
import OrgTreeNode from '@/components/OrgTreeNode';
import OrgChartPrintView from '@/components/OrgChartPrintView';
import OrgWhiteboardView from '@/components/OrgWhiteboardView';
import OrgPresentationFrame from '@/components/OrgPresentationFrame';
import ServiceLegend from '@/components/ServiceLegend';
import OrgBreadcrumb from '@/components/OrgBreadcrumb';
import usePanDrag from '@/hooks/usePanDrag';
import OrgMiniMap from '@/components/OrgMiniMap';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useCompany } from '@/lib/CompanyContext';
import readDroppedFiles from '@/lib/readDroppedFiles';
import ChartAppearancePanel from '@/components/ChartAppearancePanel';

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
  'Arnac la Poste': 'DBS',
  'Rivarennes': 'DBS',
  'Béthines': 'DBS',
};

const ANCIENNES_ENTITES = ['GONNIN', 'QUITTE', 'DURIS', 'DBS'];

// Mapping ancienne entité → zone géographique
const ENTITE_TO_ZONE = {
  'GONNIN': 'Zone Ouest',
  'QUITTE': 'Zone Ouest',
  'DURIS': 'Zone Centre',
  'DBS': 'Zone Centre',
};

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

function addAncestors(ids, allEmps) {
  const empById = {};
  allEmps.forEach(e => { empById[e.id] = e; });
  const result = new Set(ids);
  let changed = true;
  while (changed) {
    changed = false;
    result.forEach(id => {
      const e = empById[id];
      if (e?.manager_id && !result.has(e.manager_id) && empById[e.manager_id]) {
        result.add(e.manager_id);
        changed = true;
      }
    });
  }
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
  const [viewMode, setViewMode] = useState('hierarchical');
  const [printMode, setPrintMode] = useState(false);
  const [printFormat, setPrintFormat] = useState('A3-paysage');
  const [colorMode, setColorMode] = useState('depth');
  const [showAnomalies, setShowAnomalies] = useState(false);
  const [depthColors, setDepthColors] = useState(null);
  const [appearanceId, setAppearanceId] = useState(null);
  const [appearanceOpen, setAppearanceOpen] = useState(false);

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
  const contentRef = useRef(null);
  const { toast } = useToast();

  const { selectedCompanyId, selectedCompany, zones: companyZones } = useCompany();
  const pan = usePanDrag();

  useEffect(() => {
    if (!selectedCompanyId) return;
    setLoading(true);
    Promise.all([
      base44.entities.Employee.filter({ company_id: selectedCompanyId }),
      base44.entities.Agency.filter({ company_id: selectedCompanyId }),
    ]).then(([emps, ags]) => {
      setEmployees(emps);
      setAgencies(ags);
      setLoading(false);
    });
  }, [selectedCompanyId]);

  // Apparence des cartes personnalisée par société
  useEffect(() => {
    if (!selectedCompanyId) return;
    base44.entities.ChartAppearance.filter({ company_id: selectedCompanyId }).then(list => {
      const a = list[0];
      setAppearanceId(a?.id || null);
      setTemplate(a?.template || 'classique');
      setColorMode(a?.color_mode || 'depth');
      setDepthColors(a?.depth_colors?.length ? a.depth_colors : null);
    });
  }, [selectedCompanyId]);

  const handleSaveAppearance = async (settings) => {
    setTemplate(settings.template);
    setColorMode(settings.color_mode);
    setDepthColors(settings.depth_colors);
    if (appearanceId) {
      await base44.entities.ChartAppearance.update(appearanceId, settings);
    } else {
      const created = await base44.entities.ChartAppearance.create({ company_id: selectedCompanyId, ...settings });
      setAppearanceId(created.id);
    }
    setAppearanceOpen(false);
    toast({ title: 'Apparence enregistrée', description: `Réglages propres à ${selectedCompany?.name || 'cette société'}`, duration: 3000 });
  };

  // Recharger les employés en temps réel quand le chat en ajoute
  useEffect(() => {
    const unsubscribe = base44.entities.Employee.subscribe(() => {
      if (!selectedCompanyId) return;
      base44.entities.Employee.filter({ company_id: selectedCompanyId }).then(emps => setEmployees(emps));
    });
    return unsubscribe;
  }, [selectedCompanyId]);

  // Close filter panel on outside click — ignore clicks inside Radix portals
  useEffect(() => {
    const handler = (e) => {
      // Radix Select portals render outside DOM tree but have data-radix-* attributes
      if (e.target.closest('[data-radix-popper-content-wrapper]')) return;
      if (filterPanelRef.current && !filterPanelRef.current.contains(e.target)) {
        setFiltersOpen(false);
      }
    };
    if (filtersOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [filtersOpen]);

  // Ajuster le zoom pour que tout l'organigramme tienne dans l'écran
  const fitToScreen = () => {
    const el = contentRef.current;
    if (!el) return;
    const container = el.parentElement;
    const contentWidth = el.offsetWidth;
    const availWidth = container.clientWidth - 64; // p-8 = 32px de chaque côté
    if (contentWidth > availWidth) {
      setZoom(Math.max(0.1, Math.min(1, availWidth / contentWidth)));
    } else {
      setZoom(0.85);
    }
  };

  // Auto-ajuster quand on déplie tout
  useEffect(() => {
    if (expandAll) {
      const timer = setTimeout(fitToScreen, 200);
      return () => clearTimeout(timer);
    } else {
      setZoom(0.85);
    }
  }, [expandAll]);

  // Build pool from zone/agency/ancienne entité filters
  // baseFiltered = only the directly matching employees (for service view)
  // pool = baseFiltered + ancestors (for tree view, so hierarchy connects)
  // Support Groupe employees are always included (transversal to all agencies),
  // EXCEPT when the filter is explicitly set to "Support Groupe" only.
  const { baseFiltered, pool } = (() => {
    let base;
    if (selectedZone === 'Support Groupe') {
      base = employees.filter(e => e.is_group_support);
    } else if (selectedAgency !== 'all') {
      base = employees.filter(e => e.agency_id === selectedAgency || e.is_group_support);
    } else if (selectedAncienneEntite !== 'all') {
      const entiteAgencyIds = new Set(
        agencies.filter(a => getAncienneEntite(a) === selectedAncienneEntite).map(a => a.id)
      );
      if (selectedAncienneEntite === 'DURIS') {
        base = employees.filter(e => entiteAgencyIds.has(e.agency_id) || e.ancienne_entite === selectedAncienneEntite || e.service === 'PY Pneus' || e.is_group_support);
      } else {
        base = employees.filter(e => entiteAgencyIds.has(e.agency_id) || e.ancienne_entite === selectedAncienneEntite || e.is_group_support);
      }
    } else if (selectedZone !== 'all') {
      const ids = new Set(agencies.filter(a => a.zone === selectedZone).map(a => a.id));
      base = employees.filter(e => ids.has(e.agency_id) || e.zone === selectedZone || e.is_group_support);
    } else {
      return { baseFiltered: employees, pool: employees };
    }
    // Add ancestors so the tree is connected
    const withAncestors = addAncestors(base.map(e => e.id), employees);
    return { baseFiltered: base, pool: employees.filter(e => withAncestors.has(e.id)) };
  })();

  const baseChildrenMap = buildChildrenMap(pool);

  // Apply manager filter
  let filteredPool = pool;
  let filteredBase = baseFiltered;
  if (selectedManagerId !== 'all') {
    const fullMap = buildChildrenMap(employees);
    const desc = getDescendantIds(selectedManagerId, fullMap);
    desc.add(selectedManagerId);
    filteredPool = pool.filter(e => desc.has(e.id));
    filteredBase = baseFiltered.filter(e => desc.has(e.id));
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
    // Dépôt d'un fichier image depuis l'ordinateur → mise à jour de la photo
    const droppedFiles = await readDroppedFiles(e.dataTransfer);
    const image = droppedFiles.find(f => f.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|heic|heif|bmp)$/i.test(f.name));
    if (image) {
      draggedId.current = null;
      toast({ title: 'Envoi de la photo…', duration: 2000 });
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: image });
        await base44.entities.Employee.update(targetEmployee.id, { photo_url: file_url });
        setEmployees(prev => prev.map(emp => emp.id === targetEmployee.id ? { ...emp, photo_url: file_url } : emp));
        toast({ title: 'Photo mise à jour', description: `${targetEmployee.first_name} ${targetEmployee.last_name}`, duration: 3000 });
      } catch {
        toast({ title: 'Erreur', description: "Impossible d'envoyer la photo.", variant: 'destructive', duration: 3000 });
      }
      return;
    }

    const sourceId = draggedId.current;
    draggedId.current = null;
    if (!sourceId || sourceId === targetEmployee.id) return;
    const isDescendant = (parentId, checkId) => {
      const children = (finalChildrenMap[parentId] || []).map(c => c.id);
      if (children.includes(checkId)) return true;
      return children.some(cid => isDescendant(cid, checkId));
    };
    if (isDescendant(sourceId, targetEmployee.id)) {
      toast({ title: 'Impossible', description: "Vous ne pouvez pas déplacer un collaborateur vers l'un de ses subordonnés.", variant: 'destructive', duration: 3000 });
      return;
    }
    try {
      const source = employees.find(e => e.id === sourceId);
      await base44.entities.Employee.update(sourceId, { manager_id: targetEmployee.id });
      setEmployees(prev => prev.map(e => e.id === sourceId ? { ...e, manager_id: targetEmployee.id } : e));
      // Traçabilité : enregistrer le changement de rattachement dans les mouvements RH
      if (source) {
        const oldManager = employees.find(e => e.id === source.manager_id);
        await base44.entities.HRMovement.create({
          company_id: selectedCompanyId,
          employee_id: sourceId,
          employee_name: `${source.first_name} ${source.last_name}`,
          movement_type: 'Changement de poste',
          movement_date: new Date().toISOString().split('T')[0],
          reason: `Changement de rattachement : ${oldManager ? `${oldManager.first_name} ${oldManager.last_name}` : 'aucun manager'} → ${targetEmployee.first_name} ${targetEmployee.last_name}`,
          status: 'Validé',
        });
      }
      toast({ title: 'Hiérarchie mise à jour', description: `Rattaché à ${targetEmployee.first_name} ${targetEmployee.last_name}`, duration: 3000 });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de mettre à jour la hiérarchie.', variant: 'destructive', duration: 3000 });
    }
  };

  // Double-clic sur une carte : centrer l'organigramme sur ce collaborateur
  const handleFocus = (employee) => {
    if (selectedManagerId === employee.id) {
      setSelectedManagerId('all');
      toast({ title: 'Vue complète rétablie', duration: 2000 });
    } else {
      setSelectedManagerId(employee.id);
      toast({ title: 'Vue centrée', description: `${employee.first_name} ${employee.last_name} et son équipe`, duration: 2500 });
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
    <div className="flex flex-col h-full bg-white">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-border flex-wrap">

        {/* Company switcher */}
        <CompanySwitcher />

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
                <Select value={selectedAncienneEntite} onValueChange={v => { setSelectedAncienneEntite(v); setSelectedZone(v !== 'all' ? ENTITE_TO_ZONE[v] : 'all'); setSelectedAgency('all'); }}>
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
                    {companyZones.map(z => <SelectItem key={z} value={z}>{z}</SelectItem>)}
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
                        .filter(a => {
                          if (selectedZone !== 'all') return a.zone === selectedZone;
                          if (selectedAncienneEntite !== 'all') return a.zone === ENTITE_TO_ZONE[selectedAncienneEntite];
                          return true;
                        })
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

        {/* View mode toggle */}
        <div className="flex items-center gap-0.5 bg-secondary rounded-lg p-0.5">
          {[
            { key: 'hierarchical', icon: <LayoutGrid className="w-3.5 h-3.5" />, label: 'Vue hiérarchique' },
            { key: 'tableau', icon: <Clipboard className="w-3.5 h-3.5" />, label: 'Tableau blanc (A3 paysage)' },
          ].map(t => (
            <button key={t.key} onClick={() => setViewMode(t.key)} title={t.label}
              className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${viewMode === t.key ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {t.icon}
            </button>
          ))}
        </div>

        {/* Template toggle (tree only) */}
        {viewMode === 'hierarchical' && (
          <div className="flex items-center gap-0.5 bg-secondary rounded-lg p-0.5">
            {[
              { key: 'classique', icon: <LayoutGrid className="w-3.5 h-3.5" />, label: 'Classique' },
              { key: 'moderne', icon: <Rows3 className="w-3.5 h-3.5" />, label: 'Moderne' },
              { key: 'compact', icon: <LayoutList className="w-3.5 h-3.5" />, label: 'Compact' },
              { key: 'presentation', icon: <Presentation className="w-3.5 h-3.5" />, label: 'Présentation' },
            ].map(t => (
              <button key={t.key} onClick={() => setTemplate(t.key)} title={t.label}
                className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${template === t.key ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                {t.icon}
              </button>
            ))}
          </div>
        )}

        {/* Couleur par service + anomalies (tree only) */}
        {viewMode === 'hierarchical' && (
          <div className="flex items-center gap-0.5 bg-secondary rounded-lg p-0.5">
            <button
              onClick={() => setAppearanceOpen(true)}
              title={`Personnaliser l'apparence pour ${selectedCompany?.name || 'cette société'}`}
              className="w-7 h-7 rounded-md flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground hover:bg-white">
              <Brush className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setColorMode(m => m === 'service' ? 'depth' : 'service')}
              title={colorMode === 'service' ? 'Couleurs par niveau hiérarchique' : 'Couleurs par service'}
              className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${colorMode === 'service' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
              <Palette className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowAnomalies(v => !v)}
              title={showAnomalies ? 'Masquer les anomalies de données' : 'Afficher les anomalies de données'}
              className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${showAnomalies ? 'bg-white shadow-sm text-amber-600' : 'text-muted-foreground hover:text-foreground'}`}>
              <AlertTriangle className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Expand/collapse (tree only) */}
        {viewMode === 'hierarchical' && (
          <button onClick={() => setExpandAll(v => !v)} title={expandAll ? 'Tout réduire' : 'Tout déplier'}
            className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-sm font-medium border transition-colors ${expandAll ? 'bg-primary text-white border-primary' : 'bg-white text-foreground border-border hover:bg-secondary'}`}>
            {expandAll ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            <span>{expandAll ? 'Tout réduire' : 'Tout déplier'}</span>
          </button>
        )}

        {/* Zoom controls (tree only) */}
        {viewMode === 'hierarchical' && (
          <div className="flex items-center gap-0.5 bg-secondary rounded-lg p-0.5">
            <button onClick={() => setZoom(z => Math.max(0.1, +(z - 0.1).toFixed(1)))}
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
            <button onClick={fitToScreen} title="Ajuster à l'écran"
              className="w-7 h-7 rounded-md bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors text-primary">
              <Maximize className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Print button */}
        <button
          onClick={() => setPrintMode(!printMode)}
          title={printMode ? "Quitter l'aperçu d'impression" : "Aperçu d'impression"}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            printMode ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground hover:text-foreground'
          }`}
        >
          <Printer className="w-4 h-4" />
        </button>
      </div>

      {/* Fil d'Ariane quand la vue est centrée sur un manager */}
      {selectedManagerId !== 'all' && (
        <OrgBreadcrumb employees={employees} focusedId={selectedManagerId} onNavigate={setSelectedManagerId} />
      )}

      {/* Légende des couleurs de services */}
      {!printMode && colorMode === 'service' && (
        <ServiceLegend services={[...new Set(filteredBase.map(e => e.service || 'Sans service'))].sort((a, b) => a.localeCompare(b, 'fr'))} />
      )}

      {/* ── Canvas ── */}
      <div
        ref={pan.ref}
        {...(viewMode === 'hierarchical' && !printMode ? pan.handlers : {})}
        className={`flex-1 overflow-auto ${printMode ? 'p-0 bg-gray-100' : 'p-8'} ${viewMode === 'hierarchical' && !printMode ? (pan.panning ? 'cursor-grabbing' : 'cursor-grab') : ''}`}>
        {printMode && (
          <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-border p-4 flex items-center gap-4 shadow-sm">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-foreground">Format :</label>
              <select
                value={printFormat}
                onChange={(e) => setPrintFormat(e.target.value)}
                className="px-3 py-1 text-sm border border-border rounded-lg"
              >
                <option value="A3-paysage">A3 paysage (420×297 mm)</option>
                <option value="A3">A3 portrait (297×420 mm)</option>
                <option value="A4-paysage">A4 paysage (297×210 mm)</option>
                <option value="A4">A4 portrait (210×297 mm)</option>
              </select>
            </div>
            <button
              onClick={() => window.print()}
              className="ml-auto px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90"
            >
              Imprimer
            </button>
            <button
              onClick={() => setPrintMode(false)}
              className="px-4 py-2 bg-secondary text-foreground rounded-lg text-sm font-medium"
            >
              Fermer
            </button>
          </div>
        )}

        {printMode ? (
          <div style={{ paddingTop: printMode ? '70px' : '0' }}>
            <OrgChartPrintView
              employees={filteredBase}
              roots={roots}
              childrenMap={finalChildrenMap}
              pageFormat={printFormat}
            />
          </div>
        ) : (
          <>
            {viewMode === 'tableau' ? (
              <OrgWhiteboardView
                employees={filteredBase}
                agencies={agencies}
                onSelect={setSelectedEmployee}
                searchTerm={searchTerm}
                company={selectedCompany}
              />
            ) : (
              <div ref={contentRef} style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.2s ease', minWidth: 'max-content' }}>
                <OrgPresentationFrame active={template === 'presentation'} company={selectedCompany}>
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
                      onFocus={handleFocus}
                      colorMode={colorMode}
                      showAnomalies={showAnomalies}
                      depthColors={depthColors}
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
                        onFocus={handleFocus}
                        colorMode={colorMode}
                        showAnomalies={showAnomalies}
                        depthColors={depthColors}
                      />
                    ))}
                  </div>
                )}
                </OrgPresentationFrame>
              </div>
            )}
          </>
        )}
      </div>

      {viewMode === 'hierarchical' && !printMode && (
        <OrgMiniMap
          containerRef={pan.ref}
          contentRef={contentRef}
          deps={`${zoom}-${expandAll}-${template}-${filteredPool.length}-${selectedManagerId}`}
        />
      )}

      {appearanceOpen && (
        <ChartAppearancePanel
          companyName={selectedCompany?.name || 'cette société'}
          initial={{ template, colorMode, depthColors }}
          onSave={handleSaveAppearance}
          onClose={() => setAppearanceOpen(false)}
        />
      )}

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