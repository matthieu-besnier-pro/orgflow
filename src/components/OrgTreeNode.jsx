import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

const STATUS_COLORS = {
  'Actif': 'border-emerald-400',
  'En recrutement': 'border-yellow-400',
  'Apprenti': 'border-blue-400',
  'Alternant': 'border-purple-400',
  'Départ': 'border-red-400',
};

const STATUS_DOT = {
  'Actif': 'bg-emerald-400',
  'En recrutement': 'bg-yellow-400',
  'Apprenti': 'bg-blue-400',
  'Alternant': 'bg-purple-400',
  'Départ': 'bg-red-400',
};

const STATUS_BADGE = {
  'En recrutement': 'bg-yellow-100 text-yellow-700',
  'Apprenti': 'bg-blue-100 text-blue-700',
  'Alternant': 'bg-purple-100 text-purple-700',
  'Départ': 'bg-red-100 text-red-700',
};

// ── Template: Classique ────────────────────────────────────────────────────
function CardClassique({ employee, onSelect, hasChildren, expanded, onToggle, onDragStart, isDragOver }) {
  const initials = `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`.toUpperCase();
  const borderColor = STATUS_COLORS[employee.status] || 'border-gray-200';
  const badge = STATUS_BADGE[employee.status];

  return (
    <div className="flex flex-col items-center">
      <div
        draggable
        onDragStart={(e) => onDragStart(e, employee)}
        onClick={() => onSelect(employee)}
        className={`bg-white rounded-xl border-2 ${borderColor} shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 cursor-grab active:cursor-grabbing active:opacity-60 active:scale-95 p-2 flex flex-col items-center text-center w-28
          ${isDragOver ? 'ring-2 ring-primary ring-offset-2 scale-105' : ''}
        `}
      >
        {employee.photo_url ? (
          <img src={employee.photo_url} alt={initials} className="w-12 h-12 rounded-full object-cover mb-1.5 pointer-events-none" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-lavender flex items-center justify-center mb-1.5 pointer-events-none">
            <span className="text-sm font-bold text-primary">{initials}</span>
          </div>
        )}
        <p className="text-xs font-semibold text-foreground leading-tight pointer-events-none">{employee.first_name}</p>
        <p className="text-xs font-semibold text-foreground leading-tight pointer-events-none">{employee.last_name}</p>
        <p className="text-muted-foreground mt-0.5 leading-tight text-center pointer-events-none" style={{ fontSize: '9px' }}>{employee.position}</p>
        {badge && (
          <span className={`mt-1 px-1.5 py-0.5 rounded-full font-medium pointer-events-none ${badge}`} style={{ fontSize: '8px' }}>{employee.status}</span>
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

// ── Template: Moderne ──────────────────────────────────────────────────────
function CardModerne({ employee, onSelect, hasChildren, expanded, onToggle, onDragStart, isDragOver }) {
  const initials = `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`.toUpperCase();
  const dot = STATUS_DOT[employee.status] || 'bg-gray-300';

  return (
    <div className="flex flex-col items-center">
      <div
        draggable
        onDragStart={(e) => onDragStart(e, employee)}
        onClick={() => onSelect(employee)}
        className={`relative bg-gradient-to-br from-white to-secondary/40 rounded-2xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-grab active:cursor-grabbing active:opacity-60 p-3 flex flex-col items-center text-center w-32 border border-border/60
          ${isDragOver ? 'ring-2 ring-primary ring-offset-2 scale-105' : ''}
        `}
      >
        <div className="relative mb-2 pointer-events-none">
          {employee.photo_url ? (
            <img src={employee.photo_url} alt={initials} className="w-14 h-14 rounded-2xl object-cover shadow-sm" />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center shadow-sm">
              <span className="text-base font-bold text-primary">{initials}</span>
            </div>
          )}
          <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${dot}`} />
        </div>
        <p className="text-xs font-bold text-foreground leading-tight pointer-events-none">{employee.first_name} {employee.last_name}</p>
        <p className="text-muted-foreground mt-0.5 leading-tight pointer-events-none line-clamp-2" style={{ fontSize: '9px' }}>{employee.position}</p>
        {employee.service && (
          <span className="mt-1.5 px-2 py-0.5 bg-primary/10 text-primary rounded-full pointer-events-none" style={{ fontSize: '8px' }}>{employee.service}</span>
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

// ── Template: Compact ──────────────────────────────────────────────────────
function CardCompact({ employee, onSelect, hasChildren, expanded, onToggle, onDragStart, isDragOver }) {
  const initials = `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`.toUpperCase();
  const dot = STATUS_DOT[employee.status] || 'bg-gray-300';

  return (
    <div className="flex flex-col items-center">
      <div
        draggable
        onDragStart={(e) => onDragStart(e, employee)}
        onClick={() => onSelect(employee)}
        className={`bg-white rounded-lg shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 cursor-grab active:cursor-grabbing active:opacity-60 px-3 py-2 flex items-center gap-2 w-52 border border-border
          ${isDragOver ? 'ring-2 ring-primary ring-offset-2 scale-105' : ''}
        `}
      >
        <div className="relative flex-shrink-0 pointer-events-none">
          {employee.photo_url ? (
            <img src={employee.photo_url} alt={initials} className="w-9 h-9 rounded-full object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-lavender flex items-center justify-center">
              <span className="text-xs font-bold text-primary">{initials}</span>
            </div>
          )}
          <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${dot}`} />
        </div>
        <div className="flex-1 min-w-0 pointer-events-none">
          <p className="text-xs font-semibold text-foreground truncate">{employee.first_name} {employee.last_name}</p>
          <p className="text-muted-foreground truncate" style={{ fontSize: '9px' }}>{employee.position}</p>
        </div>
        {hasChildren && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors pointer-events-auto"
          >
            {expanded ? <ChevronDown className="w-3 h-3 text-primary" /> : <ChevronRight className="w-3 h-3 text-primary" />}
          </button>
        )}
      </div>
    </div>
  );
}

const CARD_COMPONENTS = {
  classique: CardClassique,
  moderne: CardModerne,
  compact: CardCompact,
};

// ── OrgTreeNode ────────────────────────────────────────────────────────────
export default function OrgTreeNode({ employee, childrenMap, onSelect, defaultExpanded = false, depth = 0, onDragStart, onDrop, template = 'classique' }) {
  const [expanded, setExpanded] = useState(defaultExpanded || depth < 2);
  const [isDragOver, setIsDragOver] = useState(false);
  const children = childrenMap[employee.id] || [];

  const CardComponent = CARD_COMPONENTS[template] || CardClassique;

  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); };
  const handleDragLeave = (e) => { e.stopPropagation(); setIsDragOver(false); };
  const handleDrop = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); onDrop(e, employee); };

  // Compact uses a vertical list layout for children
  const isCompact = template === 'compact';

  return (
    <div className={`flex flex-col ${isCompact ? 'items-start' : 'items-center'}`}>
      <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
        <CardComponent
          employee={employee}
          onSelect={onSelect}
          hasChildren={children.length > 0}
          expanded={expanded}
          onToggle={() => setExpanded(v => !v)}
          onDragStart={onDragStart}
          isDragOver={isDragOver}
        />
      </div>

      {expanded && children.length > 0 && (
        isCompact ? (
          <div className="flex mt-1 ml-4">
            <div className="w-px bg-border mr-4 self-stretch mt-0" />
            <div className="flex flex-col gap-2">
              {children.map((child) => (
                <OrgTreeNode
                  key={child.id}
                  employee={child}
                  childrenMap={childrenMap}
                  onSelect={onSelect}
                  depth={depth + 1}
                  onDragStart={onDragStart}
                  onDrop={onDrop}
                  template={template}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center mt-1">
            <div className="w-px h-5 bg-border" />
            <div className="relative flex items-start gap-6">
              {children.length > 1 && (
                <div className="absolute top-0 h-px bg-border" style={{ left: '14px', right: '14px' }} />
              )}
              {children.map((child) => (
                <div key={child.id} className="flex flex-col items-center">
                  <div className="w-px h-5 bg-border" />
                  <OrgTreeNode
                    employee={child}
                    childrenMap={childrenMap}
                    onSelect={onSelect}
                    depth={depth + 1}
                    onDragStart={onDragStart}
                    onDrop={onDrop}
                    template={template}
                  />
                </div>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
}