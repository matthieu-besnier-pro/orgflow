export default function OrgNode({ employee, onSelect }) {
  const initials = `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`.toUpperCase();

  const statusColors = {
    'Actif': 'border-emerald-300',
    'En recrutement': 'border-yellow-400',
    'Apprenti': 'border-blue-300',
    'Alternant': 'border-purple-300',
    'Départ': 'border-red-300',
  };

  return (
    <div
      className={`bg-white rounded-xl border-2 ${statusColors[employee.status] || 'border-border'} shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer p-3 flex flex-col items-center text-center w-36`}
      onClick={() => onSelect && onSelect(employee)}
    >
      {employee.photo_url ? (
        <img src={employee.photo_url} alt={initials} className="w-12 h-12 rounded-full object-cover mb-2" />
      ) : (
        <div className="w-12 h-12 rounded-full bg-lavender flex items-center justify-center mb-2 flex-shrink-0">
          <span className="text-sm font-bold text-primary">{initials}</span>
        </div>
      )}
      <p className="text-xs font-semibold text-foreground leading-tight">{employee.first_name} {employee.last_name}</p>
      <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{employee.position}</p>
      {employee.email && (
        <p className="text-xs text-primary mt-1 truncate w-full" style={{fontSize:'9px'}}>{employee.email}</p>
      )}
      {employee.phone && (
        <p className="text-xs text-muted-foreground" style={{fontSize:'9px'}}>{employee.phone}</p>
      )}
    </div>
  );
}