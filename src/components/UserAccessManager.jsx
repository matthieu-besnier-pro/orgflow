import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useCompany } from '@/lib/CompanyContext';
import { Shield, Check, X, UserPlus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function UserAccessManager() {
  const { companies } = useCompany();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviting, setInviting] = useState(false);
  const { toast } = useToast();

  const loadUsers = () => {
    base44.entities.User.list().then((u) => {
      setUsers(u);
      setLoading(false);
    });
  };

  useEffect(() => { loadUsers(); }, []);

  const sendInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await base44.users.inviteUser(inviteEmail.trim(), inviteRole);
      setInviteEmail('');
      setShowInvite(false);
      loadUsers();
      toast({ title: 'Invitation envoyée', description: `${inviteEmail.trim()} peut maintenant se connecter.`, duration: 4000 });
    } catch (err) {
      toast({ title: 'Erreur', description: err?.message || "Impossible d'inviter cet utilisateur.", variant: 'destructive', duration: 4000 });
    }
    setInviting(false);
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
        <Button onClick={() => setShowInvite(v => !v)} variant="outline" className="gap-2 text-sm">
          <UserPlus className="w-4 h-4" />
          Inviter un utilisateur
        </Button>
      </div>

      {showInvite && (
        <div className="mb-4 p-4 bg-secondary rounded-xl space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              type="email"
              placeholder="email@exemple.fr"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendInvite()}
              className="flex-1"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="user">Utilisateur</option>
              <option value="admin">Administrateur</option>
            </select>
            <Button onClick={sendInvite} disabled={inviting || !inviteEmail.trim()} className="gap-2">
              {inviting ? 'Envoi…' : 'Inviter'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">L'utilisateur recevra un email pour créer son mot de passe et se connecter.</p>
        </div>
      )}

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