import { GripVertical } from 'lucide-react';
import { getServiceColor } from '@/lib/serviceColors';
import FreeMiniTree from '@/components/FreeMiniTree';

// Bloc de service positionnable librement sur le canevas A3
// Contenu affiché en arborescence hiérarchique (manager puis son équipe)
export default function FreeServiceBlock({ service, employees, x, y, onDragStart, onSelect, searchTerm }) {
  const color = getServiceColor(service);

  // Mini-hiérarchie interne au bloc
  const ids = new Set(employees.map(e => e.id));
  const childrenMap = {};
  employees.forEach(e => {
    if (e.manager_id && ids.has(e.manager_id)) {
      (childrenMap[e.manager_id] ||= []).push(e);
    }
  });
  Object.values(childrenMap).forEach(list =>
    list.sort((a, b) => (childrenMap[b.id]?.length || 0) - (childrenMap[a.id]?.length || 0))
  );
  const roots = employees
    .filter(e => !e.manager_id || !ids.has(e.manager_id))
    .sort((a, b) => (childrenMap[b.id]?.length || 0) - (childrenMap[a.id]?.length || 0));

  return (
    <div
      className="absolute rounded-xl bg-white shadow-md border overflow-hidden select-none"
      style={{ left: x, top: y, width: 250, borderColor: `${color.bg}44` }}
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
      <div className="p-1.5 space-y-1">
        {roots.map(r => (
          <FreeMiniTree
            key={r.id}
            employee={r}
            childrenMap={childrenMap}
            onSelect={onSelect}
            searchTerm={searchTerm}
            color={color}
          />
        ))}
      </div>
    </div>
  );
}