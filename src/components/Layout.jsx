import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { 
  LayoutDashboard, Network, Users, ArrowLeftRight, 
  MessageSquareText, ChevronRight, Menu, X, Building2
} from 'lucide-react';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Tableau de bord' },
  { path: '/organigramme', icon: Network, label: 'Organigramme' },
  { path: '/annuaire', icon: Users, label: 'Annuaire' },
  { path: '/mouvements', icon: ArrowLeftRight, label: 'Mouvements RH' },
  { path: '/chatbot', icon: MessageSquareText, label: 'Assistant IA' },
];

export default function Layout() {
  const location = useLocation();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex h-screen bg-canvas overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`flex flex-col bg-white border-r border-border transition-all duration-300 ease-in-out z-50 shadow-sm ${expanded ? 'w-56' : 'w-16'}`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-3 py-4 border-b border-border h-16">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          {expanded && (
            <div className="overflow-hidden">
              <p className="font-heading font-700 text-sm text-foreground leading-tight">GONNIN</p>
              <p className="font-heading font-700 text-sm text-primary leading-tight">DURIS</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {navItems.map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
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
            );
          })}
        </nav>

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