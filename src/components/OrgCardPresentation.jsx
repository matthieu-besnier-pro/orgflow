import { ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';

const STATUS_DOT = {
  'Actif': 'bg-emerald-400',
  'En recrutement': 'bg-yellow-400',
  'Apprenti': 'bg-blue-400',
  'Alternant': 'bg-purple-400',
  'Départ': 'bg-red-400',
};

export default function OrgCardPresentation({
  employee, onSelect, onFocus, hasChildren, expanded, onToggle,
  onDragStart, isDragOver, isHighlighted, color, anomalies = [],
}) {
  const initials = `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`.toUpperCase();
  const isApprenti = employee.status === 'Apprenti' || employee.status === 'Alternant';
  const apprentiDot = employee.status === 'Apprenti' ? 'bg-blue-400' : 'bg-purple-400';

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, employee)}
      onClick={() => onSelect(employee)}
      onDoubleClick={(e) => { e.stopPropagation(); onFocus?.(employee); }}
      title="Clic : détails — Double-clic : centrer l'organigramme sur ce manager"
      style={{
        background: `linear-gradient(160deg, ${color.bg} 0%, ${color.bg}cc 100%)`,
        boxShadow: `0 6px 18px ${color.bg}33`,
      }}
      className={`relative rounded-lg cursor-grab active:cursor-grabbing active:opacity-80 hover:shadow-2xl hover:-translate-y-1 hover:z-50 transition-all duration-200 flex flex-col items-center pt-4 pb-3 px-3 w-32 border border-white/25
        ${isDragOver ? 'ring-2 ring-white ring-offset-2 scale-105' : ''}
        ${isHighlighted ? 'ring-4 ring-amber-400 ring-offset-2 scale-105 shadow-[0_0_24px_rgba(251,191,36,0.55)] z-10' : ''}
      `}
    >
      {anomalies.length > 0 && (
        <span
          title={anomalies.join(' · ')}
          className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center shadow"
        >
          <AlertTriangle className="w-2.5 h-2.5 text-amber-900" />
        </span>
      )}

      <div className="relative mb-2">
        {employee.photo_url ? (
          <img src={employee.photo_url} alt={initials} className="w-14 h-14 rounded-md object-cover border-2 border-white/70 shadow-md pointer-events-auto cursor-pointer relative transition-transform duration-200 hover:scale-[2.2] hover:z-50" />
        ) : (
          <div className="w-14 h-14 rounded-md bg-white/20 flex items-center justify-center border-2 border-white/50 shadow-md">
            <span className="text-lg font-bold text-white">{initials}</span>
          </div>
        )}
        {isApprenti && <span className={`absolute -bottom-1 -right-1 w-2 h-2 rounded-full border border-white ${apprentiDot}`} />}
      </div>

      <div className="text-center pointer-events-none w-full">
        <p className="text-[11px] font-bold text-white leading-tight truncate">{employee.first_name}</p>
        <p className="text-[11px] font-bold text-white leading-tight truncate uppercase">{employee.last_name}</p>
        <p className="text-white/75 leading-tight mt-1 line-clamp-2" style={{ fontSize: '9px' }}>{employee.position}</p>
      </div>

      {hasChildren && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className="mt-2 w-5 h-5 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors pointer-events-auto"
        >
          {expanded ? <ChevronDown className="w-3 h-3 text-white" /> : <ChevronRight className="w-3 h-3 text-white" />}
        </button>
      )}
    </div>
  );
}