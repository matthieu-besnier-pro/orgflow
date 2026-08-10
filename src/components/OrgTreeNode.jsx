import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { getServiceColor } from '@/lib/serviceColors';
import OrgCardPresentation from '@/components/OrgCardPresentation';
import OrgLeafList from '@/components/OrgLeafList';

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

function hasMatchingDescendant(employeeId, childrenMap, searchTerm) {
  if (!searchTerm) return false;
  const children = childrenMap[employeeId] || [];
  for (const child of children) {
    if (matchesSearch(child, searchTerm) || hasMatchingDescendant(child.id, childrenMap, searchTerm)) {
      return true;
    }
  }
  return false;
}

// Depth-based colors — palette par défaut (personnalisable par société)
const DEFAULT_DEPTH_HEX = ['#003D7A', '#0056B3', '#0070D0', '#FDB913'];

function getDepthColor(depth, palette) {
  const hexes = palette && palette.length ? palette : DEFAULT_DEPTH_HEX;
  const hex = hexes[Math.min(depth, hexes.length - 1)];
  return { bg: hex, shadow: `${hex}1f`, border: hex };
}

// ── Carte verticale : photo / nom / fonction ──────────────────────────────
function CardClassique({ employee, onSelect, onFocus, hasChildren, expanded, onToggle, onDragStart, isDragOver, isHighlighted, color, anomalies = [] }) {
  const initials = `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`.toUpperCase();
  const { bg, shadow } = color;
  const isApprenti = employee.status === 'Apprenti' || employee.status === 'Alternant';
  const apprentiDot = employee.status === 'Apprenti' ? 'bg-blue-400' : 'bg-purple-400';

  return (
    <div className="flex flex-col items-center">
      <div
        draggable
        onDragStart={(e) => onDragStart(e, employee)}
        onClick={() => onSelect(employee)}
        onDoubleClick={(e) => { e.stopPropagation(); onFocus?.(employee); }}
        title="Clic : détails — Double-clic : centrer l'organigramme sur ce manager"
        style={{ backgroundColor: bg, boxShadow: `0 8px 24px ${shadow}` }}
        className={`relative rounded-xl cursor-grab active:cursor-grabbing active:opacity-80 hover:shadow-xl hover:-translate-y-1 hover:z-50 transition-all duration-200 flex flex-col items-center pt-5 pb-4 px-4 w-28
          ${isDragOver ? 'ring-2 ring-white ring-offset-2 scale-105' : ''}
          ${isHighlighted ? 'ring-4 ring-amber-400 ring-offset-2 scale-105 shadow-[0_0_24px_rgba(251,191,36,0.55)] z-10' : ''}
        `}
      >
        {anomalies.length > 0 && (
          <span title={anomalies.join(' · ')} className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center shadow">
            <AlertTriangle className="w-2.5 h-2.5 text-amber-900" />
          </span>
        )}
        {/* Avatar */}
        <div className="relative mb-2">
          {employee.photo_url ? (
            <img src={employee.photo_url} alt={initials} className="w-12 h-12 rounded-full object-cover border-2 border-white/80 shadow pointer-events-auto cursor-pointer relative transition-transform duration-200 hover:scale-[2.2] hover:z-50" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-white/25 flex items-center justify-center border-2 border-white/60 shadow">
              <span className="text-base font-bold text-white">{initials}</span>
            </div>
          )}
          {isApprenti && <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-white ${apprentiDot}`} />}
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

function CardModerne({ employee, onSelect, onFocus, hasChildren, expanded, onToggle, onDragStart, isDragOver, isHighlighted, anomalies = [] }) {
  const initials = `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`.toUpperCase();
  const svc = getServiceColor(employee.service);
  const isApprenti = employee.status === 'Apprenti' || employee.status === 'Alternant';
  const apprentiDot = employee.status === 'Apprenti' ? 'bg-blue-400' : 'bg-purple-400';

  return (
    <div className="flex flex-col items-center">
      <div
        draggable
        onDragStart={(e) => onDragStart(e, employee)}
        onClick={() => onSelect(employee)}
        onDoubleClick={(e) => { e.stopPropagation(); onFocus?.(employee); }}
        title="Clic : détails — Double-clic : centrer l'organigramme sur ce manager"
        style={{ backgroundColor: '#ffffff', borderLeft: `5px solid ${svc.bg}`, boxShadow: '0 4px 14px rgba(15,23,42,0.10)' }}
        className={`relative rounded-xl border border-border cursor-grab active:cursor-grabbing active:opacity-80 hover:shadow-xl hover:-translate-y-1 hover:z-50 transition-all duration-200 flex items-center gap-2.5 px-3 py-2.5 min-w-[13rem] w-max
          ${isDragOver ? 'ring-2 ring-white ring-offset-2 scale-105' : ''}
          ${isHighlighted ? 'ring-4 ring-amber-400 ring-offset-2 scale-105 shadow-[0_0_24px_rgba(251,191,36,0.55)] z-10' : ''}
        `}
      >
        {anomalies.length > 0 && (
          <span title={anomalies.join(' · ')} className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center shadow">
            <AlertTriangle className="w-2.5 h-2.5 text-amber-900" />
          </span>
        )}
        <div className="relative flex-shrink-0">
          {employee.photo_url ? (
            <img src={employee.photo_url} alt={initials} className="w-16 h-16 rounded-full object-cover border-2 border-white shadow pointer-events-auto cursor-pointer relative transition-transform duration-200 hover:scale-[2.2] hover:z-50" />
          ) : (
            <div className="w-16 h-16 rounded-full flex items-center justify-center border-2 border-white shadow" style={{ backgroundColor: svc.light }}>
              <span className="text-base font-bold" style={{ color: svc.bg }}>{initials}</span>
            </div>
          )}
          {isApprenti && <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-white ${apprentiDot}`} />}
        </div>
        <div className="flex-1 pointer-events-none">
          <p className="text-xs font-bold text-foreground leading-tight whitespace-nowrap">{employee.first_name}</p>
          <p className="text-xs font-bold text-foreground leading-tight whitespace-nowrap">{employee.last_name}</p>
          <p className="text-muted-foreground leading-snug max-w-[9rem] break-words" style={{ fontSize: '9px' }}>{employee.position}</p>
        </div>
        {hasChildren && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-colors pointer-events-auto"
            style={{ backgroundColor: svc.light }}
          >
            {expanded ? <ChevronDown className="w-3 h-3" style={{ color: svc.bg }} /> : <ChevronRight className="w-3 h-3" style={{ color: svc.bg }} />}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Template: Compact ──────────────────────────────────────────────────────
function CardCompact({ employee, onSelect, onFocus, hasChildren, expanded, onToggle, onDragStart, isDragOver, isHighlighted, anomalies = [] }) {
  const initials = `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`.toUpperCase();
  const isApprenti = employee.status === 'Apprenti' || employee.status === 'Alternant';
  const apprentiDot = employee.status === 'Apprenti' ? 'bg-blue-400' : 'bg-purple-400';

  return (
    <div className="flex flex-col items-center">
      <div
        draggable
        onDragStart={(e) => onDragStart(e, employee)}
        onClick={() => onSelect(employee)}
        onDoubleClick={(e) => { e.stopPropagation(); onFocus?.(employee); }}
        title="Clic : détails — Double-clic : centrer l'organigramme sur ce manager"
        className={`relative bg-white rounded-lg shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:z-50 transition-all duration-150 cursor-grab active:cursor-grabbing active:opacity-60 px-3 py-2 flex items-center gap-2 w-48 border border-border
          ${isDragOver ? 'ring-2 ring-primary ring-offset-2 scale-105' : ''}
          ${isHighlighted ? 'ring-4 ring-amber-400 ring-offset-2 scale-105 bg-amber-50 shadow-[0_0_24px_rgba(251,191,36,0.55)] z-10' : ''}
        `}
      >
        {anomalies.length > 0 && (
          <span title={anomalies.join(' · ')} className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center">
            <AlertTriangle className="w-2 h-2 text-amber-900" />
          </span>
        )}
        <div className="relative flex-shrink-0">
          {employee.photo_url ? (
            <img src={employee.photo_url} alt={initials} className="w-8 h-8 rounded-full object-cover pointer-events-auto cursor-pointer relative transition-transform duration-200 hover:scale-[2.5] hover:z-50" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-lavender flex items-center justify-center">
              <span className="text-xs font-bold text-primary">{initials}</span>
            </div>
          )}
          {isApprenti && <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${apprentiDot}`} />}
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
export default function OrgTreeNode({ employee, childrenMap, onSelect, onFocus, defaultExpanded = false, depth = 0, onDragStart, onDrop, template = 'classique', searchTerm = '', colorMode = 'depth', showAnomalies = false, depthColors = null, parentService = null, sideCards = [], serviceSortMode = 'count', serviceOrder = [], onServiceReorder = null, visibleIds = null, filterMatchIds = null }) {
  const [expanded, setExpanded] = useState(defaultExpanded || depth < 2);
  const [isDragOver, setIsDragOver] = useState(false);
  const children = childrenMap[employee.id] || [];
  const isHighlighted = matchesSearch(employee, searchTerm);

  // Auto-déplier quand une recherche est active pour révéler les correspondances
  useEffect(() => { if (searchTerm) setExpanded(true); }, [searchTerm]);

  // Tout le monde à l'horizontal : les managers utilisent la carte horizontale
  const CardComponent = template === 'classique' ? CardModerne : (CARD_COMPONENTS[template] || CardClassique);
  const isCompact = template === 'compact';
  const isPresentation = template === 'presentation';
  const isModernStyle = !isCompact;
  const hasMatchInSubtree = visibleIds
    ? visibleIds.has(employee.id)
    : (isHighlighted || hasMatchingDescendant(employee.id, childrenMap, searchTerm) || (sideCards || []).some(e => matchesSearch(e, searchTerm)));
  const isSearchDimmed = searchTerm && !hasMatchInSubtree;
  const isFilterAncestor = filterMatchIds && !filterMatchIds.has(employee.id);
  const opacityClass = isSearchDimmed ? 'opacity-20' : (isFilterAncestor ? 'opacity-40' : 'opacity-100');

  // Couleur de la carte : par profondeur hiérarchique ou par service
  const cardColor = colorMode === 'service'
    ? (() => { const c = getServiceColor(employee.service); return { bg: c.bg, shadow: `${c.bg}22`, border: c.bg }; })()
    : getDepthColor(depth || 0, depthColors);

  const anomalies = showAnomalies ? getAnomalies(employee, depth) : [];

  // Les collaborateurs sans équipe sont regroupés en liste horizontale ; les managers restent en cartes verticales
  // Co-managers : un collaborateur sans équipe qui partage un service avec un manager est affiché à ses côtés
  const leafChildrenRaw = children.filter(c => !(childrenMap[c.id]?.length > 0));
  const managerChildrenRaw = children.filter(c => childrenMap[c.id]?.length > 0);
  const managerServices = new Set(managerChildrenRaw.map(c => c.service || 'Sans service'));
  const leafChildren = leafChildrenRaw.filter(c => !managerServices.has(c.service || 'Sans service') && !c.is_co_manager);
  const coManagerLeaves = leafChildrenRaw.filter(c => managerServices.has(c.service || 'Sans service') || c.is_co_manager);
  const managerChildren = [...managerChildrenRaw, ...coManagerLeaves];
  const hasLeafColumn = !isCompact && children.length > 1 && leafChildren.length > 0;
  const displayChildren = (hasLeafColumn ? managerChildren : children).slice().sort((a, b) => {
    const sa = a.service || 'Sans service';
    const sb = b.service || 'Sans service';
    const ia = serviceOrder.indexOf(sa);
    const ib = serviceOrder.indexOf(sb);
    if (ia !== ib) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    // Même service : managers (avec équipe) en premier, co-managers ensuite
    const aHas = childrenMap[a.id]?.length > 0 ? 0 : 1;
    const bHas = childrenMap[b.id]?.length > 0 ? 0 : 1;
    return aHas - bHas;
  });
  // Regrouper les managers de même service pour l'étiquette partagée
  const managerGroups = [];
  displayChildren.forEach(child => {
    const svc = child.service || 'Sans service';
    const lastGroup = managerGroups[managerGroups.length - 1];
    if (lastGroup && lastGroup.service === svc) {
      lastGroup.children.push(child);
    } else {
      managerGroups.push({ service: svc, children: [child] });
    }
  });
  // Le connecteur gris n'est dessiné que pour les services d'une seule personne (tronc + branches)
  const leafSvcGroups = {};
  leafChildren.forEach(e => { const s = e.service || 'Sans service'; (leafSvcGroups[s] ||= []).push(e); });
  const hasLeafConnector = hasLeafColumn && Object.values(leafSvcGroups).some(g => g.length === 1);

  const lineColor = isModernStyle ? '#94A3B8' : 'hsl(var(--border))';
  // border color of the team group box — slightly darker than line
  const { border: groupBorderColor } = getDepthColor(depth + 1, depthColors);

  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); };
  const handleDragLeave = (e) => { e.stopPropagation(); setIsDragOver(false); };
  const handleDrop = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); onDrop(e, employee); };

  return (
    <div className="flex flex-col items-center">
      {sideCards.length > 0 ? (
        <div className="relative flex flex-col items-center">
          <div className={`transition-opacity duration-150 ${opacityClass}`}>
            {children.length > 0 && employee.service && employee.service !== parentService && !isCompact && (
              <div className="rounded-full px-3 py-1 mb-1 text-center text-[10px] font-bold text-white whitespace-nowrap"
                style={{ backgroundColor: getServiceColor(employee.service).bg }}>
                {employee.service}
              </div>
            )}
            <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} data-match={isHighlighted ? 'true' : undefined}>
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
          </div>
          {/* Cartes latérales : positionnées à droite du directeur, sans lien avec la hiérarchie */}
          <div className="absolute top-0 left-full ml-20 flex gap-4 items-start">
            {sideCards.map(e => {
              const svc = getServiceColor(e.service);
              return (
                <div key={e.id} className={`flex flex-col items-center transition-opacity duration-150 ${visibleIds && searchTerm && !visibleIds.has(e.id) ? 'opacity-20' : 'opacity-100'}`} data-match={matchesSearch(e, searchTerm) ? 'true' : undefined}>
                  {e.service && (
                    <div className="rounded-full px-3 py-1 mb-1 text-center text-[10px] font-bold text-white whitespace-nowrap"
                      style={{ backgroundColor: svc.bg }}>
                      {e.service}
                    </div>
                  )}
                  <CardComponent
                    employee={e}
                    onSelect={onSelect}
                    onFocus={onFocus}
                    hasChildren={false}
                    expanded={false}
                    onToggle={() => {}}
                    onDragStart={onDragStart}
                    isDragOver={false}
                    isHighlighted={matchesSearch(e, searchTerm)}
                    color={cardColor}
                    anomalies={showAnomalies ? getAnomalies(e, depth) : []}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className={`transition-opacity duration-150 ${opacityClass}`}>
          {children.length > 0 && employee.service && employee.service !== parentService && !isCompact && (
            <div className="rounded-full px-3 py-1 mb-1 text-center text-[10px] font-bold text-white whitespace-nowrap"
              style={{ backgroundColor: getServiceColor(employee.service).bg }}>
              {employee.service}
            </div>
          )}
          <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} data-match={isHighlighted ? 'true' : undefined}>
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
        </div>
      )}

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
                  depthColors={depthColors}
                  serviceSortMode={serviceSortMode}
                  serviceOrder={serviceOrder}
                  onServiceReorder={onServiceReorder}
                  filterMatchIds={filterMatchIds}
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
                {leafChildren.length > 0 && children.length > 1 && (
                  <div className="flex flex-col items-start">
                    {hasLeafConnector && (
                      <div className="flex w-full h-4">
                        <div className="w-px" style={{ backgroundColor: lineColor }} />
                        <div className="flex-1" style={{ borderTop: `1px solid ${lineColor}` }} />
                      </div>
                    )}
                    <OrgLeafList
                      employees={leafChildren}
                      color={getDepthColor(depth + 1, depthColors)}
                      onSelect={onSelect}
                      onDragStart={onDragStart}
                      onDrop={onDrop}
                      searchTerm={searchTerm}
                      getAnomalies={showAnomalies ? getAnomalies : null}
                      depth={depth + 1}
                      parentService={employee.service || null}
                      serviceSortMode={serviceSortMode}
                      serviceOrder={serviceOrder}
                      onServiceReorder={onServiceReorder}
                      visibleIds={visibleIds}
                      filterMatchIds={filterMatchIds}
                    />
                  </div>
                )}
                {managerGroups.map((group, gi) => {
                  const isMulti = group.children.length > 1;
                  const showLeftBar = (managerGroups.length > 1 || hasLeafConnector) && (gi > 0 || hasLeafConnector);
                  const showRightBar = managerGroups.length > 1 && gi < managerGroups.length - 1;
                  if (!isMulti) {
                    const child = group.children[0];
                    return (
                      <div key={child.id} className="flex flex-col items-center">
                        <div className="flex w-full h-4">
                          <div className="flex-1" style={{ borderTop: showLeftBar ? `1px solid ${lineColor}` : 'none' }} />
                          <div className="w-px" style={{ backgroundColor: lineColor }} />
                          <div className="flex-1" style={{ borderTop: showRightBar ? `1px solid ${lineColor}` : 'none' }} />
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
                          depthColors={depthColors}
                          parentService={employee.service || null}
                          serviceSortMode={serviceSortMode}
                          serviceOrder={serviceOrder}
                          onServiceReorder={onServiceReorder}
                          filterMatchIds={filterMatchIds}
                        />
                      </div>
                    );
                  }
                  const svcColor = getServiceColor(group.service);
                  const showSharedLabel = group.service !== 'Sans service' && group.service !== (employee.service || null);
                  return (
                    <div key={gi} className="flex flex-col items-center">
                      <div className="flex w-full h-4">
                        <div className="flex-1" style={{ borderTop: showLeftBar ? `1px solid ${lineColor}` : 'none' }} />
                        <div className="w-px" style={{ backgroundColor: lineColor }} />
                        <div className="flex-1" style={{ borderTop: showRightBar ? `1px solid ${lineColor}` : 'none' }} />
                      </div>
                      {showSharedLabel && (
                        <>
                          <div className="rounded-full px-3 py-1 text-center text-[10px] font-bold text-white whitespace-nowrap"
                            style={{ backgroundColor: svcColor.bg }}>
                            {group.service}
                          </div>
                          <div className="w-px h-3" style={{ backgroundColor: lineColor }} />
                        </>
                      )}
                      <div className="flex items-start gap-4">
                        {group.children.map((child, ci) => (
                          <div key={child.id} className="flex flex-col items-center">
                            <div className="flex w-full h-4">
                              <div className="flex-1" style={{ borderTop: ci > 0 ? `1px solid ${lineColor}` : 'none' }} />
                              <div className="w-px" style={{ backgroundColor: lineColor }} />
                              <div className="flex-1" style={{ borderTop: ci < group.children.length - 1 ? `1px solid ${lineColor}` : 'none' }} />
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
                              depthColors={depthColors}
                              parentService={group.service}
                              serviceSortMode={serviceSortMode}
                              serviceOrder={serviceOrder}
                              onServiceReorder={onServiceReorder}
                              filterMatchIds={filterMatchIds}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}