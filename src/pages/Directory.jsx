import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, UserPlus, Trash2, CheckSquare, Download, ImagePlus, FileSpreadsheet, FileUp, Users } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import EmployeeCard from '@/components/EmployeeCard';
import EmployeeDrawer from '@/components/EmployeeDrawer';
import AddEmployeeModal from '@/components/AddEmployeeModal';
import BulkPhotoImport from '@/components/BulkPhotoImport';
import BulkImportModal from '@/components/BulkImportModal';
import { getAssignmentLabel } from '@/components/AssignmentSelector';
import AccessRequestButton from '@/components/AccessRequestButton';
import { useCompany } from '@/lib/CompanyContext';

export default function Directory() {
  const { selectedCompanyId, services: companyServices, statuses: companyStatuses, loading: companyLoading } = useCompany();
  const SERVICES = ['Tous', ...companyServices];
  const STATUSES = ['Tous', ...companyStatuses];

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
  const [showPhotoImport, setShowPhotoImport] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectMode, setSelectMode] = useState(false);

  useEffect(() => {
    if (!selectedCompanyId) return;
    setLoading(true);
    Promise.all([
      base44.entities.Employee.filter({ company_id: selectedCompanyId }),
      base44.entities.Agency.filter({ company_id: selectedCompanyId }),
      base44.auth.me()
    ]).then(([emps, ags, u]) => {
      setEmployees(emps);
      setAgencies(ags);
      setUser(u);
      setLoading(false);
    });
  }, [selectedCompanyId]);

  // Recharger les employés en temps réel quand le chat en ajoute
  useEffect(() => {
    const unsubscribe = base44.entities.Employee.subscribe(() => {
      if (!selectedCompanyId) return;
      base44.entities.Employee.filter({ company_id: selectedCompanyId }).then(emps => setEmployees(emps));
    });
    return unsubscribe;
  }, [selectedCompanyId]);

  if (companyLoading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-lavender border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!selectedCompanyId) return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
      <Users className="w-10 h-10 text-muted-foreground/40" />
      <p className="text-muted-foreground font-medium">Aucune société accessible avec ce compte</p>
      <p className="text-sm text-muted-foreground">Demandez l'accès à un administrateur.</p>
      <AccessRequestButton />
    </div>
  );

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

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleExportCSV = () => {
    const empById = {};
    employees.forEach(e => { empById[e.id] = e; });
    const headers = [
      'Prénom', 'Nom', 'Poste', 'Service', 'Affectation',
      'Email', 'Téléphone', 'Statut',
      "Date d'entrée", 'Date de départ',
      'Ancienne entité', 'Zone géographique', 'Support Groupe',
      'Responsable direct', 'Notes RH'
    ];
    const rows = filtered.map(e => {
      const manager = e.manager_id ? empById[e.manager_id] : null;
      return [
        e.first_name || '',
        e.last_name || '',
        e.position || '',
        e.service || '',
        getAssignmentLabel(e, agencies),
        e.email || '',
        e.phone || '',
        e.status || 'Actif',
        e.hire_date || '',
        e.departure_date || '',
        e.ancienne_entite || '',
        e.zone || '',
        e.is_group_support ? 'Oui' : 'Non',
        manager ? `${manager.first_name || ''} ${manager.last_name || ''}`.trim() : '',
        e.notes || '',
      ];
    });
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'annuaire.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const buildExportRows = () => {
    const empById = {};
    employees.forEach(e => { empById[e.id] = e; });
    return filtered.map(e => {
      const manager = e.manager_id ? empById[e.manager_id] : null;
      return {
        'Prénom': e.first_name || '',
        'Nom': e.last_name || '',
        'Poste': e.position || '',
        'Service': e.service || '',
        'Affectation': getAssignmentLabel(e, agencies),
        'Email': e.email || '',
        'Téléphone': e.phone || '',
        'Statut': e.status || 'Actif',
        "Date d'entrée": e.hire_date || '',
        'Date de départ': e.departure_date || '',
        'Ancienne entité': e.ancienne_entite || '',
        'Zone géographique': e.zone || '',
        'Support Groupe': e.is_group_support ? 'Oui' : 'Non',
        'Responsable direct': manager ? `${manager.first_name || ''} ${manager.last_name || ''}`.trim() : '',
        'Notes RH': e.notes || '',
      };
    });
  };

  const handleExportExcel = () => {
    const rows = buildExportRows();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 24 }, { wch: 22 }, { wch: 18 }, { wch: 28 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 22 }, { wch: 40 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Annuaire');
    XLSX.writeFile(wb, 'annuaire.xlsx');
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Supprimer ${selectedIds.size} collaborateur(s) ?`)) return;
    await Promise.all([...selectedIds].map(id => base44.entities.Employee.delete(id)));
    setEmployees(prev => prev.filter(e => !selectedIds.has(e.id)));
    setSelectedIds(new Set());
    setSelectMode(false);
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
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={handleExportExcel}>
              <FileSpreadsheet className="w-4 h-4" />
              Excel
            </Button>
            <Button variant="outline" className="gap-2" onClick={handleExportCSV}>
              <Download className="w-4 h-4" />
              CSV
            </Button>
          </div>
          {isHR && (
            <div className="flex items-center gap-2">
              {selectMode && selectedIds.size > 0 && (
                <Button variant="destructive" className="gap-2" onClick={handleBulkDelete}>
                  <Trash2 className="w-4 h-4" />
                  Supprimer ({selectedIds.size})
                </Button>
              )}
              <Button variant={selectMode ? 'secondary' : 'outline'} className="gap-2" onClick={() => { setSelectMode(v => !v); setSelectedIds(new Set()); }}>
                <CheckSquare className="w-4 h-4" />
                {selectMode ? 'Annuler' : 'Sélectionner'}
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => setShowPhotoImport(true)}>
                <ImagePlus className="w-4 h-4" />
                <span className="hidden sm:inline">Importer photos</span>
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => setShowBulkImport(true)}>
                <FileUp className="w-4 h-4" />
                <span className="hidden sm:inline">Importer</span>
              </Button>
              <Button className="gap-2" onClick={() => setShowAdd(true)}>
                <UserPlus className="w-4 h-4" />
                Ajouter
              </Button>
            </div>
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
              <div key={e.id} className="relative">
                {selectMode && (
                  <div
                    className={`absolute top-2 left-2 z-10 w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer transition-colors ${selectedIds.has(e.id) ? 'bg-primary border-primary' : 'bg-white border-border'}`}
                    onClick={() => toggleSelect(e.id)}
                  >
                    {selectedIds.has(e.id) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                  </div>
                )}
                <div className={selectMode ? 'cursor-pointer' : ''} onClick={selectMode ? () => toggleSelect(e.id) : undefined}>
                  <EmployeeCard
                    employee={e}
                    agencies={agencies}
                    onClick={selectMode ? undefined : () => setSelectedEmployee(e)}
                    isHR={isHR && !selectMode}
                    onDelete={handleDelete}
                  />
                </div>
              </div>
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

      {/* Bulk Photo Import */}
      {showPhotoImport && (
        <BulkPhotoImport
          employees={employees}
          onClose={() => setShowPhotoImport(false)}
          onDone={() => base44.entities.Employee.list().then(emps => setEmployees(emps))}
        />
      )}

      {/* Bulk Import (Excel/CSV) */}
      {showBulkImport && (
        <BulkImportModal
          employees={employees}
          agencies={agencies}
          onClose={() => setShowBulkImport(false)}
          onDone={() => base44.entities.Employee.list().then(emps => setEmployees(emps))}
        />
      )}
    </div>
  );
}