import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, Plus, Filter, Download, UserPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import EmployeeCard from '@/components/EmployeeCard';
import EmployeeDrawer from '@/components/EmployeeDrawer';
import AddEmployeeModal from '@/components/AddEmployeeModal';

const SERVICES = ["Tous","Direction","Service Commercial","Magasin","Atelier","Administratif","Ressources Humaines","Comptabilité","Gestion","Informatique","Communication Marketing","Support Technique","Garanties","Agriculture de Précision","RSE","Accueil Tél.","Service Occasions","Commercial Quads","Commercial TP","PY Pneus"];
const STATUSES = ["Tous","Actif","En recrutement","Apprenti","Alternant","Départ"];

export default function Directory() {
  const [employees, setEmployees] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAgency, setFilterAgency] = useState('all');
  const [filterService, setFilterService] = useState('Tous');
  const [filterStatus, setFilterStatus] = useState('Tous');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

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

  const filtered = employees.filter(e => {
    const name = `${e.first_name} ${e.last_name} ${e.position} ${e.email || ''}`.toLowerCase();
    if (search && !name.includes(search.toLowerCase())) return false;
    if (filterAgency !== 'all' && e.agency_id !== filterAgency) return false;
    if (filterService !== 'Tous' && e.service !== filterService) return false;
    if (filterStatus !== 'Tous' && (e.status || 'Actif') !== filterStatus) return false;
    return true;
  });

  const handleSave = (updated) => {
    setEmployees(prev => prev.map(e => e.id === updated.id ? updated : e));
    setSelectedEmployee(null);
  };

  const handleDelete = async (id) => {
    await base44.entities.Employee.delete(id);
    setEmployees(prev => prev.filter(e => e.id !== id));
    setSelectedEmployee(null);
  };

  const handleAdd = (newEmp) => {
    setEmployees(prev => [newEmp, ...prev]);
    setShowAdd(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-lavender border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-heading font-semibold text-foreground text-lg">Annuaire</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} collaborateur{filtered.length > 1 ? 's' : ''}</p>
          </div>
          {isHR && (
            <Button className="gap-2" onClick={() => setShowAdd(true)}>
              <UserPlus className="w-4 h-4" />
              Ajouter
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Rechercher un collaborateur..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={filterAgency} onValueChange={setFilterAgency}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Agence" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les agences</SelectItem>
              {agencies.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterService} onValueChange={setFilterService}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SERVICES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="font-heading font-semibold text-foreground">Aucun résultat</p>
            <p className="text-sm text-muted-foreground">Modifiez vos filtres de recherche</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(e => (
              <EmployeeCard
                key={e.id}
                employee={e}
                onClick={() => setSelectedEmployee(e)}
                isHR={isHR}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Drawer */}
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

      {/* Add Modal */}
      {showAdd && (
        <AddEmployeeModal
          agencies={agencies}
          allEmployees={employees}
          onClose={() => setShowAdd(false)}
          onAdd={handleAdd}
        />
      )}
    </div>
  );
}