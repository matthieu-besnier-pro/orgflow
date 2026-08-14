import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { 
  LayoutDashboard, Network, Users, ArrowLeftRight, 
  MessageSquareText, ChevronRight, Menu, X, Building2, HelpCircle, MapPin, Layers, ShieldCheck, Shield, History
} from 'lucide-react';
import CompanySelector from '@/components/CompanySelector';
import { useCompany } from '@/lib/CompanyContext';
import { useAuth } from '@/lib/AuthContext';

const allNavItems = [
  { path: '/', icon: LayoutDashboard, label: 'Tableau de bord', help: 'Vue d\'ensemble et statistiques clés', roles: ['admin', 'rh', 'user'] },
  { path: '/organigramme', icon: Network, label: 'Organigramme', help: 'Visualisez la hiérarchie (cliquez sur les noms)', roles: ['admin', 'rh', 'user'] },
  { path: '/annuaire', icon: Users, label: 'Annuaire', help: 'Cherchez et modifiez les collaborateurs', roles: ['admin', 'rh', 'user'] },
  { path: '/agences', icon: MapPin, label: 'Agences', help: 'Gérez les agences du groupe', roles: ['admin', 'rh', 'user'] },
  { path: '/mouvements', icon: ArrowLeftRight, label: 'Mouvements RH', help: 'Enregistrez arrivées, départs, mutations...', roles: ['admin', 'rh', 'user'] },
  { path: '/societes', icon: Layers, label: 'Sociétés', help: 'Gérez les sociétés et leur structure', roles: ['admin', 'rh', 'user'] },
  { path: '/qualite-donnees', icon: ShieldCheck, label: 'Qualité des données', help: 'Fiches incomplètes et libellés à harmoniser', roles: ['admin', 'rh', 'user'] },
  { path: '/chatbot', icon: MessageSquareText, label: 'Assistant IA', help: '⭐ L\'outil le plus simple pour débuter !', roles: ['admin', 'rh', 'user'] },
  { path: '/utilisateurs', icon: Shield, label: 'Utilisateurs', help: 'Gérez les rôles et accès', roles: ['admin'] },
  { path: '/journal', icon: History, label: 'Journal d\'activité', help: 'Suivi des actions sur les organigrammes', roles: ['admin', 'rh'] },
];

export default function Layout() {
  const location = useLocation();
  const [expanded, setExpanded] = useState(false);
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const userRole = user?.role || 'user';

  const navItems = allNavItems.filter(item => item.roles.includes(userRole));
  const companyName = selectedCompany?.name || 'Multi-Sociétés';

  return (
    <div className="flex h-screen bg-canvas overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`flex flex-col bg-white border-r border-border transition-all duration-300 ease-in-out z-50 shadow-sm ${expanded ? 'w-56' : 'w-16'}`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-3 py-4 border-b border-border h-16">
          {selectedCompany?.logo_url ? (
            <img src={selectedCompany.logo_url} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-white" />
            </div>
          )}
          {expanded && (
            <div className="overflow-hidden">
              <p className="font-heading font-700 text-sm text-foreground leading-tight truncate">{companyName}</p>
            </div>
          )}
        </div>

        {/* Company selector */}
        {expanded && <CompanySelector />}

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 px-2 group">
          {navItems.map(({ path, icon: Icon, label, help }) => {
            const active = location.pathname === path;
            return (
              <div key={path} className="relative">
                <Link
                  to={path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                    active 
                      ? 'bg-lavender text-foreground font-medium' 
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-primary' : ''}`} />
                  {expanded && <span className="text-sm truncate">{label}</span>}
                </Link>
                {/* Tooltip au survol quand réduit */}
                {!expanded && help && (
                  <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-foreground text-white text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap pointer-events-none opacity-0 transition-opacity group-hover:opacity-100 z-50">
                    {help}
                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-foreground" />
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Help panel when expanded */}
        {expanded && (
          <div className="px-3 py-3 border-t border-border bg-blue-50 rounded-xl mx-2 mb-3">
            <p className="text-xs font-semibold text-blue-900 flex items-center gap-1.5 mb-2">
              <HelpCircle className="w-3.5 h-3.5" />
              Conseil
            </p>
            <p className="text-xs text-blue-800 leading-relaxed">
              Débutez par l'<strong>Assistant IA</strong> pour maîtriser rapidement l'outil !
            </p>
          </div>
        )}

        {/* Toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mx-2 mb-4 flex items-center justify-center px-3 py-2 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-200"
        >
          {expanded ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          {expanded && <span className="text-sm ml-3">Réduire</span>}
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}