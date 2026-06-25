import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { ZoomIn, ZoomOut, RefreshCw, Filter } from 'lucide-react';
import OrgNode from '@/components/OrgNode';
import EmployeeDrawer from '@/components/EmployeeDrawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function OrgChart() {
  const [employees, setEmployees] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [selectedAgency, setSelectedAgency] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [user, setUser] = useState(null);
  const [zoom, setZoom] = useState(0.85);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef();

  useEffect(() => {
    Promise.all([
      base44.entities.Employee.list(),
      base44.entities.Agency.list(),
      base44.auth.me()
    ]).then(([emps, ags, u]) => {
      setEmployees(emps);
      setAgencies(ags);
      setUser(u);
      setLoading(false);
    });
  }, []);

  const isHR = user?.role === 'admin';

  const filteredEmployees = selectedAgency === 'all'
    ? employees
    : selectedAgency === 'support'
    ? employees.filter(e => e.is_group_support)
    : employees.filter(e => e.agency_id === selectedAgency);

  // Find roots (no manager or manager not in filtered set)
  const filteredIds = new Set(filteredEmployees.map(e => e.id));
  const roots = filteredEmployees.filter(e => !e.manager_id || !filteredIds.has(e.manager_id));

  const getSubs = (parentId) => filteredEmployees.filter(e => e.manager_id === parentId);

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
      <div className="flex items-center gap-3 px-6 py-4 bg-white border-b border-border">
        <h1 className="font-heading font-semibold text-foreground text-lg flex-1">Organigramme</h1>

        {/* Agency filter */}
        <Select value={selectedAgency} onValueChange={setSelectedAgency}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Toutes les agences" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les agences</SelectItem>
            <SelectItem value="support">Support Groupe</SelectItem>
            {agencies.map(a => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Zoom controls */}
        <div className="flex items-center gap-1 bg-secondary rounded-xl p-1">
          <button
            onClick={() => setZoom(z => Math.max(0.3, z - 0.1))}
            className="w-8 h-8 rounded-lg hover:bg-white flex items-center justify-center transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-medium px-2 text-muted-foreground">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(z => Math.min(1.5, z + 0.1))}
            className="w-8 h-8 rounded-lg hover:bg-white flex items-center justify-center transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(0.85)}
            className="w-8 h-8 rounded-lg hover:bg-white flex items-center justify-center transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-auto p-8" ref={canvasRef}>
        {roots.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-lavender flex items-center justify-center mb-4">
              <Filter className="w-8 h-8 text-primary" />
            </div>
            <p className="font-heading font-semibold text-foreground">Aucun collaborateur trouvé</p>
            <p className="text-sm text-muted-foreground mt-1">Ajoutez des collaborateurs depuis l'annuaire</p>
          </div>
        ) : (
          <div
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.3s ease' }}
          >
            <div className="flex flex-col items-center gap-12">
              {roots.map(root => (
                <OrgNode
                  key={root.id}
                  employee={root}
                  subordinates={getSubs(root.id)}
                  allEmployees={filteredEmployees}
                  depth={0}
                  onSelect={setSelectedEmployee}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Employee Drawer */}
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