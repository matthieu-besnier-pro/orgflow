import { useState } from 'react';
import { ChevronDown, ChevronRight, Mail, Phone } from 'lucide-react';

export default function OrgNode({ employee, subordinates = [], allEmployees = [], depth = 0, onSelect }) {
  const [collapsed, setCollapsed] = useState(depth > 1);
  const initials = `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`.toUpperCase();
  const hasChildren = subordinates.length > 0;

  const statusRing = {
    'Actif': 'ring-emerald-300',
    'En recrutement': 'ring-yellow-300',
    'Apprenti': 'ring-blue-300',
    'Alternant': 'ring-purple-300',
    'Départ': 'ring-red-300',
  };

  return (
    <div className="flex flex-col items-center">
      {/* Node Card */}
      <div
        className={`relative bg-white rounded-2xl border border-border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group settle-animation ${depth === 0 ? 'w-52' : depth === 1 ? 'w-44' : 'w-40'}`}
        onClick={() => onSelect && onSelect(employee)}
        style={{ minWidth: depth === 0 ? '208px' : depth === 1 ? '176px' : '160px' }}
      >
        <div className="p-4">
          {/* Avatar */}
          <div className="flex justify-center mb-3">
            <div className={`ring-2 rounded-full ${statusRing[employee.status] || 'ring-gray-200'} p-0.5`}>
              {employee.photo_url ? (
                <img
                  src={employee.photo_url}
                  alt={initials}
                  className={`rounded-full object-cover ${depth === 0 ? 'w-14 h-14' : 'w-10 h-10'}`}
                />
              ) : (
                <div className={`rounded-full bg-lavender flex items-center justify-center ${depth === 0 ? 'w-14 h-14' : 'w-10 h-10'}`}>
                  <span className={`font-bold text-primary ${depth === 0 ? 'text-lg' : 'text-sm'}`}>{initials}</span>
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="text-center">
            <p className={`font-heading font-semibold text-foreground leading-tight ${depth === 0 ? 'text-sm' : 'text-xs'}`}>
              {employee.first_name} {employee.last_name}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{employee.position}</p>
          </div>

          {/* Contact on hover */}
          {employee.email && (
            <div className="mt-2 overflow-hidden max-h-0 group-hover:max-h-10 transition-all duration-200">
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <Mail className="w-3 h-3" />
                <span className="truncate text-xs" style={{fontSize: '10px'}}>{employee.email}</span>
              </div>
            </div>
          )}
        </div>

        {/* Expand toggle */}
        {hasChildren && (
          <button
            onClick={(e) => { e.stopPropagation(); setCollapsed(!collapsed); }}
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:scale-110 transition-transform z-10"
          >
            {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>

      {/* Children */}
      {hasChildren && !collapsed && (
        <div className="relative mt-6">
          {/* Vertical connector from parent */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-border -translate-y-4" />

          {subordinates.length > 1 && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-border" />
          )}

          <div className="flex gap-4 items-start">
            {subordinates.map((sub) => {
              const subSubs = allEmployees.filter(e => e.manager_id === sub.id);
              return (
                <div key={sub.id} className="relative flex flex-col items-center pt-4">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-border" />
                  <OrgNode
                    employee={sub}
                    subordinates={subSubs}
                    allEmployees={allEmployees}
                    depth={depth + 1}
                    onSelect={onSelect}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}