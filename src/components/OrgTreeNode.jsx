import { useState } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { getServiceColor } from '@/lib/serviceColors';
import OrgCardPresentation from '@/components/OrgCardPresentation';

// Détection d'anomalies de données sur une fiche collaborateur
export function getAnomalies(employee, depth) {
  const list = [];
  if (depth > 0 && !employee.manager_id) list.push('Sans manager');
  if (!employee.service) list.push('Sans service');
  if (!employee.agency_id && !employee.is_group_support) list.push('Sans agence');
  if (!employee.position) list.push('Sans poste');
  return list;
}

const STATUS_DOT = {
  'Actif': 'bg-emerald-400',
  'En recrutement': 'bg-yellow-400',
  'Apprenti': 'bg-blue-400',
  'Alternant': 'bg-purple-400',
  'Départ': 'bg-red-400',
};

function matchesSearch(employee, searchTerm) {
  if (!searchTerm) return false;
  const haystack = `${employee.first_name} ${employee.last_name} ${employee.position || ''} ${employee.service || ''}`.toLowerCase();
  return haystack.includes(searchTerm);
}

// Depth-based colors — Charte GONNIN DURIS (solides, design moderne)
const DEPTH_COLORS = [
  { bg: '#003D7A', shadow: 'rgba(0, 61, 122, 0.12)', border: '#003D7A' },
  { bg: '#0056B3', shadow: 'rgba(0, 86, 179, 0.12)', border: '#0056B3' },
  { bg: '#0070D0', shadow: 'rgba(0, 112, 208, 0.12)', border: '#0070D0' },
  { bg: '#FDB913', shadow: 'rgba(253, 185, 19, 0.12)', border: '#FDB913' },
];

function getDepthColor(depth) {
  return DEPTH_COLORS[Math.min(depth, DEPTH_COLORS.length - 1)];
}

