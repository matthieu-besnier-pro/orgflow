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

function LeafCard({ employee, color, onSelect, onDragStart, onDrop, isHighlighted, anomalies }) {
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
      className={`relative rounded-xl border border-border cursor-grab active:cursor-grabbing active:opacity-80 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex items-center gap-3 px-4 py-3 w-56
        ${over ? 'ring-2 ring-white ring-offset-2 scale-105' : ''}
        ${isHighlighted ? 'ring-2 ring-amber-400 ring-offset-1' : ''}`}
    >
      {anomalies.length > 0 && (
        <span title={anomalies.join(' · ')} className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center shadow">
          <AlertTriangle className="w-2.5 h-2.5 text-amber-900" />
        </span>
      )}
      <div className="relative pointer-events-none flex-shrink-0">
        {employee.photo_url ? (
          <img src={employee.photo_url} alt={initials} className="w-14 h-14 rounded-full object-cover border-2 border-white shadow" />
        ) : (
          <div className="w-14 h-14 rounded-full flex items-center justify-center border-2 border-white shadow" style={{ backgroundColor: svc.light }}>
            <span className="text-base font-bold" style={{ color: svc.bg }}>{initials}</span>
          </div>
        )}
        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${dot}`} />
      </div>
      <div className="flex-1 min-w-0 pointer-events-none">
        <p className="text-xs font-bold text-foreground leading-tight truncate">{employee.first_name}</p>
        <p className="text-xs font-bold text-foreground leading-tight truncate">{employee.last_name}</p>
        <p className="text-muted-foreground truncate" style={{ fontSize: '9px' }}>{employee.position}</p>
      </div>
    </div>
  );
}

export default function OrgLeafList({ employees, onSelect, onDragStart, onDrop, searchTerm, getAnomalies, depth }) {
  // Une colonne par service, avec l'étiquette du service en tête de colonne
  const groups = {};
  employees.forEach(e => {
    const key = e.service || 'Sans service';
    (groups[key] ||= []).push(e);
  });
  const services = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length);

  return (
    <div className="flex items-start gap-4">
      {services.map(s => {
        const svc = getServiceColor(s);
        return (
          <div key={s} className="flex flex-col gap-2">
            <div className="rounded-full px-3 py-1 text-center text-[10px] font-bold text-white truncate w-56"
              style={{ backgroundColor: svc.bg }}>
              {s}
            </div>
            {groups[s].map(e => (
              <LeafCard
                key={e.id}
                employee={e}
                onSelect={onSelect}
                onDragStart={onDragStart}
                onDrop={onDrop}
                isHighlighted={!!searchTerm && `${e.first_name} ${e.last_name} ${e.position || ''} ${e.service || ''}`.toLowerCase().includes(searchTerm)}
                anomalies={getAnomalies ? getAnomalies(e, depth) : []}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}