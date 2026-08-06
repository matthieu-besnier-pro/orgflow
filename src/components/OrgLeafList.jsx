import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

const STATUS_DOT = {
  'Actif': 'bg-emerald-400',
  'En recrutement': 'bg-yellow-400',
  'Apprenti': 'bg-blue-400',
  'Alternant': 'bg-purple-400',
  'Départ': 'bg-red-400',
};

function LeafRow({ employee, color, onSelect, onDragStart, onDrop, isHighlighted, anomalies }) {
  const [over, setOver] = useState(false);
  const initials = `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`.toUpperCase();
  const dot = STATUS_DOT[employee.status] || 'bg-emerald-400';

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, employee)}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setOver(false); onDrop(e, employee); }}
      onClick={() => onSelect(employee)}
      className={`relative flex items-center gap-2 px-2.5 py-1.5 cursor-grab active:cursor-grabbing hover:bg-black/5 transition-colors
        ${over ? 'ring-2 ring-primary ring-inset' : ''}
        ${isHighlighted ? 'bg-amber-100' : ''}`}
    >
      {anomalies.length > 0 && (
        <span title={anomalies.join(' · ')} className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center">
          <AlertTriangle className="w-2 h-2 text-amber-900" />
        </span>
      )}
      <div className="relative flex-shrink-0 pointer-events-none">
        {employee.photo_url ? (
          <img src={employee.photo_url} alt={initials} className="w-7 h-7 rounded-full object-cover" />
        ) : (
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: color.bg }}>
            <span className="text-[10px] font-bold text-white">{initials}</span>
          </div>
        )}
        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${dot}`} />
      </div>
      <div className="min-w-0 pointer-events-none">
        <p className="text-[11px] font-semibold text-foreground leading-tight truncate">
          {employee.first_name} {employee.last_name}
        </p>
        <p className="text-[9px] text-muted-foreground leading-tight truncate">{employee.position}</p>
      </div>
    </div>
  );
}

export default function OrgLeafList({ employees, color, onSelect, onDragStart, onDrop, searchTerm, getAnomalies, depth }) {
  return (
    <div
      className="rounded-xl overflow-hidden bg-white w-56"
      style={{ border: `1.5px solid ${color.bg}55` }}
    >
      <div className="px-2.5 py-1 text-[10px] font-bold text-white" style={{ backgroundColor: color.bg }}>
        {employees.length} collaborateur{employees.length > 1 ? 's' : ''}
      </div>
      <div className="divide-y divide-border">
        {employees.map(e => (
          <LeafRow
            key={e.id}
            employee={e}
            color={color}
            onSelect={onSelect}
            onDragStart={onDragStart}
            onDrop={onDrop}
            isHighlighted={!!searchTerm && `${e.first_name} ${e.last_name} ${e.position || ''} ${e.service || ''}`.toLowerCase().includes(searchTerm)}
            anomalies={getAnomalies ? getAnomalies(e, depth) : []}
          />
        ))}
      </div>
    </div>
  );
}