// ── Carte verticale : photo / nom / fonction ──────────────────────────────
function CardClassique({ employee, onSelect, onFocus, hasChildren, expanded, onToggle, onDragStart, isDragOver, isHighlighted, color, anomalies = [] }) {
  const initials = `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`.toUpperCase();
  const { bg, shadow } = color;
  const dot = STATUS_DOT[employee.status] || 'bg-emerald-400';

  return (
    <div className="flex flex-col items-center">
      <div
        draggable
        onDragStart={(e) => onDragStart(e, employee)}
        onClick={() => onSelect(employee)}
        onDoubleClick={(e) => { e.stopPropagation(); onFocus?.(employee); }}
        title="Clic : détails — Double-clic : centrer l'organigramme sur ce manager"
        style={{ backgroundColor: bg, boxShadow: `0 8px 24px ${shadow}` }}
        className={`relative rounded-xl cursor-grab active:cursor-grabbing active:opacity-80 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col items-center pt-5 pb-4 px-4 w-28
          ${isDragOver ? 'ring-2 ring-white ring-offset-2 scale-105' : ''}
          ${isHighlighted ? 'ring-2 ring-amber-400 ring-offset-1' : ''}
        `}
      >
        {anomalies.length > 0 && (
          <span title={anomalies.join(' · ')} className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center shadow">
            <AlertTriangle className="w-2.5 h-2.5 text-amber-900" />
          </span>
        )}
        {/* Avatar */}
        <div className="relative pointer-events-none mb-2">
          {employee.photo_url ? (
            <img src={employee.photo_url} alt={initials} className="w-12 h-12 rounded-full object-cover border-2 border-white/80 shadow" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-white/25 flex items-center justify-center border-2 border-white/60 shadow">
              <span className="text-base font-bold text-white">{initials}</span>
            </div>
          )}
          <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${dot}`} />
        </div>
        {/* Nom */}
        <div className="text-center pointer-events-none w-full">
          <p className="text-xs font-bold text-white leading-tight truncate">{employee.first_name}</p>
          <p className="text-xs font-bold text-white leading-tight truncate">{employee.last_name}</p>
        </div>
        {/* Fonction */}
        <p className="text-white/70 leading-tight text-center pointer-events-none w-full mt-0.5 line-clamp-2" style={{ fontSize: '9px' }}>
          {employee.position}
        </p>
        {/* Expand button */}
        {hasChildren && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className="mt-2 w-5 h-5 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors pointer-events-auto"
          >
            {expanded ? <ChevronDown className="w-3 h-3 text-white" /> : <ChevronRight className="w-3 h-3 text-white" />}
          </button>
        )}
      </div>
    </div>
  );
}

function CardModerne({ employee, onSelect, onFocus, hasChildren, expanded, onToggle, onDragStart, isDragOver, isHighlighted, color, anomalies = [] }) {
  const initials = `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`.toUpperCase();
  const { bg, shadow } = color;
  const dot = STATUS_DOT[employee.status] || 'bg-emerald-400';

  return (
    <div className="flex flex-col items-center">
      <div
        draggable
        onDragStart={(e) => onDragStart(e, employee)}
        onClick={() => onSelect(employee)}
        onDoubleClick={(e) => { e.stopPropagation(); onFocus?.(employee); }}
        title="Clic : détails — Double-clic : centrer l'organigramme sur ce manager"
        style={{ backgroundColor: bg, boxShadow: `0 8px 24px ${shadow}` }}
        className={`relative rounded-xl cursor-grab active:cursor-grabbing active:opacity-80 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex items-center gap-3 px-4 py-3 w-56
          ${isDragOver ? 'ring-2 ring-white ring-offset-2 scale-105' : ''}
          ${isHighlighted ? 'ring-2 ring-amber-400 ring-offset-1' : ''}
        `}
      >
        {anomalies.length > 0 && (
          <span title={anomalies.join(' · ')} className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center shadow">
            <AlertTriangle className="w-2.5 h-2.5 text-amber-900" />
          </span>
        )}
        <div className="relative pointer-events-none flex-shrink-0">
          {employee.photo_url ? (
            <img src={employee.photo_url} alt={initials} className="w-10 h-10 rounded-full object-cover border-2 border-white/80" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-white/25 flex items-center justify-center border-2 border-white/60">
              <span className="text-sm font-bold text-white">{initials}</span>
            </div>
          )}
          <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${dot}`} />
        </div>
        <div className="flex-1 min-w-0 pointer-events-none">
          <p className="text-xs font-bold text-white leading-tight truncate">{employee.first_name}</p>
          <p className="text-xs font-bold text-white leading-tight truncate">{employee.last_name}</p>
          <p className="text-white/70 truncate" style={{ fontSize: '9px' }}>{employee.position}</p>
        </div>
        {hasChildren && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className="flex-shrink-0 w-5 h-5 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors pointer-events-auto"
          >
            {expanded ? <ChevronDown className="w-3 h-3 text-white" /> : <ChevronRight className="w-3 h-3 text-white" />}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Template: Compact ──────────────────────────────────────────────────────
function CardCompact({ employee, onSelect, onFocus, hasChildren, expanded, onToggle, onDragStart, isDragOver, isHighlighted, anomalies = [] }) {
  const initials = `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`.toUpperCase();
  const dot = STATUS_DOT[employee.status] || 'bg-gray-300';

  return (
    <div className="flex flex-col items-center">
      <div
        draggable
        onDragStart={(e) => onDragStart(e, employee)}
        onClick={() => onSelect(employee)}
        onDoubleClick={(e) => { e.stopPropagation(); onFocus?.(employee); }}
        title="Clic : détails — Double-clic : centrer l'organigramme sur ce manager"
        className={`relative bg-white rounded-lg shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 cursor-grab active:cursor-grabbing active:opacity-60 px-3 py-2 flex items-center gap-2 w-48 border border-border
          ${isDragOver ? 'ring-2 ring-primary ring-offset-2 scale-105' : ''}
          ${isHighlighted ? 'ring-2 ring-amber-400 ring-offset-1 bg-amber-50' : ''}
        `}
      >
        {anomalies.length > 0 && (
          <span title={anomalies.join(' · ')} className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center">
            <AlertTriangle className="w-2 h-2 text-amber-900" />
          </span>
        )}
        <div className="relative flex-shrink-0 pointer-events-none">
          {employee.photo_url ? (
            <img src={employee.photo_url} alt={initials} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-lavender flex items-center justify-center">
              <span className="text-xs font-bold text-primary">{initials}</span>
            </div>
          )}
          <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${dot}`} />
        </div>
        <div className="flex-1 min-w-0 pointer-events-none">
          <p className="text-xs font-semibold text-foreground leading-tight truncate">{employee.first_name}</p>
          <p className="text-xs font-semibold text-foreground leading-tight truncate">{employee.last_name}</p>
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
  presentation: OrgCardPresentation,
};

// ── OrgTreeNode ────────────────────────────────────────────────────────────
export default function OrgTreeNode({ employee, childrenMap, onSelect, onFocus, defaultExpanded = false, depth = 0, onDragStart, onDrop, template = 'classique', searchTerm = '', colorMode = 'depth', showAnomalies = false }) {
  const [expanded, setExpanded] = useState(defaultExpanded || depth < 2);
  const [isDragOver, setIsDragOver] = useState(false);
  const children = childrenMap[employee.id] || [];
  const isHighlighted = matchesSearch(employee, searchTerm);

  const CardComponent = CARD_COMPONENTS[template] || CardClassique;
  const isCompact = template === 'compact';
  const isPresentation = template === 'presentation';
  const isModernStyle = !isCompact;
  const isDimmed = searchTerm && !isHighlighted;

  // Couleur de la carte : par profondeur hiérarchique ou par service
  const cardColor = colorMode === 'service'
    ? (() => { const c = getServiceColor(employee.service); return { bg: c.bg, shadow: `${c.bg}22`, border: c.bg }; })()
    : getDepthColor(depth || 0);

  const anomalies = showAnomalies ? getAnomalies(employee, depth) : [];

  const lineColor = isModernStyle ? '#94A3B8' : 'hsl(var(--border))';
  // border color of the team group box — slightly darker than line
  const { border: groupBorderColor } = getDepthColor(Math.min(depth + 1, DEPTH_COLORS.length - 1));

  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); };
  const handleDragLeave = (e) => { e.stopPropagation(); setIsDragOver(false); };
  const handleDrop = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); onDrop(e, employee); };

  return (
    <div className={`flex flex-col items-center transition-opacity duration-150 ${isDimmed ? 'opacity-30' : 'opacity-100'}`}>
      <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
        <CardComponent
          employee={employee}
          onSelect={onSelect}
          onFocus={onFocus}
          hasChildren={children.length > 0}
          expanded={expanded}
          onToggle={() => setExpanded(v => !v)}
          onDragStart={onDragStart}
          isDragOver={isDragOver}
          isHighlighted={isHighlighted}
          color={cardColor}
          anomalies={anomalies}
        />
      </div>

      {expanded && children.length > 0 && (
        isCompact ? (
          <div className="flex mt-2 ml-4">
            <div className="w-px mr-4 self-stretch" style={{ backgroundColor: lineColor }} />
            <div className="flex flex-col gap-2">
              {children.map((child) => (
                <OrgTreeNode
                  key={child.id}
                  employee={child}
                  childrenMap={childrenMap}
                  onSelect={onSelect}
                  onFocus={onFocus}
                  defaultExpanded={defaultExpanded}
                  depth={depth + 1}
                  onDragStart={onDragStart}
                  onDrop={onDrop}
                  template={template}
                  searchTerm={searchTerm}
                  colorMode={colorMode}
                  showAnomalies={showAnomalies}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center mt-1">
            {/* tronc vertical sortant du parent */}
            <div className="w-px h-5" style={{ backgroundColor: lineColor }} />
            {/* Groupe d'équipe */}
            <div
              className={isPresentation ? '' : 'rounded-2xl px-3 pb-3'}
              style={isPresentation ? undefined : {
                border: `1.5px solid ${groupBorderColor}33`,
                background: `${groupBorderColor}0a`,
              }}
            >
              <div className="flex items-start gap-4 justify-center">
                {children.map((child, i) => (
                  <div key={child.id} className="flex flex-col items-center">
                    {/* connecteur orthogonal : demi-barres horizontales + descente verticale */}
                    <div className="flex w-full h-4">
                      <div
                        className="flex-1"
                        style={{ borderTop: children.length > 1 && i > 0 ? `1px solid ${lineColor}` : 'none' }}
                      />
                      <div className="w-px" style={{ backgroundColor: lineColor }} />
                      <div
                        className="flex-1"
                        style={{ borderTop: children.length > 1 && i < children.length - 1 ? `1px solid ${lineColor}` : 'none' }}
                      />
                    </div>
                    <OrgTreeNode
                      employee={child}
                      childrenMap={childrenMap}
                      onSelect={onSelect}
                      onFocus={onFocus}
                      defaultExpanded={defaultExpanded}
                      depth={depth + 1}
                      onDragStart={onDragStart}
                      onDrop={onDrop}
                      template={template}
                      searchTerm={searchTerm}
                      colorMode={colorMode}
                      showAnomalies={showAnomalies}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}