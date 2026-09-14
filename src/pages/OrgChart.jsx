import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { ZoomIn, ZoomOut, RotateCcw, Maximize, ChevronDown, ChevronUp, Search, X, SlidersHorizontal, LayoutGrid, LayoutList, Rows3, Users, Printer, Clipboard, Presentation, Palette, AlertTriangle, Brush, Move, ListOrdered, Undo2, Redo2, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useOrgHistory } from '@/hooks/useOrgHistory';
import EmployeeDrawer from '@/components/EmployeeDrawer';
import CompanySwitcher from '@/components/CompanySwitcher';
import OrgTreeNode from '@/components/OrgTreeNode';
import OrgChartExactPrint from '@/components/OrgChartExactPrint';
import OrgWhiteboardView from '@/components/OrgWhiteboardView';
import OrgPresentationFrame from '@/components/OrgPresentationFrame';
import OrgFreeBoard from '@/components/OrgFreeBoard';
import ServiceLegend from '@/components/ServiceLegend';
import OrgBreadcrumb from '@/components/OrgBreadcrumb';
import usePanDrag from '@/hooks/usePanDrag';
import OrgMiniMap from '@/components/OrgMiniMap';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useCompany } from '@/lib/CompanyContext';
import { useAuth } from '@/lib/AuthContext';
import readDroppedFiles from '@/lib/readDroppedFiles';
import ChartAppearancePanel from '@/components/ChartAppearancePanel';
import ServiceManagerPanel from '@/components/ServiceManagerPanel';
import ShareChartPanel from '@/components/ShareChartPanel';
import AccessRequestButton from '@/components/AccessRequestButton';
import { logAuditAction } from '@/lib/auditLog';
import { Tags, Share2 } from 'lucide-react';
import { getAncienneEntite } from '@/lib/ancienneEntite';
import { processPhoto } from '@/lib/imageProcessing';
import { ViewModeProvider } from '@/lib/ViewModeContext';

const positionOrder = ['Directeur', 'Président', 'Responsable', 'Resp.', 'Manager', 'Chef', 'Commercial', 'Technicien', 'Magasinier'];

const ANCIENNES_ENTITES = ['GONNIN', 'QUITTE', 'DURIS', 'DBS'];

// Mapping ancienne entité → zone géographique (fallback statique — remplacé par entiteToZone dynamique)
const ENTITE_TO_ZONE = {
  'GONNIN': 'Zone Ouest',
  'QUITTE': 'Zone Ouest',
  'DURIS': 'Zone Centre',
  'DBS': 'Zone Centre',
};

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

function addAncestors(ids, empById) {
  const result = new Set(ids);
  ids.forEach(id => {
    let current = empById[id];
    while (current?.manager_id && empById[current.manager_id] && !result.has(current.manager_id)) {
      result.add(current.manager_id);
      current = empById[current.manager_id];
    }
  });
  return result;
}

