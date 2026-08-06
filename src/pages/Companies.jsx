import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Building2, Plus, Pencil, Trash2, Users, MapPin, Layers } from 'lucide-react';
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
  const { toast } = useToast();

  const load = () => {
    base44.entities.Company.list().then((comps) => {
      setCompanies(comps);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (company) => {
    if (!confirm(`Supprimer la société ${company.name} ? Les données rattachées ne seront pas supprimées mais ne seront plus accessibles.`)) return;
    await base44.entities.Company.delete(company.id);
    load();
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
          <h1 className="font-heading text-2xl font-bold text-foreground">Sociétés</h1>
          <p className="text-muted-foreground text-sm mt-1">Gérez les sociétés et leur structure (services, statuts, zones)</p>
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
                <div className="flex items-center gap-2 mt-0.5">
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
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="flex items-center gap-2 p-2.5 bg-secondary rounded-xl">
                <Layers className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Services</p>
                  <p className="text-sm font-semibold text-foreground">{c.services?.length || 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-secondary rounded-xl">
                <Users className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Statuts</p>
                  <p className="text-sm font-semibold text-foreground">{c.statuses?.length || 0}</p>
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
          onSaved={load}
        />
      )}
    </div>
  );
}