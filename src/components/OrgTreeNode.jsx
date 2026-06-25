import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

const STATUS_COLORS = {
  'Actif': 'border-emerald-400',
  'En recrutement': 'border-yellow-400',
  'Apprenti': 'border-blue-400',
  'Alternant': 'border-purple-400',
  'Départ': 'border-red-400',
};

const STATUS_BADGE = {
  'En recrutement': 'bg-yellow-100 text-yellow-700',
  'Apprenti': 'bg-blue-100 text-blue-700',
  'Alternant': 'bg-purple-100 text-purple-700',
  'Départ': 'bg-red-100 text-red-700',
};

function EmployeeCard({ employee, onSelect, hasChildren, expanded, onToggle }) {
  const initials = `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`.toUpperCase();
  const borderColor = STATUS_COLORS[employee.status] || 'border-gray-200';
  const badge = STATUS_BADGE[employee.status];

  return (
    <div className="flex flex-col items-center">
      <div
        onClick={() => onSelect(employee)}
        className={`bg-white rounded-xl border-2 ${borderColor} shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 cursor-pointer p-2 flex flex-col items-center text-center w-28`}
      >
        {employee.photo_url ? (
          <img src={employee.photo_url} alt={initials} className="w-12 h-12 rounded-full object-cover mb-1.5" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-lavender flex items-center justify-center mb-1.5">
            <span className="text-sm font-bold text-primary">{initials}</span>
          </div>
        )}
        <p className="text-xs font-semibold text-foreground leading-tight">{employee.first_name}</p>
        <p className="text-xs font-semibold text-foreground leading-tight">{employee.last_name}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-tight text-center" style={{ fontSize: '9px' }}>{employee.position}</p>
        {badge && (
          <span className={`mt-1 px-1.5 py-0.5 rounded-full font-medium ${badge}`} style={{ fontSize: '8px' }}>{employee.status}</span>
        )}
      </div>
      {hasChildren && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className="mt-1 w-5 h-5 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors"
        >
          {expanded ? <ChevronDown className="w-3 h-3 text-primary" /> : <ChevronRight className="w-3 h-3 text-primary" />}
        </button>
      )}
    </div>
  );
}

export default function OrgTreeNode({ employee, childrenMap, onSelect, defaultExpanded = false, depth = 0 }) {
  const [expanded, setExpanded] = useState(defaultExpanded || depth < 2);
  const children = childrenMap[employee.id] || [];

  return (
    <div className="flex flex-col items-center">
      <EmployeeCard
        employee={employee}
        onSelect={onSelect}
        hasChildren={children.length > 0}
        expanded={expanded}
        onToggle={() => setExpanded(v => !v)}
      />

      {expanded && children.length > 0 && (
        <div className="flex flex-col items-center mt-1">
          {/* vertical line down */}
          <div className="w-px h-5 bg-border" />
          {/* horizontal bar */}
          <div className="relative flex items-start gap-6">
            {children.length > 1 && (
              <div
                className="absolute top-0 h-px bg-border"
                style={{ left: '14px', right: '14px' }}
              />
            )}
            {children.map((child, idx) => (
              <div key={child.id} className="flex flex-col items-center">
                {/* vertical stub */}
                <div className="w-px h-5 bg-border" />
                <OrgTreeNode
                  employee={child}
                  childrenMap={childrenMap}
                  onSelect={onSelect}
                  depth={depth + 1}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}