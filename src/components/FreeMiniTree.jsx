const STATUS_DOT = {
  'Actif': 'bg-emerald-500',
  'En recrutement': 'bg-yellow-500',
  'Apprenti': 'bg-blue-500',
  'Alternant': 'bg-purple-500',
  'Départ': 'bg-red-500',
};

// Arborescence miniature (façon vue hiérarchique) à l'intérieur d'un bloc de service
export default function FreeMiniTree({ employee, childrenMap, onSelect, searchTerm, color, depth = 0 }) {
  const children = childrenMap[employee.id] || [];
  const isManager = children.length > 0;
  const highlighted = searchTerm && `${employee.first_name} ${employee.last_name} ${employee.position || ''}`.toLowerCase().includes(searchTerm);

  return (
    <div>
      <div
        onClick={() => onSelect(employee)}
        className={`relative flex items-start gap-1.5 px-1.5 py-1 rounded-md cursor-pointer hover:bg-secondary/60 ${highlighted ? 'bg-amber-100' : ''}`}
        style={{ marginLeft: depth * 12, backgroundColor: !highlighted && isManager && depth === 0 ? `${color.light}` : undefined }}
      >
        {depth > 0 && (
          <span className="absolute -left-1.5 top-2.5 w-1.5 h-px" style={{ backgroundColor: `${color.bg}66` }} />
        )}
        <span className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[employee.status] || 'bg-gray-300'}`} />
        <div className="min-w-0 flex-1">
          <p className={`text-[10px] truncate ${isManager ? 'font-bold' : 'font-semibold'} text-foreground`}>
            {employee.last_name} {employee.first_name}
          </p>
          <p className="text-[9px] text-muted-foreground truncate">{employee.position}</p>
        </div>
      </div>

      {isManager && (
        <div className="relative" style={{ marginLeft: depth * 12 + 6 }}>
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
                depth={0}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}