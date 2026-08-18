import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useCompany } from '@/lib/CompanyContext';
import { Shield, Crown, Stethoscope, User as UserIcon, UserPlus, Check, X, Clock } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CreateAccountModal from '@/components/CreateAccountModal';
import AccessRequestList from '@/components/AccessRequestList';
import { logAuditAction } from '@/lib/auditLog';

const ROLE_CONFIG = {
  admin: { label: 'Administrateur', icon: Crown, color: 'bg-amber-100 text-amber-800', desc: 'Accès complet à toutes les sociétés et fonctionnalités' },
  rh: { label: 'Ressources Humaines', icon: Stethoscope, color: 'bg-purple-100 text-purple-800', desc: 'Modifie les fiches collaborateurs et gère les organigrammes' },
  user: { label: 'Utilisateur', icon: UserIcon, color: 'bg-blue-100 text-blue-800', desc: 'Consultation seule (lecture)' },
};

export default function Users() {
  const { companies } = useCompany();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const { toast } = useToast();

  const loadUsers = () => {
    base44.entities.User.list()
      .then((u) => {
        setUsers(u);
        setLoading(false);
      })
      .catch((err) => {
        setLoading(false);
        const msg = err?.status === 403
          ? 'Vous n\'avez pas les permissions pour voir les utilisateurs.'
          : 'Impossible de charger les utilisateurs.';
        toast({ title: 'Erreur', description: msg, variant: 'destructive', duration: 4000 });
      });
  };

  useEffect(() => { loadUsers(); }, []);

  const changeRole = async (user, newRole) => {
    if (user.role === newRole) return;
    setUpdating(user.id);
    try {
      await base44.entities.User.update(user.id, { role: newRole });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
      await logAuditAction({
        action: 'role_change',
        entityType: 'user',
        entityId: user.id,
        entityName: user.full_name || user.email,
        details: `Rôle changé : ${ROLE_CONFIG[user.role]?.label || user.role} → ${ROLE_CONFIG[newRole]?.label || newRole}`,
      });
      toast({ title: 'Rôle mis à jour', description: `${user.full_name || user.email} est maintenant ${ROLE_CONFIG[newRole].label}.`, duration: 3000 });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de changer le rôle.', variant: 'destructive', duration: 3000 });
    }
    setUpdating(null);
  };

  const toggleCompany = async (user, companyId) => {
    setUpdating(user.id);
    const current = user.accessible_company_ids || [];
    const next = current.includes(companyId)
      ? current.filter((id) => id !== companyId)
      : [...current, companyId];
    try {
      await base44.entities.User.update(user.id, { accessible_company_ids: next });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, accessible_company_ids: next } : u));
      const companyName = companies.find(c => c.id === companyId)?.name || companyId;
      await logAuditAction({
        action: 'access_change',
        entityType: 'user',
        entityId: user.id,
        entityName: user.full_name || user.email,
        details: `Accès ${next.includes(companyId) ? 'accordé' : 'retiré'} : ${companyName}`,
      });
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
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, accessible_company_ids: [] } : u));
      await logAuditAction({
        action: 'access_change',
        entityType: 'user',
        entityId: user.id,
        entityName: user.full_name || user.email,
        details: 'Accès total (toutes les sociétés)',
      });
      toast({ title: 'Accès total accordé', duration: 2000 });
    } catch {
      toast({ title: 'Erreur', variant: 'destructive', duration: 3000 });
    }
    setUpdating(null);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-lavender border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-heading font-semibold text-xl text-foreground">Utilisateurs & Rôles</h1>
            <p className="text-sm text-muted-foreground">Gérez les rôles et les accès aux sociétés</p>
          </div>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <UserPlus className="w-4 h-4" />
          Créer un compte
        </Button>
      </div>

      {/* Role legend */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {Object.entries(ROLE_CONFIG).map(([key, cfg]) => {
          const Icon = cfg.icon;
          const count = users.filter(u => u.role === key).length;
          return (
            <div key={key} className="bg-white rounded-2xl border border-border p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cfg.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{cfg.label} <span className="text-muted-foreground font-normal">({count})</span></p>
                <p className="text-xs text-muted-foreground">{cfg.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Users table */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-secondary text-left">
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Utilisateur</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rôle</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sociétés accessibles</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Créé le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => {
                const access = user.accessible_company_ids || [];
                const isSuperAdmin = access.length === 0;
                const cfg = ROLE_CONFIG[user.role] || ROLE_CONFIG.user;
                const RoleIcon = cfg.icon;

                return (
                  <tr key={user.id} className="hover:bg-secondary/50 transition-colors">
                    {/* User */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-lavender flex items-center justify-center text-sm font-semibold text-primary flex-shrink-0">
                          {(user.full_name || user.email || '?')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{user.full_name || user.email}</p>
                          {user.full_name && <p className="text-xs text-muted-foreground truncate">{user.email}</p>}
                        </div>
                      </div>
                    </td>

                    {/* Role selector */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${cfg.color}`}>
                          <RoleIcon className="w-3.5 h-3.5" />
                        </div>
                        <Select
                          value={user.role}
                          onValueChange={(v) => changeRole(user, v)}
                          disabled={updating === user.id}
                        >
                          <SelectTrigger className="w-40 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(ROLE_CONFIG).map(([key, c]) => (
                              <SelectItem key={key} value={key} className="text-xs">
                                {c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </td>

                    {/* Company access */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5 max-w-md">
                        {isSuperAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary text-white">
                            <Check className="w-3 h-3" />
                            Toutes les sociétés (super admin)
                          </span>
                        ) : companies.length === 0 ? (
                          <span className="text-xs text-muted-foreground">Chargement…</span>
                        ) : (
                          <>
                            {companies.map((c) => {
                              const has = access.includes(c.id);
                              return (
                                <button
                                  key={c.id}
                                  disabled={updating === user.id}
                                  onClick={() => toggleCompany(user, c.id)}
                                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
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
                            {access.length > 0 && (
                              <button
                                onClick={() => setAllCompanies(user)}
                                disabled={updating === user.id}
                                className="text-xs text-primary hover:underline px-1"
                              >
                                Tout
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>

                    {/* Created date */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        {user.created_date ? new Date(user.created_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending access requests */}
      <AccessRequestList />

      {showCreate && (
        <CreateAccountModal
          onClose={() => setShowCreate(false)}
          onCreated={loadUsers}
        />
      )}
    </div>
  );
}