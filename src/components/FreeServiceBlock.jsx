import FreeMiniTree from '@/components/FreeMiniTree';
import { getServiceColor } from '@/lib/serviceColors';

const BLOCK_W = 250;

export default function FreeServiceBlock({ service, employees, x, y, onDragStart, onSelect, searchTerm }) {
  const color = getServiceColor(service);

  // Hiérarchie interne au bloc
  const ids = new Set(employees.map(e => e.id));
  const childrenMap = {};
  employees.forEach(e => {
    if (e.manager_id && ids.has(e.manager_id)) {
      (childrenMap[e.manager_id] ||= []).push(e);
    }
  });
  const roots = employees
    .filter(e => !e.manager_id || !ids.has(e.manager_id))
    .sort((a, b) => (childrenMap[b.id]?.length || 0) - (childrenMap[a.id]?.length || 0));

  return (
    <div
      className="absolute rounded-lg border bg-white shadow-sm overflow-hidden"
      style={{ left: x, top: y, width: BLOCK_W, borderColor: color.bg, zIndex: 1 }}
    >
      <div
        onMouseDown={(e) => onDragStart(e, service)}
        className="flex items-center justify-between px-2.5 py-1.5 cursor-move"
        style={{ backgroundColor: color.bg }}
      >
        <p className="text-[11px] font-bold text-white truncate">{service}</p>
        <span className="text-[9px] font-semibold text-white/80">{employees.length}</span>
      </div>
      <div className="py-1" style={{ backgroundColor: color.light }}>
        {roots.map(e => (
          <FreeMiniTree
            key={e.id}
            employee={e}
            childrenMap={childrenMap}
            onSelect={onSelect}
            searchTerm={searchTerm}
          />
        ))}
      </div>
    </div>
  );
}