export default function OrgChart() {
  const [employees, setEmployees] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [zoom, setZoom] = useState(0.85);
  const [loading, setLoading] = useState(true);
  const [expandAll, setExpandAll] = useState(true);
  const [template, setTemplate] = useState('classique');
  const [viewMode, setViewMode] = useState('hierarchical');
  const [printMode, setPrintMode] = useState(false);
  const [printFormat, setPrintFormat] = useState('A3-paysage');
  const [colorMode, setColorMode] = useState('depth');
  const [showAnomalies, setShowAnomalies] = useState(false);
  const [depthColors, setDepthColors] = useState(null);
  const [appearanceId, setAppearanceId] = useState(null);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [scaledSize, setScaledSize] = useState(null);
  const [serviceSortMode, setServiceSortMode] = useState('count');
  const [positionViewMode, setPositionViewMode] = useState('standard');

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selectedZone, setSelectedZone] = useState('all');
  const [selectedAgency, setSelectedAgency] = useState('all');
  const [selectedAncienneEntite, setSelectedAncienneEntite] = useState('all');
  const [selectedService, setSelectedService] = useState('all');
  const [selectedManagerId, setSelectedManagerId] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [managerSearch, setManagerSearch] = useState('');
  const [managerDropOpen, setManagerDropOpen] = useState(false);

  const draggedId = useRef(null);
  const filterPanelRef = useRef(null);
  const contentRef = useRef(null);
  const { toast } = useToast();
  const { pushAction, undo, redo, canUndo, canRedo } = useOrgHistory(setEmployees, toast);

  const { selectedCompanyId, selectedCompany, zones: companyZones, loading: companyLoading } = useCompany();
  const { user } = useAuth();
  const isHR = user?.role === 'admin' || user?.role === 'rh';
  const pan = usePanDrag();

  // Debounce search to avoid re-rendering the tree on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 200);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (!selectedCompanyId) return;
    setSelectedAncienneEntite('all');
    setSelectedZone('all');
    setSelectedAgency('all');
    setSelectedService('all');
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

  // Mise à jour incrémentale en temps réel (évite un rechargement complet à chaque changement)
  useEffect(() => {
    const unsubscribe = base44.entities.Employee.subscribe((event) => {
      if (!selectedCompanyId) return;
      const { id, type, data } = event || {};
      if (type === 'delete') {
        setEmployees(prev => prev.filter(e => e.id !== id));
      } else if (type === 'create' && data) {
        setEmployees(prev => prev.some(e => e.id === id) ? prev : [...prev, data]);
      } else if (type === 'update' && data) {
        setEmployees(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));
      }
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
    const container = pan.ref.current;
    if (!el || !container) return;
    const contentWidth = el.offsetWidth;
    const availWidth = container.clientWidth - 64; // p-8 = 32px de chaque côté
    if (contentWidth > availWidth) {
      setZoom(Math.max(0.1, Math.min(1, availWidth / contentWidth)));
    } else {
      setZoom(0.85);
    }
  };

  // Taille réelle après mise à l'échelle → évite les grandes zones blanches
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const measure = () => setScaledSize({ w: el.offsetWidth * zoom, h: el.offsetHeight * zoom });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [zoom, viewMode, printMode, template, loading]);

  // Auto-ajuster quand on déplie tout
  useEffect(() => {
    if (loading) return;
    if (expandAll) {
      const timer = setTimeout(fitToScreen, 300);
      return () => clearTimeout(timer);
    } else {
      setZoom(0.85);
    }
  }, [expandAll, loading, viewMode, template]);

  // Raccourcis clavier : Ctrl+Z annuler, Ctrl+Y / Ctrl+Shift+Z rétablir
  useEffect(() => {
    const handler = (e) => {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return;
      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
        else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  // Maps de recherche O(1) pour les performances
  const empById = useMemo(() => {
    const map = {};
    employees.forEach(e => { map[e.id] = e; });
    return map;
  }, [employees]);

  const fullChildrenMap = useMemo(() => buildChildrenMap(employees), [employees]);

  const companyAnciennesEntites = selectedCompany?.anciennes_entites || [];

  const agencyEntiteMap = useMemo(() => {
    const map = {};
    agencies.forEach(a => { map[a.id] = getAncienneEntite(a, companyAnciennesEntites); });
    return map;
  }, [agencies, companyAnciennesEntites]);

  const entiteToZone = useMemo(() => {
    const map = {};
    agencies.forEach(a => {
      const entite = getAncienneEntite(a, companyAnciennesEntites);
      if (entite && a.zone) map[entite] = a.zone;
    });
    employees.forEach(e => {
      if (e.ancienne_entite && e.zone) map[e.ancienne_entite] = e.zone;
    });
    return map;
  }, [agencies, employees, companyAnciennesEntites]);

  // Build pool from zone/agency/ancienne entité filters
  // directMatchIds = collaborateurs correspondant directement au filtre (sans supports groupe)
  // → utilisés pour griser les supports groupe et les managers hors périmètre
  const { baseFiltered, pool, directMatchIds } = useMemo(() => {
    let base;
    let directIds = null;
    if (selectedZone === 'Support Groupe') {
      base = employees.filter(e => e.is_group_support);
      directIds = new Set(base.map(e => e.id));
    } else if (selectedAgency !== 'all') {
      const matching = employees.filter(e => e.agency_id === selectedAgency);
      directIds = new Set(matching.map(e => e.id));
      const groupSupport = employees.filter(e => e.is_group_support && !directIds.has(e.id));
      base = [...matching, ...groupSupport];
    } else if (selectedAncienneEntite !== 'all') {
      const entiteAgencyIds = new Set(
        agencies.filter(a => agencyEntiteMap[a.id] === selectedAncienneEntite).map(a => a.id)
      );
      const matching = employees.filter(e => entiteAgencyIds.has(e.agency_id) || e.ancienne_entite === selectedAncienneEntite);
      directIds = new Set(matching.map(e => e.id));
      const groupSupport = employees.filter(e => e.is_group_support && !directIds.has(e.id));
      base = [...matching, ...groupSupport];
    } else if (selectedZone !== 'all') {
      // Inclure les agences de la zone directement + celles dont l'entité appartient à la zone
      const zoneAgencyIds = new Set(agencies.filter(a => a.zone === selectedZone).map(a => a.id));
      agencies.forEach(a => {
        const entite = agencyEntiteMap[a.id];
        if (entite && entiteToZone[entite] === selectedZone) zoneAgencyIds.add(a.id);
      });
      const matching = employees.filter(e => zoneAgencyIds.has(e.agency_id) || e.zone === selectedZone || (e.ancienne_entite && entiteToZone[e.ancienne_entite] === selectedZone));
      directIds = new Set(matching.map(e => e.id));
      const groupSupport = employees.filter(e => e.is_group_support && !directIds.has(e.id));
      base = [...matching, ...groupSupport];
    } else {
      base = employees;
      directIds = null;
    }
    // Filtre par service (combinable avec les filtres ci-dessus)
    if (selectedService !== 'all') {
      const serviceIds = new Set(employees.filter(e => e.service === selectedService).map(e => e.id));
      if (directIds) {
        directIds = new Set([...directIds].filter(id => serviceIds.has(id)));
      } else {
        directIds = new Set(serviceIds);
      }
      const groupSupport = employees.filter(e => e.is_group_support && !directIds.has(e.id));
      base = [...employees.filter(e => directIds.has(e.id)), ...groupSupport];
    }
    const withAncestors = addAncestors(base.map(e => e.id), empById);
    return { baseFiltered: base, pool: employees.filter(e => withAncestors.has(e.id)), directMatchIds: directIds };
  }, [employees, agencies, agencyEntiteMap, entiteToZone, empById, selectedZone, selectedAgency, selectedAncienneEntite, selectedService]);

  const baseChildrenMap = useMemo(() => {
    const poolIds = new Set(pool.map(e => e.id));
    const result = {};
    poolIds.forEach(id => {
      if (fullChildrenMap[id]) result[id] = fullChildrenMap[id].filter(c => poolIds.has(c.id));
    });
    return result;
  }, [pool, fullChildrenMap]);

  // Apply manager filter
  const { filteredPool, filteredBase } = useMemo(() => {
    if (selectedManagerId === 'all') return { filteredPool: pool, filteredBase: baseFiltered };
    const desc = getDescendantIds(selectedManagerId, fullChildrenMap);
    desc.add(selectedManagerId);
    return { filteredPool: pool.filter(e => desc.has(e.id)), filteredBase: baseFiltered.filter(e => desc.has(e.id)) };
  }, [pool, baseFiltered, fullChildrenMap, selectedManagerId]);

  const finalChildrenMap = useMemo(() => {
    const poolIds = new Set(filteredPool.map(e => e.id));
    const result = {};
    poolIds.forEach(id => {
      if (fullChildrenMap[id]) result[id] = fullChildrenMap[id].filter(c => poolIds.has(c.id));
    });
    return result;
  }, [filteredPool, fullChildrenMap]);
  const { roots, rootsWithChildren, orphanLeaves } = useMemo(() => {
    const finalPoolIds = new Set(filteredPool.map(e => e.id));
    const r = filteredPool.filter(e => !e.manager_id || !finalPoolIds.has(e.manager_id));
    const rwc = r.filter(x => (finalChildrenMap[x.id]?.length || 0) > 0)
      .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
    return {
      roots: r,
      rootsWithChildren: rwc,
      orphanLeaves: r.filter(x => !(finalChildrenMap[x.id]?.length || 0) > 0),
    };
  }, [filteredPool, finalChildrenMap]);

  // Search: highlight matching nodes (passed as prop)
  const searchTerm = search.trim().toLowerCase();

  // Precompute search match IDs to avoid O(n²) traversal in OrgTreeNode
  const searchMatchIds = useMemo(() => {
    if (!searchTerm) return null;
    const matches = new Set();
    employees.forEach(e => {
      const haystack = `${e.first_name} ${e.last_name} ${e.position || ''} ${e.service || ''}`.toLowerCase();
      if (haystack.includes(searchTerm)) matches.add(e.id);
    });
    return addAncestors(matches, empById);
  }, [employees, searchTerm, empById]);

  // Count active filters
  const activeFilters = [selectedZone !== 'all', selectedAgency !== 'all', selectedAncienneEntite !== 'all', selectedService !== 'all', selectedManagerId !== 'all'].filter(Boolean).length;

  // Managers list for filter dropdown (people with at least one direct report in pool)
  const managersInPool = useMemo(() => pool.filter(e => baseChildrenMap[e.id]?.length > 0), [pool, baseChildrenMap]);

  // Liste des services disponibles pour le filtre
  const availableServices = useMemo(() => {
    const fromEmployees = [...new Set(employees.map(e => e.service).filter(Boolean))];
    const fromCompany = selectedCompany?.services || [];
    return [...new Set([...fromCompany, ...fromEmployees])].sort((a, b) => a.localeCompare(b, 'fr'));
  }, [employees, selectedCompany]);

  // Ordre global des services selon le mode de tri choisi (appliqué à tout l'organigramme)
  const serviceOrder = useMemo(() => {
    const counts = {};
    filteredBase.forEach(e => {
      const s = e.service || 'Sans service';
      counts[s] = (counts[s] || 0) + 1;
    });
    const all = Object.keys(counts);
    if (serviceSortMode === 'alpha') {
      return all.sort((a, b) => a.localeCompare(b, 'fr'));
    } else if (serviceSortMode === 'custom') {
      const custom = selectedCompany?.services || [];
      return all.sort((a, b) => {
        const ia = custom.indexOf(a);
        const ib = custom.indexOf(b);
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      });
    }
    return all.sort((a, b) => counts[b] - counts[a]);
  }, [filteredBase, serviceSortMode, selectedCompany]);

  const handleDragStart = useCallback((e, employee) => {
    draggedId.current = employee.id;
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDrop = useCallback(async (e, targetEmployee) => {
    // Dépôt d'un fichier image depuis l'ordinateur → mise à jour de la photo
    const droppedFiles = await readDroppedFiles(e.dataTransfer);
    const image = droppedFiles.find(f => f.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|heic|heif|avif|bmp|tiff?|tif)$/i.test(f.name));
    if (image) {
      draggedId.current = null;
      toast({ title: 'Traitement de la photo…', duration: 2000 });
      try {
        const processed = await processPhoto(image);
        const { file_url } = await base44.integrations.Core.UploadFile({ file: processed });
        await base44.entities.Employee.update(targetEmployee.id, { photo_url: file_url });
        setEmployees(prev => prev.map(emp => emp.id === targetEmployee.id ? { ...emp, photo_url: file_url } : emp));
        pushAction({ type: 'photo', employeeId: targetEmployee.id, oldPhotoUrl: targetEmployee.photo_url || null, newPhotoUrl: file_url });
        logAuditAction({ action: 'photo', entityId: targetEmployee.id, entityName: `${targetEmployee.first_name} ${targetEmployee.last_name}`, details: 'Photo mise à jour', companyId: selectedCompanyId });
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
      const oldManagerId = source?.manager_id || null;
      await base44.entities.Employee.update(sourceId, { manager_id: targetEmployee.id });
      setEmployees(prev => prev.map(e => e.id === sourceId ? { ...e, manager_id: targetEmployee.id } : e));
      pushAction({ type: 'hierarchy', employeeId: sourceId, oldManagerId, newManagerId: targetEmployee.id });
      logAuditAction({ action: 'move', entityId: sourceId, entityName: source ? `${source.first_name} ${source.last_name}` : null, details: `Rattachement : ${oldManagerId ? employees.find(e => e.id === oldManagerId)?.first_name + ' ' + employees.find(e => e.id === oldManagerId)?.last_name : 'aucun'} → ${targetEmployee.first_name} ${targetEmployee.last_name}`, companyId: selectedCompanyId });
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
  }, [finalChildrenMap, employees, selectedCompanyId, pushAction, toast]);

  // Double-clic sur une carte : centrer l'organigramme sur ce collaborateur
  const handleFocus = useCallback((employee) => {
    if (selectedManagerId === employee.id) {
      setSelectedManagerId('all');
      toast({ title: 'Vue complète rétablie', duration: 2000 });
    } else {
      setSelectedManagerId(employee.id);
      toast({ title: 'Vue centrée', description: `${employee.first_name} ${employee.last_name} et son équipe`, duration: 2500 });
    }
  }, [selectedManagerId, toast]);

  const handleServiceReorder = useCallback(async (newOrder) => {
    try {
      await base44.entities.Company.update(selectedCompanyId, { services: newOrder });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder l\'ordre des services.', variant: 'destructive' });
    }
  }, [selectedCompanyId, toast]);

  const handleEmployeeReorder = useCallback(async (orderedIds) => {
    try {
      await Promise.all(orderedIds.map((id, index) =>
        base44.entities.Employee.update(id, { sort_order: index })
      ));
      setEmployees(prev => prev.map(e => {
        const idx = orderedIds.indexOf(e.id);
        return idx !== -1 ? { ...e, sort_order: idx } : e;
      }));
    } catch {
      toast({ title: 'Erreur', description: "Impossible de sauvegarder l'ordre des collaborateurs.", variant: 'destructive' });
    }
  }, [toast]);

  const handleRootReorder = useCallback(async (orderedIds) => {
    try {
      await Promise.all(orderedIds.map((id, index) =>
        base44.entities.Employee.update(id, { sort_order: index })
      ));
      setEmployees(prev => prev.map(e => {
        const idx = orderedIds.indexOf(e.id);
        return idx !== -1 ? { ...e, sort_order: idx } : e;
      }));
    } catch {
      toast({ title: 'Erreur', description: "Impossible de sauvegarder l'ordre des blocs.", variant: 'destructive' });
    }
  }, [toast]);

  const handleSave = useCallback((updated) => {
    const old = employees.find(e => e.id === updated.id);
    if (old) {
      const oldFields = {};
      const newFields = {};
      Object.keys(updated).forEach(k => {
        if (old[k] !== updated[k]) { oldFields[k] = old[k]; newFields[k] = updated[k]; }
      });
      if (Object.keys(oldFields).length > 0) {
        pushAction({ type: 'edit', employeeId: updated.id, oldFields, newFields });
        logAuditAction({ action: 'update', entityId: updated.id, entityName: `${updated.first_name} ${updated.last_name}`, details: Object.keys(newFields).join(', '), companyId: selectedCompanyId });
      }
    }
    setEmployees(prev => prev.map(e => e.id === updated.id ? updated : e));
    setSelectedEmployee(null);
  }, [employees, pushAction, selectedCompanyId]);
  const handleDelete = useCallback((id) => {
    const emp = employees.find(e => e.id === id);
    logAuditAction({ action: 'delete', entityId: id, entityName: emp ? `${emp.first_name} ${emp.last_name}` : null, details: 'Suppression collaborateur', companyId: selectedCompanyId });
    setEmployees(prev => prev.filter(e => e.id !== id));
    setSelectedEmployee(null);
  }, [employees, selectedCompanyId]);

  const resetFilters = () => {
    setSelectedZone('all');
    setSelectedAgency('all');
    setSelectedAncienneEntite('all');
    setSelectedService('all');
    setSelectedManagerId('all');
    setSearch('');
  };

  if (!companyLoading && !selectedCompanyId) return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
      <Users className="w-10 h-10 text-muted-foreground/40" />
      <p className="text-muted-foreground font-medium">Aucune société accessible avec ce compte</p>
      <p className="text-sm text-muted-foreground">Demandez l'accès à un administrateur.</p>
      <AccessRequestButton />
    </div>
  );

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

        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5 bg-secondary rounded-lg p-0.5">
          <button onClick={undo} disabled={!canUndo} title="Annuler (Ctrl+Z)"
            className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${canUndo ? 'text-foreground hover:bg-white' : 'text-muted-foreground/40 cursor-not-allowed'}`}>
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={redo} disabled={!canRedo} title="Rétablir (Ctrl+Y)"
            className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${canRedo ? 'text-foreground hover:bg-white' : 'text-muted-foreground/40 cursor-not-allowed'}`}>
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Title */}
        <h1 className="font-heading font-semibold text-foreground text-base hidden sm:block mr-2">Organigramme</h1>

        {/* Search bar */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder="Rechercher un collaborateur..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
          {searchInput && (
            <button className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => { setSearchInput(''); setSearch(''); }}>
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

              {companyAnciennesEntites.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Ancienne entité</label>
                  <Select value={selectedAncienneEntite} onValueChange={v => { setSelectedAncienneEntite(v); setSelectedZone(v !== 'all' ? entiteToZone[v] : 'all'); setSelectedAgency('all'); }}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les entités</SelectItem>
                      {companyAnciennesEntites.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

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
                          if (selectedAncienneEntite !== 'all') return agencyEntiteMap[a.id] === selectedAncienneEntite;
                          return true;
                        })
                        .map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Service</label>
                <Select value={selectedService} onValueChange={setSelectedService}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les services</SelectItem>
                    {availableServices.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

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
        {selectedService !== 'all' && (
          <span className="hidden md:flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded-full">
            {selectedService}
            <X className="w-3 h-3 cursor-pointer hover:text-primary/70" onClick={() => setSelectedService('all')} />
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
            { key: 'libre', icon: <Move className="w-3.5 h-3.5" />, label: 'Disposition libre (blocs déplaçables)' },
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

        {/* Intitulés standard / constructeur */}
        <div className="flex items-center gap-0.5 bg-secondary rounded-lg p-0.5">
          <button onClick={() => setPositionViewMode('standard')} title="Intitulés de poste standards"
            className={`h-7 px-2 rounded-md text-xs font-medium transition-colors ${positionViewMode === 'standard' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            Standard
          </button>
          <button onClick={() => setPositionViewMode('constructeur')} title="Intitulés de poste constructeur"
            className={`h-7 px-2 rounded-md text-xs font-medium transition-colors ${positionViewMode === 'constructeur' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            Constructeur
          </button>
        </div>

        {/* Tri des services (tree only) */}
        {viewMode === 'hierarchical' && (
          <Select value={serviceSortMode} onValueChange={setServiceSortMode}>
            <SelectTrigger className="h-8 w-[185px] text-xs gap-1.5">
              <ListOrdered className="w-3.5 h-3.5 flex-shrink-0" />
              <SelectValue placeholder="Tri des services" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="count">Par nombre de collaborateurs</SelectItem>
              <SelectItem value="alpha">Par ordre alphabétique</SelectItem>
              <SelectItem value="custom">Ordre libre (glisser)</SelectItem>
            </SelectContent>
          </Select>
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
              onClick={() => setServicesOpen(true)}
              title="Gérer les libellés de service"
              className="w-7 h-7 rounded-md flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground hover:bg-white">
              <Tags className="w-3.5 h-3.5" />
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

        {/* Share button */}
        <button
          onClick={() => setShareOpen(true)}
          title="Partager la vue hiérarchique (lecture seule)"
          className="w-8 h-8 rounded-lg flex items-center justify-center bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        >
          <Share2 className="w-4 h-4" />
        </button>

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
      {!printMode && (colorMode === 'service' || viewMode === 'libre') && (
        <ServiceLegend services={[...new Set(filteredBase.map(e => e.service || 'Sans service'))].sort((a, b) => a.localeCompare(b, 'fr'))} />
      )}

      {/* ── Canvas ── */}
      <div
        ref={pan.ref}
        {...(viewMode === 'hierarchical' && !printMode ? pan.handlers : {})}
        className={`flex-1 overflow-auto ${printMode ? 'p-0 bg-gray-100' : 'p-8'} ${viewMode === 'hierarchical' && !printMode ? (pan.panning ? 'cursor-grabbing' : 'cursor-grab') : ''}`}>
        <ViewModeProvider mode={positionViewMode}>
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
            <OrgChartExactPrint
              roots={roots}
              childrenMap={finalChildrenMap}
              pageFormat={printFormat}
              template={template}
              colorMode={colorMode}
              depthColors={depthColors}
              showAnomalies={showAnomalies}
              company={selectedCompany}
            />
          </div>
        ) : (
          <>
            {viewMode === 'libre' ? (
              <OrgFreeBoard
                employees={filteredBase}
                onSelect={setSelectedEmployee}
                searchTerm={searchTerm}
                companyId={selectedCompanyId}
                company={selectedCompany}
              />
            ) : viewMode === 'tableau' ? (
              <OrgWhiteboardView
                employees={filteredBase}
                agencies={agencies}
                onSelect={setSelectedEmployee}
                searchTerm={searchTerm}
                company={selectedCompany}
              />
            ) : (
              <div className="mx-auto" style={{ width: scaledSize?.w, height: scaledSize?.h }}>
              <div ref={contentRef} style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', transition: 'transform 0.2s ease', width: 'max-content' }}>
                <OrgPresentationFrame active={template === 'presentation'} company={selectedCompany}>
                {roots.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
                    <Search className="w-10 h-10 text-muted-foreground/40" />
                    <p className="text-muted-foreground font-medium">Aucun collaborateur trouvé</p>
                    {(activeFilters > 0 || search) && (
                      <button onClick={resetFilters} className="text-sm text-primary hover:underline">Réinitialiser les filtres</button>
                    )}
                  </div>
                ) : rootsWithChildren.length === 1 ? (
                  <div className="flex justify-center gap-12 items-start">
                    <div className="flex justify-center">
                    <OrgTreeNode
                      key={`${rootsWithChildren[0].id}-${expandAll}`}
                      employee={rootsWithChildren[0]}
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
                      serviceSortMode={serviceSortMode}
                      serviceOrder={serviceOrder}
                      onServiceReorder={handleServiceReorder}
                      onEmployeeReorder={handleEmployeeReorder}
                      sideCards={[]}
                      visibleIds={searchMatchIds}
                      filterMatchIds={directMatchIds}
                    />
                    </div>
                    {orphanLeaves.length > 0 && (
                      <div className="flex flex-col gap-3 items-start flex-shrink-0">
                        <div className="rounded-full px-3 py-1 text-center text-[10px] font-bold text-muted-foreground bg-secondary whitespace-nowrap">
                          Non rattachés
                        </div>
                        {orphanLeaves.map(e => (
                          <OrgTreeNode
                            key={`${e.id}-${expandAll}`}
                            employee={e}
                            childrenMap={{}}
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
                            visibleIds={searchMatchIds}
                            filterMatchIds={directMatchIds}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ) : rootsWithChildren.length > 1 ? (
                  serviceSortMode === 'custom' ? (
                    <DragDropContext onDragEnd={(result) => {
                      if (!result.destination || result.type !== 'root') return;
                      if (result.destination.index === result.source.index) return;
                      const newOrder = [...rootsWithChildren];
                      const [moved] = newOrder.splice(result.source.index, 1);
                      newOrder.splice(result.destination.index, 0, moved);
                      handleRootReorder(newOrder.map(r => r.id));
                    }}>
                      <Droppable droppableId="roots" direction="horizontal" type="root">
                        {(provided) => (
                          <div ref={provided.innerRef} {...provided.droppableProps} className="flex gap-12 items-start justify-center flex-wrap">
                            {rootsWithChildren.map((root, i) => (
                              <Draggable key={root.id} draggableId={root.id} index={i}>
                                {(prov, snapshot) => (
                                  <div ref={prov.innerRef} {...prov.draggableProps} style={prov.draggableProps.style} className={snapshot.isDragging ? 'opacity-80' : ''}>
                                    <div {...prov.dragHandleProps} className="flex justify-center mb-1 touch-none cursor-grab active:cursor-grabbing" title="Glisser pour réordonner">
                                      <GripVertical className="w-4 h-4 text-muted-foreground/40 hover:text-primary transition-colors" />
                                    </div>
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
                                      serviceSortMode={serviceSortMode}
                                      serviceOrder={serviceOrder}
                                      onServiceReorder={handleServiceReorder}
                                      onEmployeeReorder={handleEmployeeReorder}
                                      sideCards={[]}
                                      visibleIds={searchMatchIds}
                                      filterMatchIds={directMatchIds}
                                    />
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                            {orphanLeaves.length > 0 && (
                              <div className="flex flex-col gap-3 items-start flex-shrink-0">
                                <div className="rounded-full px-3 py-1 text-center text-[10px] font-bold text-muted-foreground bg-secondary whitespace-nowrap">
                                  Non rattachés
                                </div>
                                {orphanLeaves.map(e => (
                                  <OrgTreeNode
                                    key={`${e.id}-${expandAll}`}
                                    employee={e}
                                    childrenMap={{}}
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
                                    visibleIds={searchMatchIds}
                                    filterMatchIds={directMatchIds}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>
                  ) : (
                    <div className="flex gap-12 items-start justify-center flex-wrap">
                      {rootsWithChildren.map((root, i) => (
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
                          serviceSortMode={serviceSortMode}
                          serviceOrder={serviceOrder}
                          onServiceReorder={handleServiceReorder}
                          onEmployeeReorder={handleEmployeeReorder}
                          sideCards={[]}
                          visibleIds={searchMatchIds}
                          filterMatchIds={directMatchIds}
                        />
                      ))}
                      {orphanLeaves.length > 0 && (
                        <div className="flex flex-col gap-3 items-start flex-shrink-0">
                          <div className="rounded-full px-3 py-1 text-center text-[10px] font-bold text-muted-foreground bg-secondary whitespace-nowrap">
                            Non rattachés
                          </div>
                          {orphanLeaves.map(e => (
                            <OrgTreeNode
                              key={`${e.id}-${expandAll}`}
                              employee={e}
                              childrenMap={{}}
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
                              visibleIds={searchMatchIds}
                              filterMatchIds={directMatchIds}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                ) : (
                  <div className="flex gap-4 items-start justify-center flex-wrap">
                    {orphanLeaves.map(e => (
                      <OrgTreeNode
                        key={`${e.id}-${expandAll}`}
                        employee={e}
                        childrenMap={{}}
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
                        visibleIds={searchMatchIds}
                        filterMatchIds={directMatchIds}
                      />
                    ))}
                  </div>
                )}
                </OrgPresentationFrame>
              </div>
              </div>
            )}
          </>
        )}
        </ViewModeProvider>
      </div>

      {viewMode === 'hierarchical' && !printMode && (
        <OrgMiniMap
          containerRef={pan.ref}
          contentRef={contentRef}
          deps={`${zoom}-${expandAll}-${template}-${filteredPool.length}-${selectedManagerId}`}
        />
      )}

      {shareOpen && (
        <ShareChartPanel
          companyId={selectedCompanyId}
          companyName={selectedCompany?.name || 'cette société'}
          onClose={() => setShareOpen(false)}
        />
      )}

      {servicesOpen && (
        <ServiceManagerPanel
          employees={employees}
          onClose={() => setServicesOpen(false)}
          onChanged={() => base44.entities.Employee.filter({ company_id: selectedCompanyId }).then(setEmployees)}
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
          isHR={isHR}
          onClose={() => setSelectedEmployee(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}