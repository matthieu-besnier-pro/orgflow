import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { ZoomIn, ZoomOut, RefreshCw, Expand, Shrink, Search, X } from 'lucide-react';
import EmployeeDrawer from '@/components/EmployeeDrawer';
import OrgTreeNode from '@/components/OrgTreeNode';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';

export default function OrgChart() {
  const [employees, setEmployees] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [selectedZone, setSelectedZone] = useState('all');
  const [selectedAgency, setSelectedAgency] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [zoom, setZoom] = useState(0.85);
  const [loading, setLoading] = useState(true);
  const [expandAll, setExpandAll] = useState(false);
  const [template, setTemplate] = useState('classique');
  const [selectedManagerId, setSelectedManagerId] = useState('all');
  const [managerSearch, setManagerSearch] = useState('');
  const [managerDropdownOpen, setManagerDropdownOpen] = useState(false);
  const draggedId = useRef(null);
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

  // Compute filtered pool based on zone/agency selection
  const getPool = () => {
    if (selectedZone === 'Support Groupe') return employees.filter(e => e.is_group_support);
    if (selectedAgency !== 'all') return employees.filter(e => e.agency_id === selectedAgency);
    if (selectedZone !== 'all') {
      const zoneAgencyIds = new Set(agencies.filter(a => a.zone === selectedZone).map(a => a.id));
      return employees.filter(e => zoneAgencyIds.has(e.agency_id));
    }
    return employees;
  };

  const pool = getPool();
  const poolIds = new Set(pool.map(e => e.id));

  // Build children map only from pool
  const childrenMap = {};
  pool.forEach(e => {
    if (e.manager_id && poolIds.has(e.manager_id)) {
      if (!childrenMap[e.manager_id]) childrenMap[e.manager_id] = [];
      childrenMap[e.manager_id].push(e);
    }
  });

  // Sort children by position importance
  const positionOrder = ['Directeur', 'Président', 'Responsable', 'Resp.', 'Manager', 'Chef', 'Commercial', 'Technicien', 'Magasinier'];
  Object.keys(childrenMap).forEach(k => {
    childrenMap[k].sort((a, b) => {
      const ia = positionOrder.findIndex(p => a.position?.includes(p));
      const ib = positionOrder.findIndex(p => b.position?.includes(p));
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
  });

  // Get all descendant IDs of a given employee (recursively)
  const getDescendantIds = (managerId, allChildrenMap) => {
    const result = new Set();
    const traverse = (id) => {
      (allChildrenMap[id] || []).forEach(child => {
        result.add(child.id);
        traverse(child.id);
      });
    };
    traverse(managerId);
    return result;
  };

  // Apply manager filter on top of pool
  let finalPool = pool;
  if (selectedManagerId !== 'all') {
    const manager = employees.find(e => e.id === selectedManagerId);
    if (manager) {
      // Build full childrenMap from all employees for traversal
      const fullChildrenMap = {};
      employees.forEach(e => {
        if (e.manager_id) {
          if (!fullChildrenMap[e.manager_id]) fullChildrenMap[e.manager_id] = [];
          fullChildrenMap[e.manager_id].push(e);
        }
      });
      const descendantIds = getDescendantIds(selectedManagerId, fullChildrenMap);
      descendantIds.add(selectedManagerId);
      finalPool = pool.filter(e => descendantIds.has(e.id));
    }
  }

  const finalPoolIds = new Set(finalPool.map(e => e.id));

  // Rebuild childrenMap for finalPool
  const finalChildrenMap = {};
  finalPool.forEach(e => {
    if (e.manager_id && finalPoolIds.has(e.manager_id)) {
      if (!finalChildrenMap[e.manager_id]) finalChildrenMap[e.manager_id] = [];
      finalChildrenMap[e.manager_id].push(e);
    }
  });
  Object.keys(finalChildrenMap).forEach(k => {
    finalChildrenMap[k].sort((a, b) => {
      const ia = positionOrder.findIndex(p => a.position?.includes(p));
      const ib = positionOrder.findIndex(p => b.position?.includes(p));
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
  });

  // Roots = employees in finalPool whose manager is not in finalPool (or has no manager)
  const roots = finalPool.filter(e => !e.manager_id || !finalPoolIds.has(e.manager_id));

  const handleDragStart = (e, employee) => {
    draggedId.current = employee.id;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (e, targetEmployee) => {
    const sourceId = draggedId.current;
    draggedId.current = null;
    if (!sourceId || sourceId === targetEmployee.id) return;

    // Prevent dropping onto own descendant
    const isDescendant = (parentId, checkId) => {
      const children = (finalChildrenMap[parentId] || []).map(c => c.id);
      if (children.includes(checkId)) return true;
      return children.some(cid => isDescendant(cid, checkId));
    };
    if (isDescendant(sourceId, targetEmployee.id)) {
      toast({ title: 'Impossible', description: 'Vous ne pouvez pas déplacer un collaborateur vers l\'un de ses subordonnés.', variant: 'destructive' });
      return;
    }

    try {
      const updated = await base44.entities.Employee.update(sourceId, { manager_id: targetEmployee.id });
      setEmployees(prev => prev.map(e => e.id === sourceId ? { ...e, manager_id: targetEmployee.id } : e));
      const source = employees.find(e => e.id === sourceId);
      // pas de toast pour éviter l'accumulation
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

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-lavender border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-canvas">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-4 bg-white border-b border-border flex-wrap">
        <h1 className="font-heading font-semibold text-foreground text-lg flex-1 min-w-0">Organigramme</h1>

        <Select value={selectedZone} onValueChange={v => { setSelectedZone(v); setSelectedAgency('all'); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Zone" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les zones</SelectItem>
            <SelectItem value="Zone Centre">Zone Centre</SelectItem>
            <SelectItem value="Zone Ouest">Zone Ouest</SelectItem>
            <SelectItem value="Support Groupe">Support Groupe</SelectItem>
          </SelectContent>
        </Select>

        {selectedZone !== 'Support Groupe' && (
          <Select value={selectedAgency} onValueChange={setSelectedAgency}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Agence" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les agences</SelectItem>
              {agencies
                .filter(a => selectedZone === 'all' || a.zone === selectedZone)
                .map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {/* Manager filter */}
        <div className="relative">
          <div
            className="flex h-9 w-52 items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm cursor-pointer hover:bg-secondary/50 transition-colors"
            onClick={() => { setManagerDropdownOpen(v => !v); setManagerSearch(''); }}
          >
            <span className={selectedManagerId !== 'all' ? 'text-foreground' : 'text-muted-foreground'}>
              {selectedManagerId !== 'all'
                ? (() => { const m = employees.find(e => e.id === selectedManagerId); return m ? `${m.first_name} ${m.last_name}` : 'Manager'; })()
                : 'Filtrer par manager'}
            </span>
            <div className="flex items-center gap-1">
              {selectedManagerId !== 'all' && (
                <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" onClick={e => { e.stopPropagation(); setSelectedManagerId('all'); }} />
              )}
              <Search className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          </div>
          {managerDropdownOpen && (
            <div className="absolute z-50 mt-1 w-52 bg-white border border-border rounded-lg shadow-lg overflow-hidden">
              <div className="p-2 border-b border-border">
                <Input
                  autoFocus
                  placeholder="Rechercher..."
                  value={managerSearch}
                  onChange={e => setManagerSearch(e.target.value)}
                  className="h-8 text-sm"
                  onClick={e => e.stopPropagation()}
                />
              </div>
              <div className="max-h-48 overflow-y-auto">
                <div
                  className="px-3 py-2 text-sm text-muted-foreground hover:bg-secondary cursor-pointer"
                  onClick={() => { setSelectedManagerId('all'); setManagerDropdownOpen(false); }}
                >
                  Tous les managers
                </div>
                {pool
                  .filter(e => Object.keys(finalChildrenMap).includes(e.id) || childrenMap[e.id]?.length > 0)
                  .filter(e => `${e.first_name} ${e.last_name}`.toLowerCase().includes(managerSearch.toLowerCase()))
                  .sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`, 'fr'))
                  .map(m => (
                    <div
                      key={m.id}
                      className={`px-3 py-2 text-sm cursor-pointer hover:bg-secondary ${selectedManagerId === m.id ? 'bg-lavender font-medium' : ''}`}
                      onClick={() => { setSelectedManagerId(m.id); setManagerDropdownOpen(false); setManagerSearch(''); }}
                    >
                      {m.last_name} {m.first_name}
                      <span className="text-xs text-muted-foreground ml-1">— {m.position}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Template selector */}
        <div className="flex items-center gap-1 bg-secondary rounded-xl p-1">
          {[{ key: 'classique', label: 'Classique' }, { key: 'moderne', label: 'Moderne' }, { key: 'compact', label: 'Compact' }].map(t => (
            <button
              key={t.key}
              onClick={() => setTemplate(t.key)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${template === t.key ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setExpandAll(v => !v)}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl bg-secondary hover:bg-accent transition-colors"
        >
          {expandAll ? <Shrink className="w-3.5 h-3.5" /> : <Expand className="w-3.5 h-3.5" />}
          {expandAll ? 'Réduire' : 'Tout déplier'}
        </button>

        <div className="flex items-center gap-1 bg-secondary rounded-xl p-1">
          <button onClick={() => setZoom(z => Math.max(0.3, +(z - 0.1).toFixed(1)))} className="w-8 h-8 rounded-lg hover:bg-white flex items-center justify-center transition-colors">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-medium px-2 text-muted-foreground">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(1.5, +(z + 0.1).toFixed(1)))} className="w-8 h-8 rounded-lg hover:bg-white flex items-center justify-center transition-colors">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={() => setZoom(0.85)} className="w-8 h-8 rounded-lg hover:bg-white flex items-center justify-center transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-auto p-8">
        <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.2s ease', minWidth: 'max-content' }}>
          {roots.length === 0 ? (
            <div className="text-center text-muted-foreground py-20">Aucun collaborateur trouvé</div>
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