import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { getServiceColor } from '@/lib/serviceColors';

const STATUS_DOT = {
  'Actif': 'bg-emerald-400',
  'En recrutement': 'bg-yellow-400',
  'Apprenti': 'bg-blue-400',
  'Alternant': 'bg-purple-400',
  'Départ': 'bg-red-400',
};

function LeafCard({ employee, color, onSelect, onDragStart, onDrop, isHighlighted, anomalies, serviceLabel }) {
  const [over, setOver] = useState(false);
  const initials = `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`.toUpperCase();
  const dot = STATUS_DOT[employee.status] || 'bg-emerald-400';
  const svc = getServiceColor(employee.service);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, employee)}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setOver(false); onDrop(e, employee); }}
      onClick={() => onSelect(employee)}
      style={{ backgroundColor: '#ffffff', borderLeft: `5px solid ${svc.bg}`, boxShadow: '0 4px 14px rgba(15,23,42,0.10)' }}
      className={`relative rounded-xl border border-border cursor-grab active:cursor-grabbing active:opacity-80 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex items-center gap-2.5 px-3 py-2.5 min-w-[13rem] w-full
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
        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${dot}`} />
      </div>
      <div className="flex-1">
        <p className="text-xs font-bold text-foreground leading-tight whitespace-nowrap">{employee.first_name}</p>
        <p className="text-xs font-bold text-foreground leading-tight whitespace-nowrap">{employee.last_name}</p>
        <p className="text-muted-foreground leading-snug max-w-[9rem] break-words" style={{ fontSize: '9px' }}>{employee.position}</p>
        {serviceLabel && (
          <span className="inline-block mt-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold text-white" style={{ backgroundColor: svc.bg }}>
            {serviceLabel}
          </span>
        )}
      </div>
    </div>
  );
}

export default function OrgLeafList({ employees, onSelect, onDragStart, onDrop, searchTerm, getAnomalies, depth, parentService = null }) {
  // Grouper par service
  const groups = {};
  employees.forEach(e => {
    const key = e.service || 'Sans service';
    (groups[key] ||= []).push(e);
  });

  const services = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length);

  // Services de plusieurs personnes → colonne dédiée avec en-tête
  // Services d'une seule personne → regroupés dans une colonne unique
  const multiServices = services.filter(s => groups[s].length >= 2);
  const singleEmployees = services.filter(s => groups[s].length === 1).flatMap(s => groups[s]);

  const isMatch = (e) => !!searchTerm && `${e.first_name} ${e.last_name} ${e.position || ''} ${e.service || ''}`.toLowerCase().includes(searchTerm);

  return (
    <div className="flex items-start gap-4">
      {multiServices.map(s => {
        const svc = getServiceColor(s);
        return (
          <div key={s} className="flex flex-col gap-2 w-max items-stretch">
            {s !== parentService && (
              <div className="rounded-full px-3 py-1 text-center text-[10px] font-bold text-white whitespace-nowrap w-full"
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
              />
            ))}
          </div>
        );
      })}
      {singleEmployees.length > 0 && (
        <div className="flex flex-col gap-2 w-max items-stretch">
          {singleEmployees.length > 1 && (
            <div className="rounded-full px-3 py-1 text-center text-[10px] font-bold text-muted-foreground whitespace-nowrap w-full bg-secondary">
              Autres services
            </div>
          )}
          {singleEmployees.map(e => (
            <LeafCard
              key={e.id}
              employee={e}
              onSelect={onSelect}
              onDragStart={onDragStart}
              onDrop={onDrop}
              isHighlighted={isMatch(e)}
              anomalies={getAnomalies ? getAnomalies(e, depth) : []}
              serviceLabel={e.service || 'Sans service'}
            />
          ))}
        </div>
      )}
    </div>
  );
}