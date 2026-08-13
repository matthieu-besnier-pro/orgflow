import { useState } from 'react';
import { AlertTriangle, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { getServiceColor } from '@/lib/serviceColors';

const STATUS_DOT = {
  'Actif': 'bg-emerald-400',
  'En recrutement': 'bg-yellow-400',
  'Apprenti': 'bg-blue-400',
  'Alternant': 'bg-purple-400',
  'Départ': 'bg-red-400',
};

function LeafCard({ employee, color, onSelect, onDragStart, onDrop, isHighlighted, anomalies, opacityClass = 'opacity-100' }) {
  const [over, setOver] = useState(false);
  const [isFileDrag, setIsFileDrag] = useState(false);
  const initials = `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`.toUpperCase();
  const isApprenti = employee.status === 'Apprenti' || employee.status === 'Alternant';
  const apprentiDot = employee.status === 'Apprenti' ? 'bg-blue-400' : 'bg-purple-400';
  const svc = getServiceColor(employee.service);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, employee)}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer.types?.includes('Files')) setIsFileDrag(true); setOver(true); }}
      onDragLeave={() => { setOver(false); setIsFileDrag(false); }}
      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setOver(false); setIsFileDrag(false); onDrop(e, employee); }}
      onClick={() => onSelect(employee)}
      style={{ backgroundColor: '#ffffff', borderLeft: `5px solid ${svc.bg}`, boxShadow: '0 4px 14px rgba(15,23,42,0.10)' }}
      className={`relative rounded-xl border border-border cursor-grab active:cursor-grabbing active:opacity-80 hover:shadow-xl hover:-translate-y-1 hover:z-50 transition-all duration-200 flex items-center gap-2.5 px-3 py-2.5 min-w-[13rem] w-full ${opacityClass}
        ${over ? 'ring-2 ring-white ring-offset-2 scale-105' : ''}
        ${isHighlighted ? 'ring-4 ring-amber-400 ring-offset-2 scale-105 shadow-[0_0_24px_rgba(251,191,36,0.55)] z-10' : ''}`}
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
      <div className="flex-1">
        <p className="text-xs font-bold text-foreground leading-tight whitespace-nowrap">{employee.first_name}</p>
        <p className="text-xs font-bold text-foreground leading-tight whitespace-nowrap">{employee.last_name}</p>
        <p className="text-muted-foreground leading-snug max-w-[9rem] break-words" style={{ fontSize: '9px' }}>{employee.position}</p>
      </div>
      {isFileDrag && <div className="absolute inset-0 rounded-xl bg-emerald-400/30 border-2 border-dashed border-emerald-500 flex items-center justify-center pointer-events-none z-50"><span className="text-[10px] font-bold text-emerald-700 bg-white/90 px-2 py-0.5 rounded-full whitespace-nowrap">📷 Déposer la photo</span></div>}
    </div>
  );
}

function ServiceGroup({ s, groups, parentService, onSelect, onDragStart, onDrop, isMatch, getAnomalies, depth, draggable = false, getOpacityClass }) {
  const svc = getServiceColor(s);
  return (
    <div className="flex flex-col gap-2 w-max items-stretch">
      {s !== parentService && (
        <div className="rounded-full px-3 py-1 text-center text-[10px] font-bold text-white whitespace-nowrap w-full flex items-center justify-center gap-1"
          style={{ backgroundColor: svc.bg }}>
          {draggable && <GripVertical className="w-2.5 h-2.5 opacity-60" />}
          {s}
        </div>
      )}
      {groups[s].map(e => (
        <LeafCard
          key={e.id}
          employee={e}
          onSelect={onSelect}
          onDragStart={onDragStart}
          onDrop={onDrop}
          isHighlighted={isMatch(e)}
          anomalies={getAnomalies ? getAnomalies(e, depth) : []}
          opacityClass={getOpacityClass ? getOpacityClass(e) : 'opacity-100'}
        />
      ))}
    </div>
  );
}

