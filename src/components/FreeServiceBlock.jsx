import { GripVertical, CornerLeftUp } from 'lucide-react';
import { getServiceColor } from '@/lib/serviceColors';
import FreeMiniTree from '@/components/FreeMiniTree';

// Bloc de service positionnable librement sur le canevas A3
// Contenu affiché en arborescence hiérarchique (manager puis son équipe)
export default function FreeServiceBlock({ service, employees, x, y, onDragStart, onSelect, searchTerm, allEmployees = [] }) {
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
      {/* Rattachement hiérarchique : managers extérieurs au bloc */}
      {(() => {
        const externals = [...new Set(roots.map(r => r.manager_id).filter(id => id && !ids.has(id)))]
          .map(id => allEmployees.find(e => e.id === id))
          .filter(Boolean);
        if (externals.length === 0) return null;
        return (
          <div className="px-2.5 py-1 border-b flex flex-col gap-0.5" style={{ backgroundColor: `${color.bg}0f`, borderColor: `${color.bg}33` }}>
            {externals.map(m => (
              <div key={m.id} onClick={() => onSelect(m)} className="flex items-center gap-1 cursor-pointer hover:opacity-70">
                <CornerLeftUp className="w-3 h-3 flex-shrink-0" style={{ color: color.bg }} />
                <p className="text-[9px] truncate">
                  <span className="text-muted-foreground">Rattaché à </span>
                  <span className="font-semibold text-foreground">{m.last_name} {m.first_name}</span>
                  {m.service && <span className="text-muted-foreground"> · {m.service}</span>}
                </p>
              </div>
            ))}
          </div>
        );
      })()}
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