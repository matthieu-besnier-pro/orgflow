import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useCompany } from '@/lib/CompanyContext';
import { Shield, Check, X, Link2, Crown } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';

export default function UserAccessManager() {
  const { companies } = useCompany();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const loadUsers = () => {
    base44.entities.User.list().then((u) => {
      setUsers(u);
      setLoading(false);
    });
  };

  useEffect(() => { loadUsers(); }, []);

  const registerUrl = `${window.location.origin}/register`;

  const copyRegisterLink = async () => {
    try {
      await navigator.clipboard.writeText(registerUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Lien copié', description: 'Partagez ce lien à la personne à inviter. Elle s\'inscrira directement depuis l\'app.', duration: 5000 });
    } catch {
      toast({ title: 'Lien', description: registerUrl, duration: 8000 });
    }
  };

  const toggleRole = async (user) => {
    setUpdating(user.id);
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    try {
      await base44.entities.User.update(user.id, { role: newRole });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
      toast({ title: 'Rôle mis à jour', description: `${user.full_name || user.email} est maintenant ${newRole === 'admin' ? 'administrateur' : 'utilisateur'}.`, duration: 3000 });
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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h2 className="font-heading font-semibold text-foreground">Gestion des accès</h2>
        </div>
        <Button onClick={copyRegisterLink} variant="outline" className="gap-2 text-sm">
          {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Link2 className="w-4 h-4" />}
          {copied ? 'Lien copié !' : 'Copier le lien d\'inscription'}
        </Button>
      </div>

      <div className="mb-4 p-3 bg-lavender/40 rounded-xl flex items-start gap-2">
        <Link2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Partagez le lien d'inscription à la personne à inviter. Elle crée elle-même son compte
          (email + mot de passe) directement depuis l'app, sans passer par Base44.
          Elle apparaîtra ensuite dans la liste ci-dessous pour l'attribution des sociétés et du rôle.
        </p>
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

              <button
                onClick={() => toggleRole(user)}
                disabled={updating === user.id}
                title={user.role === 'admin' ? 'Rétrograder en utilisateur' : 'Promouvoir administrateur'}
                className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full transition-colors flex-shrink-0 ${
                  user.role === 'admin'
                    ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                    : 'bg-secondary text-muted-foreground hover:bg-accent'
                }`}
              >
                <Crown className="w-3 h-3" />
                {user.role === 'admin' ? 'Admin' : 'User'}
              </button>

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