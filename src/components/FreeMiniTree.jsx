const STATUS_COLORS = {
  'Actif': '#16a34a',
  'En recrutement': '#eab308',
  'Apprenti': '#3b82f6',
  'Alternant': '#a855f7',
  'Départ': '#ef4444',
};

function Avatar({ employee }) {
  const initials = `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`.toUpperCase();
  const dot = STATUS_COLORS[employee.status] || '#16a34a';
  return (
    <div className="relative flex-shrink-0">
      {employee.photo_url ? (
        <img loading="lazy" decoding="async" src={employee.photo_url} alt={initials} className="w-6 h-6 rounded-full object-cover" />
      ) : (
        <div className="w-6 h-6 rounded-full bg-slate-300 text-[9px] font-bold text-slate-700 flex items-center justify-center">
          {initials}
        </div>
      )}
      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white" style={{ backgroundColor: dot }} />
    </div>
  );
}

export default function FreeMiniTree({ employee, childrenMap, onSelect, searchTerm, depth = 0 }) {
  const children = childrenMap[employee.id] || [];
  const match = searchTerm && `${employee.first_name} ${employee.last_name} ${employee.position || ''}`.toLowerCase().includes(searchTerm);

  return (
    <div>
      <div
        onClick={() => onSelect?.(employee)}
        className={`flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer hover:bg-slate-50 ${match ? 'bg-yellow-100' : ''}`}
        style={{ marginLeft: depth * 12 }}
      >
        <Avatar employee={employee} />
        <div className="min-w-0">
          <p className={`text-[10px] leading-tight truncate ${children.length > 0 ? 'font-bold' : 'font-medium'} text-slate-800`}>
            {employee.first_name} {employee.last_name}
          </p>
          <p className="text-[8px] leading-tight text-slate-500 truncate">{employee.position}</p>
        </div>
      </div>
      {children.map(c => (
        <FreeMiniTree
          key={c.id}
          employee={c}
          childrenMap={childrenMap}
          onSelect={onSelect}
          searchTerm={searchTerm}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}