export default function OrgLeafList({ employees, onSelect, onDragStart, onDrop, searchTerm, getAnomalies, depth, parentService = null, color, serviceSortMode = 'count', serviceOrder = [], onServiceReorder = null, visibleIds = null, filterMatchIds = null }) {
  const lineColor = color?.border || '#94A3B8';
  // Grouper par service
  const groups = {};
  employees.forEach(e => {
    const key = e.service || 'Sans service';
    (groups[key] ||= []).push(e);
  });

  // Tri des services selon l'ordre global calculé dans OrgChart
  const services = Object.keys(groups).sort((a, b) => {
    const ia = serviceOrder.indexOf(a);
    const ib = serviceOrder.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  // Services de plusieurs personnes → colonne dédiée avec en-tête
  // Services d'une seule personne → empilés dans une colonne unique, étiquette conservée
  const multiServices = services.filter(s => groups[s].length >= 2);
  const singleServices = services.filter(s => groups[s].length === 1);

  const isMatch = (e) => !!searchTerm && `${e.first_name} ${e.last_name} ${e.position || ''} ${e.service || ''}`.toLowerCase().includes(searchTerm);
  const getOpacityClass = (e) => {
    if (visibleIds && !visibleIds.has(e.id)) return 'opacity-20';
    if (filterMatchIds && !filterMatchIds.has(e.id)) return 'opacity-40';
    return 'opacity-100';
  };

  const isDraggable = serviceSortMode === 'custom' && onServiceReorder && multiServices.length > 1;

  const handleDragEnd = (result) => {
    if (!result.destination || result.destination.index === result.source.index) return;
    const newOrder = [...multiServices];
    const [moved] = newOrder.splice(result.source.index, 1);
    newOrder.splice(result.destination.index, 0, moved);
    onServiceReorder([...newOrder, ...singleServices]);
  };

  return (
    <div className="flex items-start gap-4">
      {isDraggable ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="services" direction="horizontal">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="flex items-start gap-4">
                {multiServices.map((s, index) => (
                  <Draggable key={s} draggableId={s} index={index}>
                    {(prov, snapshot) => (
                      <div
                        ref={prov.innerRef}
                        {...prov.draggableProps}
                        {...prov.dragHandleProps}
                        style={prov.draggableProps.style}
                        className={`flex flex-col gap-2 w-max items-stretch ${snapshot.isDragging ? 'shadow-lg ring-2 ring-primary opacity-90' : ''}`}
                      >
                        <ServiceGroup s={s} groups={groups} parentService={parentService} onSelect={onSelect} onDragStart={onDragStart} onDrop={onDrop} isMatch={isMatch} getAnomalies={getAnomalies} depth={depth} draggable getOpacityClass={getOpacityClass} />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      ) : (
        multiServices.map(s => (
          <ServiceGroup key={s} s={s} groups={groups} parentService={parentService} onSelect={onSelect} onDragStart={onDragStart} onDrop={onDrop} isMatch={isMatch} getAnomalies={getAnomalies} depth={depth} getOpacityClass={getOpacityClass} />
        ))
      )}
      {singleServices.length > 0 && (
        <div className="relative flex flex-col w-max">
          {/* Tronc vertical continu reliant les services à la direction */}
          <div className="absolute left-0 top-0 bottom-0 w-px" style={{ backgroundColor: lineColor }} />
          {singleServices.map((s, idx) => {
            const svc = getServiceColor(s);
            return (
              <div key={s} className={`relative pl-7 ${idx > 0 ? 'mt-10' : ''}`}>
                {/* Branche horizontale depuis le tronc vers le service */}
                <div className="absolute left-0 top-3 w-7 h-px" style={{ backgroundColor: lineColor }} />
                <div className="flex flex-col gap-1.5 w-max items-stretch">
                  {s !== parentService && (
                    <div className="rounded-full px-3 py-1 text-center text-[10px] font-bold text-white whitespace-nowrap w-max"
                      style={{ backgroundColor: svc.bg }}>
                      {s}
                    </div>
                  )}
                  {groups[s].map(e => (
                    <LeafCard
                      key={e.id}
                      employee={e}
                      onSelect={onSelect}
                      onDragStart={onDragStart}
                      onDrop={onDrop}
                      isHighlighted={isMatch(e)}
                      anomalies={getAnomalies ? getAnomalies(e, depth) : []}
                      opacityClass={getOpacityClass(e)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}