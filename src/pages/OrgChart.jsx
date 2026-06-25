import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { ZoomIn, ZoomOut, RefreshCw, Expand, Shrink } from 'lucide-react';
import EmployeeDrawer from '@/components/EmployeeDrawer';
import OrgTreeNode from '@/components/OrgTreeNode';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

  // Build children map
  const childrenMap = {};
  employees.forEach(e => {
    if (e.manager_id) {
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

  // Find roots based on filters
  const getRoots = () => {
    const hasManager = new Set(employees.filter(e => e.manager_id).map(e => e.id));
    let pool = employees;

    if (selectedZone !== 'all') {
      if (selectedZone === 'Support Groupe') {
        pool = employees.filter(e => e.is_group_support);
      } else {
        const zoneAgencyIds = new Set(agencies.filter(a => a.zone === selectedZone).map(a => a.id));
        if (selectedAgency !== 'all') {
          pool = employees.filter(e => e.agency_id === selectedAgency);
        } else {
          pool = employees.filter(e => zoneAgencyIds.has(e.agency_id));
        }
      }
    }

    const poolIds = new Set(pool.map(e => e.id));

    // Roots = employees in pool whose manager is not in pool (or has no manager)
    return pool.filter(e => !e.manager_id || !poolIds.has(e.manager_id));
  };

  const roots = getRoots();

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
      const children = (childrenMap[parentId] || []).map(c => c.id);
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
      toast({ title: 'Hiérarchie mise à jour', description: `${source?.first_name} ${source?.last_name} rattaché(e) à ${targetEmployee.first_name} ${targetEmployee.last_name}` });
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
                childrenMap={childrenMap}
                onSelect={setSelectedEmployee}
                defaultExpanded={expandAll}
                depth={0}
                onDragStart={handleDragStart}
                onDrop={handleDrop}
              />
            </div>
          ) : (
            <div className="flex gap-12 items-start justify-center flex-wrap">
              {roots.map(root => (
                <OrgTreeNode
                  key={`${root.id}-${expandAll}`}
                  employee={root}
                  childrenMap={childrenMap}
                  onSelect={setSelectedEmployee}
                  defaultExpanded={expandAll}
                  depth={0}
                  onDragStart={handleDragStart}
                  onDrop={handleDrop}
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