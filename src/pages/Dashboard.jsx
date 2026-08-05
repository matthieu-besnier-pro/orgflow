import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Users, Building2, ArrowLeftRight, UserPlus, TrendingUp, Network } from 'lucide-react';
import { Link } from 'react-router-dom';
import OnboardingModal from '@/components/OnboardingModal';
import { useCompany } from '@/lib/CompanyContext';

export default function Dashboard() {
  const [employees, setEmployees] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [movements, setMovements] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const { selectedCompanyId } = useCompany();

  useEffect(() => {
    if (!selectedCompanyId) return;
    setLoading(true);
    Promise.all([
      base44.entities.Employee.filter({ company_id: selectedCompanyId }),
      base44.entities.Agency.filter({ company_id: selectedCompanyId }),
      base44.entities.HRMovement.filter({ company_id: selectedCompanyId }, '-created_date', 10),
      base44.auth.me()
    ]).then(([emps, ags, movs, u]) => {
      setEmployees(emps);
      setAgencies(ags);
      setMovements(movs);
      setUser(u);
      setLoading(false);
      if (!localStorage.getItem('onboarding_shown')) {
        setShowOnboarding(true);
        localStorage.setItem('onboarding_shown', 'true');
      }
    });
  }, [selectedCompanyId]);

  // Recharger les employés en temps réel quand le chat en ajoute
  useEffect(() => {
    const unsubscribe = base44.entities.Employee.subscribe(() => {
      if (!selectedCompanyId) return;
      Promise.all([
        base44.entities.Employee.filter({ company_id: selectedCompanyId }),
        base44.entities.HRMovement.filter({ company_id: selectedCompanyId }, '-created_date', 10)
      ]).then(([emps, movs]) => {
        setEmployees(emps);
        setMovements(movs);
      });
    });
    return unsubscribe;
  }, [selectedCompanyId]);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-lavender border-t-primary rounded-full animate-spin" />
    </div>
  );

  const activeCount = employees.filter(e => e.status === 'Actif' || !e.status).length;
  const recruitingCount = employees.filter(e => e.status === 'En recrutement').length;
  const recentMovements = movements.slice(0, 5);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bonsoir' : 'Bonsoir';

  const statsByService = employees.reduce((acc, e) => {
    const s = e.service || 'Non défini';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
  const topServices = Object.entries(statsByService).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const statsByAgency = employees.reduce((acc, e) => {
    const ag = agencies.find(a => a.id === e.agency_id);
    const name = ag ? ag.name : 'Support Groupe';
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});
  const topAgencies = Object.entries(statsByAgency).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const movementTypeColors = {
    'Arrivée': 'bg-mint text-emerald-700',
    'Départ': 'bg-red-100 text-red-700',
    'Mutation': 'bg-lavender text-purple-700',
    'Changement de poste': 'bg-blue-100 text-blue-700',
    'Promotion': 'bg-yellow-100 text-yellow-700',
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {showOnboarding && <OnboardingModal onClose={() => setShowOnboarding(false)} />}
      {/* Welcome */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">
            {greeting}, {user?.full_name?.split(' ')[0] || 'Bienvenue'} 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            {recruitingCount > 0
              ? `${recruitingCount} poste${recruitingCount > 1 ? 's' : ''} en recrutement • ${employees.length} collaborateurs au total`
              : `${employees.length} collaborateurs dans le groupe`}
          </p>
        </div>
        <Link
          to="/organigramme"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Network className="w-4 h-4" />
          Voir l'organigramme
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Collaborateurs actifs', value: activeCount, icon: Users, color: 'bg-lavender', iconColor: 'text-primary' },
          { label: 'Agences', value: agencies.length, icon: Building2, color: 'bg-blue-100', iconColor: 'text-blue-600' },
          { label: 'En recrutement', value: recruitingCount, icon: UserPlus, color: 'bg-yellow-100', iconColor: 'text-yellow-600' },
          { label: 'Mouvements récents', value: movements.length, icon: ArrowLeftRight, color: 'bg-mint', iconColor: 'text-emerald-600' },
        ].map(({ label, value, icon: Icon, color, iconColor }) => (
          <div key={label} className="bg-white rounded-2xl border border-border p-5 hover:shadow-md transition-all duration-200">
            <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <p className="text-3xl font-heading font-bold text-foreground">{value}</p>
            <p className="text-sm text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* By Agency */}
        <div className="bg-white rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-heading font-semibold text-foreground">Effectifs par agence</h2>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="space-y-3">
            {topAgencies.map(([name, count]) => (
              <div key={name} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-foreground">{name}</span>
                    <span className="text-sm font-semibold text-foreground">{count}</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((count / employees.length) * 100 * 2, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent movements */}
        <div className="bg-white rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-heading font-semibold text-foreground">Derniers mouvements RH</h2>
            <Link to="/mouvements" className="text-xs text-primary hover:underline">Voir tout</Link>
          </div>
          {recentMovements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <ArrowLeftRight className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Aucun mouvement enregistré</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentMovements.map(m => (
                <div key={m.id} className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${movementTypeColors[m.movement_type] || 'bg-gray-100 text-gray-600'}`}>
                    {m.movement_type}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{m.employee_name}</p>
                    <p className="text-xs text-muted-foreground">{m.movement_date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top services */}
      <div className="bg-white rounded-2xl border border-border p-6">
        <h2 className="font-heading font-semibold text-foreground mb-5">Répartition par service</h2>
        <div className="flex flex-wrap gap-3">
          {topServices.map(([name, count]) => (
            <div key={name} className="flex items-center gap-2 px-4 py-2 bg-lavender rounded-full">
              <span className="text-sm font-medium text-foreground">{name}</span>
              <span className="text-xs font-bold text-primary">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}