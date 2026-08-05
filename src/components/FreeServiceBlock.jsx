import { GripVertical } from 'lucide-react';
import { getServiceColor } from '@/lib/serviceColors';

const STATUS_DOT = {
  'Actif': 'bg-emerald-500',
  'En recrutement': 'bg-yellow-500',
  'Apprenti': 'bg-blue-500',
  'Alternant': 'bg-purple-500',
  'Départ': 'bg-red-500',
};

// Bloc de service positionnable librement sur le canevas A3
export default function FreeServiceBlock({ service, employees, x, y, onDragStart, onSelect, searchTerm }) {
  const color = getServiceColor(service);

  return (
    <div
      className="absolute rounded-xl bg-white shadow-md border overflow-hidden select-none"
      style={{ left: x, top: y, width: 230, borderColor: `${color.bg}44` }}
    >
      <div
        onMouseDown={(e) => onDragStart(e, service)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 cursor-grab active:cursor-grabbing"
        style={{ backgroundColor: color.bg }}
      >
        <GripVertical className="w-3.5 h-3.5 text-white/70 flex-shrink-0" />
        <p className="text-[11px] font-bold text-white uppercase truncate flex-1">{service}</p>
        <span className="text-[10px] font-semibold text-white/80">{employees.length}</span>
      </div>
      <div className="divide-y" style={{ borderColor: `${color.bg}1a` }}>
        {employees.map(e => {
          const highlighted = searchTerm && `${e.first_name} ${e.last_name} ${e.position || ''}`.toLowerCase().includes(searchTerm);
          return (
            <div
              key={e.id}
              onClick={() => onSelect(e)}
              className={`px-2.5 py-1 cursor-pointer hover:bg-secondary/60 ${highlighted ? 'bg-amber-100' : ''}`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[e.status] || 'bg-gray-300'}`} />
                <p className="text-[10px] font-semibold text-foreground truncate">{e.last_name} {e.first_name}</p>
              </div>
              <p className="text-[9px] text-muted-foreground truncate pl-3">{e.position}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}