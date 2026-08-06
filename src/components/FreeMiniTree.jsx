const STATUS_DOT = {
  'Actif': 'bg-emerald-500',
  'En recrutement': 'bg-yellow-500',
  'Apprenti': 'bg-blue-500',
  'Alternant': 'bg-purple-500',
  'Départ': 'bg-red-500',
};

function Avatar({ employee, color }) {
  const initials = `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`.toUpperCase();
  return (
    <div className="relative flex-shrink-0">
      {employee.photo_url ? (
        <img src={employee.photo_url} alt={initials} className="w-7 h-7 rounded-full object-cover border border-white shadow-sm" />
      ) : (
        <div className="w-7 h-7 rounded-full flex items-center justify-center border border-white shadow-sm"
          style={{ backgroundColor: `${color.bg}22` }}>
          <span className="text-[9px] font-bold" style={{ color: color.bg }}>{initials}</span>
        </div>
      )}
      <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${STATUS_DOT[employee.status] || 'bg-gray-300'}`} />
    </div>
  );
}

// Arborescence miniature (façon vue hiérarchique) à l'intérieur d'un bloc de service
export default function FreeMiniTree({ employee, childrenMap, onSelect, searchTerm, color, depth = 0 }) {
  const children = childrenMap[employee.id] || [];
  const isManager = children.length > 0;
  const highlighted = searchTerm && `${employee.first_name} ${employee.last_name} ${employee.position || ''}`.toLowerCase().includes(searchTerm);

  return (
    <div>
      <div
        onClick={() => onSelect(employee)}
        className={`relative flex items-center gap-1.5 px-1.5 py-1 rounded-md cursor-pointer hover:bg-secondary/60 ${highlighted ? 'bg-amber-100' : ''}`}
        style={{ backgroundColor: !highlighted && isManager ? color.light : undefined }}
      >
        <Avatar employee={employee} color={color} />
        <div className="min-w-0 flex-1">
          <p className={`text-[10px] truncate ${isManager ? 'font-bold' : 'font-semibold'} text-foreground`}>
            {employee.last_name} {employee.first_name}
          </p>
          <p className="text-[9px] text-muted-foreground truncate">{employee.position}</p>
        </div>
      </div>

      {isManager && (
        <div className="relative ml-2">
          <span className="absolute left-0 top-0 bottom-1 w-px" style={{ backgroundColor: `${color.bg}44` }} />
          <div className="pl-2 space-y-0.5 pt-0.5">
            {children.map(c => (
              <FreeMiniTree
                key={c.id}
                employee={c}
                childrenMap={childrenMap}
                onSelect={onSelect}
                searchTerm={searchTerm}
                color={color}
                depth={depth + 1}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}