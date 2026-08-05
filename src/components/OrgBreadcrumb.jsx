import { ChevronRight, Home } from 'lucide-react';

// Chaîne hiérarchique du sommet jusqu'au collaborateur ciblé
function buildPath(employees, focusedId) {
  const byId = {};
  employees.forEach(e => { byId[e.id] = e; });
  const path = [];
  let current = byId[focusedId];
  const seen = new Set();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(current);
    current = current.manager_id ? byId[current.manager_id] : null;
  }
  return path;
}

export default function OrgBreadcrumb({ employees, focusedId, onNavigate }) {
  const path = buildPath(employees, focusedId);
  if (path.length === 0) return null;

  return (
    <div className="flex items-center gap-1 flex-wrap px-4 py-2 bg-secondary/40 border-b border-border">
      <button
        onClick={() => onNavigate('all')}
        className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
      >
        <Home className="w-3 h-3" />
        Vue complète
      </button>
      {path.map((e, i) => (
        <span key={e.id} className="flex items-center gap-1">
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
          <button
            onClick={() => onNavigate(e.id)}
            disabled={i === path.length - 1}
            className={`text-xs ${i === path.length - 1 ? 'font-semibold text-foreground' : 'text-muted-foreground hover:text-primary hover:underline'}`}
          >
            {e.first_name} {e.last_name}
          </button>
        </span>
      ))}
    </div>
  );
}