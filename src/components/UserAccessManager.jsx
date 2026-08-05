import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useCompany } from '@/lib/CompanyContext';
import { Shield, Check, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function UserAccessManager() {
  const { companies } = useCompany();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    base44.entities.User.list().then((u) => {
      setUsers(u);
      setLoading(false);
    });
  }, []);

  const toggleCompany = async (user, companyId) => {
    setUpdating(user.id);
    const current = user.accessible_company_ids || [];
    const next = current.includes(companyId)
      ? current.filter((id) => id !== companyId)
      : [...current, companyId];

    try {
      const updated = await base44.entities.User.update(user.id, { accessible_company_ids: next });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, accessible_company_ids: next } : u)));
      toast({ title: 'Accès mis à jour', duration: 2000 });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de mettre à jour les accès.', variant: 'destructive', duration: 3000 });
    }
    setUpdating(null);
  };

  const setAllCompanies = async (user) => {
    setUpdating(user.id);
    try {
      await base44.entities.User.update(user.id, { accessible_company_ids: [] });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, accessible_company_ids: [] } : u)));
      toast({ title: 'Accès total (super admin)', duration: 2000 });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive', duration: 3000 });
    }
    setUpdating(null);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-8">
      <div className="w-6 h-6 border-4 border-lavender border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-border p-6">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-primary" />
        <h2 className="font-heading font-semibold text-foreground">Gestion des accès</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Assignez les sociétés accessibles à chaque utilisateur. Laissez vide pour un accès total (super admin).
      </p>

      <div className="space-y-3">
        {users.map((user) => {
          const access = user.accessible_company_ids || [];
          const isSuperAdmin = access.length === 0;

          return (
            <div key={user.id} className="flex items-center gap-4 p-3 bg-secondary rounded-xl">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user.full_name || user.email}
                </p>
                <p className="text-xs text-muted-foreground">
                  {user.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
                  {isSuperAdmin && ' · Super admin (toutes les sociétés)'}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {companies.map((c) => {
                  const has = isSuperAdmin || access.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      disabled={updating === user.id}
                      onClick={() => toggleCompany(user, c.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        has
                          ? 'bg-primary text-white'
                          : 'bg-white border border-border text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      {has ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      {c.name}
                    </button>
                  );
                })}
              </div>

              {!isSuperAdmin && (
                <button
                  onClick={() => setAllCompanies(user)}
                  disabled={updating === user.id}
                  className="text-xs text-primary hover:underline flex-shrink-0"
                >
                  Tout
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}