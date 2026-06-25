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

function matchesSearch(employee, searchTerm) {
  if (!searchTerm) return false;
  const haystack = `${employee.first_name} ${employee.last_name} ${employee.position || ''} ${employee.service || ''}`.toLowerCase();
  return haystack.includes(searchTerm);
}

// Depth-based gradient colors matching the mockup
const DEPTH_COLORS = [
  { bg: 'linear-gradient(135deg, #6c63ff 0%, #7c73ff 100%)', shadow: 'rgba(108,99,255,0.35)' },
  { bg: 'linear-gradient(135deg, #7c73ff 0%, #8c83ff 100%)', shadow: 'rgba(124,115,255,0.30)' },
  { bg: 'linear-gradient(135deg, #9c93ff 0%, #b0a9ff 100%)', shadow: 'rgba(156,147,255,0.25)' },
  { bg: 'linear-gradient(135deg, #b0a9ff 0%, #c4bfff 100%)', shadow: 'rgba(176,169,255,0.20)' },
];

function getDepthColor(depth) {
  return DEPTH_COLORS[Math.min(depth, DEPTH_COLORS.length - 1)];
}

// ── Template: Classique (Moderne épuré style) ─────────────────────────────
function CardClassique({ employee, onSelect, hasChildren, expanded, onToggle, onDragStart, isDragOver, isHighlighted, depth }) {
  const initials = `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`.toUpperCase();
  const { bg, shadow } = getDepthColor(depth || 0);

  return (
    <div className="flex flex-col items-center">
      <div
        draggable
        onDragStart={(e) => onDragStart(e, employee)}
        onClick={() => onSelect(employee)}
        style={{ background: bg, boxShadow: `0 4px 16px ${shadow}` }}
        className={`relative rounded-2xl cursor-grab active:cursor-grabbing active:opacity-60 hover:-translate-y-0.5 transition-all duration-150 flex items-center gap-2 px-2.5 py-2 w-44
          ${isDragOver ? 'ring-2 ring-white ring-offset-2 scale-105' : ''}
          ${isHighlighted ? 'ring-2 ring-amber-300 ring-offset-1' : ''}
        `}
      >
        {/* Avatar */}
        <div className="relative flex-shrink-0 pointer-events-none">
          {employee.photo_url ? (
            <img src={employee.photo_url} alt={initials} className="w-11 h-11 rounded-full object-cover border-2 border-white/70 shadow-sm" />
          ) : (
            <div className="w-11 h-11 rounded-full bg-white/25 flex items-center justify-center border-2 border-white/60">
              <span className="text-sm font-bold text-white">{initials}</span>
            </div>
          )}
          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white" />
        </div>
        {/* Text */}
        <div className="flex-1 min-w-0 pointer-events-none">
          <p className="text-sm font-semibold text-white leading-tight truncate">{employee.first_name} {employee.last_name}</p>
          <p className="text-xs text-white/75 leading-tight truncate mt-0.5">{employee.position}</p>
        </div>
        {/* Expand button */}
        {hasChildren && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className="flex-shrink-0 w-5 h-5 rounded-full bg-white/20 hover:bg-white/35 flex items-center justify-center transition-colors pointer-events-auto"
          >
            {expanded ? <ChevronDown className="w-3 h-3 text-white" /> : <ChevronRight className="w-3 h-3 text-white" />}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Template: Moderne (same style as Classique) ───────────────────────────
function CardModerne({ employee, onSelect, hasChildren, expanded, onToggle, onDragStart, isDragOver, isHighlighted, depth }) {
  return <CardClassique employee={employee} onSelect={onSelect} hasChildren={hasChildren} expanded={expanded} onToggle={onToggle} onDragStart={onDragStart} isDragOver={isDragOver} isHighlighted={isHighlighted} depth={depth} />;
}

// ── Template: Compact ──────────────────────────────────────────────────────
function CardCompact({ employee, onSelect, hasChildren, expanded, onToggle, onDragStart, isDragOver, isHighlighted }) {
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
          ${isHighlighted ? 'ring-2 ring-amber-400 ring-offset-1 bg-amber-50' : ''}
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
export default function OrgTreeNode({ employee, childrenMap, onSelect, defaultExpanded = false, depth = 0, onDragStart, onDrop, template = 'classique', searchTerm = '' }) {
  const [expanded, setExpanded] = useState(defaultExpanded || depth < 2);
  const [isDragOver, setIsDragOver] = useState(false);
  const children = childrenMap[employee.id] || [];
  const isHighlighted = matchesSearch(employee, searchTerm);

  const CardComponent = CARD_COMPONENTS[template] || CardClassique;
  const isModernStyle = template === 'classique' || template === 'moderne';

  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); };
  const handleDragLeave = (e) => { e.stopPropagation(); setIsDragOver(false); };
  const handleDrop = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); onDrop(e, employee); };

  const isCompact = template === 'compact';

  // Dim nodes that don't match search (when search is active)
  const isDimmed = searchTerm && !isHighlighted;

  const lineColor = isModernStyle ? '#c4bfff' : 'hsl(var(--border))';

  return (
    <div className={`flex flex-col ${isCompact ? 'items-start' : 'items-center'} transition-opacity duration-150 ${isDimmed ? 'opacity-30' : 'opacity-100'}`}>
      <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
        <CardComponent
          employee={employee}
          onSelect={onSelect}
          hasChildren={children.length > 0}
          expanded={expanded}
          onToggle={() => setExpanded(v => !v)}
          onDragStart={onDragStart}
          isDragOver={isDragOver}
          isHighlighted={isHighlighted}
          depth={depth}
        />
      </div>

      {expanded && children.length > 0 && (
        isCompact ? (
          <div className="flex mt-1 ml-4">
            <div className="w-px mr-4 self-stretch mt-0" style={{ backgroundColor: lineColor }} />
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
                  searchTerm={searchTerm}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center mt-1">
            <div className="w-px h-6" style={{ backgroundColor: lineColor }} />
            <div className="relative flex items-start gap-4">
              {children.length > 1 && (
                <div className="absolute top-0 h-px" style={{ backgroundColor: lineColor, left: '26px', right: '26px' }} />
              )}
              {children.map((child) => (
                <div key={child.id} className="flex flex-col items-center">
                  <div className="w-px h-6" style={{ backgroundColor: lineColor }} />
                  <OrgTreeNode
                    employee={child}
                    childrenMap={childrenMap}
                    onSelect={onSelect}
                    depth={depth + 1}
                    onDragStart={onDragStart}
                    onDrop={onDrop}
                    template={template}
                    searchTerm={searchTerm}
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