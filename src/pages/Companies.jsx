import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useCompany } from '@/lib/CompanyContext';
import { Building2, Plus, Pencil, Trash2, Users, MapPin, Layers, History, Network, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import AddCompanyModal from '@/components/AddCompanyModal';
import UserAccessManager from '@/components/UserAccessManager';
import AccessRequestList from '@/components/AccessRequestList';

export default function Companies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [stats, setStats] = useState({});
  const { toast } = useToast();
  const navigate = useNavigate();
  const { setSelectedCompany, companies: contextCompanies, loading: companyLoading } = useCompany();

  useEffect(() => {
    setCompanies(contextCompanies);
    setLoading(companyLoading);
    if (contextCompanies.length === 0) return;
    // Compter collaborateurs et agences par société
    Promise.all([
      base44.entities.Employee.list('-created_date', 500),
      base44.entities.Agency.list('-created_date', 500),
    ]).then(([emps, ags]) => {
      const s = {};
      contextCompanies.forEach((c) => {
        const cEmps = emps.filter((e) => e.company_id === c.id);
        const director = cEmps.find((e) => !e.manager_id);
        s[c.id] = {
          employees: cEmps.length,
          agencies: ags.filter((a) => a.company_id === c.id).length,
          director: director ? `${director.first_name} ${director.last_name}` : null,
        };
      });
      setStats(s);
    });
  }, [contextCompanies, companyLoading]);

  const viewOrgChart = (company) => {
    setSelectedCompany(company.id);
    navigate('/organigramme');
  };

  const handleDelete = async (company) => {
    if (!confirm(`Supprimer la société ${company.name} ? Les données rattachées ne seront pas supprimées mais ne seront plus accessibles.`)) return;
    await base44.entities.Company.delete(company.id);
    toast({ title: 'Société supprimée', duration: 2000 });
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-lavender border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Sociétés & Organigrammes</h1>
          <p className="text-muted-foreground text-sm mt-1">Gérez les sociétés, leur structure et accédez à leur organigramme</p>
        </div>
        <Button onClick={() => { setEditingCompany(null); setModalOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" />
          Nouvelle société
        </Button>
      </div>

      {/* Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {companies.map((c) => (
          <div key={c.id} className="bg-white rounded-2xl border border-border p-5 hover:shadow-md transition-all">
            <div className="flex items-start gap-4">
              {c.logo_url ? (
                <img src={c.logo_url} alt="" className="w-14 h-14 rounded-xl object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-lavender flex items-center justify-center" style={{ backgroundColor: c.brand_color ? `${c.brand_color}15` : undefined }}>
                  <Building2 className="w-6 h-6" style={{ color: c.brand_color || 'var(--primary)' }} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="font-heading font-semibold text-foreground text-lg">{c.name}</h2>
                {stats[c.id]?.director && (
                  <p className="text-xs text-muted-foreground mt-0.5">Directeur : {stats[c.id].director}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.brand_color || '#003D7A' }} />
                  <span className="text-xs text-muted-foreground">{c.brand_color || '#003D7A'}</span>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => { setEditingCompany(c); setModalOpen(true); }}
                  className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(c)}
                  className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div className="flex items-center gap-2 p-2.5 bg-secondary rounded-xl">
                <Users className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Collaborateurs</p>
                  <p className="text-sm font-semibold text-foreground">{stats[c.id]?.employees ?? '–'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-secondary rounded-xl">
                <Store className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Agences</p>
                  <p className="text-sm font-semibold text-foreground">{stats[c.id]?.agencies ?? '–'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-secondary rounded-xl">
                <Layers className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Services</p>
                  <p className="text-sm font-semibold text-foreground">{c.services?.length || 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-secondary rounded-xl">
                <MapPin className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Zones</p>
                  <p className="text-sm font-semibold text-foreground">{c.zones?.length || 0}</p>
                </div>
              </div>
            </div>

            {/* Org chart button */}
            <button
              onClick={() => viewOrgChart(c)}
              className="w-full mt-4 flex items-center justify-center gap-2 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium transition-colors"
            >
              <Network className="w-4 h-4" />
              Voir l'organigramme
            </button>

            {/* Lists */}
            <div className="mt-4 space-y-2">
              {c.services?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Services</p>
                  <div className="flex flex-wrap gap-1.5">
                    {c.services.map((s, i) => (
                      <span key={i} className="text-xs bg-lavender text-foreground px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {c.zones?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Zones</p>
                  <div className="flex flex-wrap gap-1.5">
                    {c.zones.map((z, i) => (
                      <span key={i} className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">{z}</span>
                    ))}
                  </div>
                </div>
              )}
              {c.anciennes_entites?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Anciennes entités</p>
                  <div className="flex flex-wrap gap-1.5">
                    {c.anciennes_entites.map((ae, i) => (
                      <span key={i} className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">{ae}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Access requests + user access management */}
      <AccessRequestList />
      <UserAccessManager />

      {modalOpen && (
        <AddCompanyModal
          company={editingCompany}
          onClose={() => setModalOpen(false)}
          onSaved={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}