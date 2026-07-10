import { Mail, Phone, ChevronRight, Trash2, Building2 } from 'lucide-react';
import { getAssignmentLabel } from '@/components/AssignmentSelector';

const statusColors = {
  'Actif': 'bg-mint text-emerald-700',
  'En recrutement': 'bg-yellow-100 text-yellow-700',
  'Apprenti': 'bg-blue-100 text-blue-700',
  'Alternant': 'bg-purple-100 text-purple-700',
  'Départ': 'bg-red-100 text-red-600',
};

export default function EmployeeCard({ employee, compact = false, onClick, onDelete, isHR, agencies = [] }) {
  const initials = `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`.toUpperCase();

  if (compact) {
    return (
      <div
        onClick={onClick}
        className="flex items-center gap-3 p-3 bg-white rounded-xl border border-border hover:border-lavender-dark hover:shadow-md transition-all duration-200 cursor-pointer group"
      >
        <div className="relative flex-shrink-0">
          {employee.photo_url ? (
            <img src={employee.photo_url} alt={initials} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-lavender flex items-center justify-center">
              <span className="text-xs font-semibold text-primary">{initials}</span>
            </div>
          )}
          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${employee.status === 'Actif' ? 'bg-emerald-400' : employee.status === 'Départ' ? 'bg-red-400' : 'bg-yellow-400'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{employee.first_name} {employee.last_name}</p>
          <p className="text-xs text-muted-foreground truncate">{employee.position}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-border p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
    >
      <div className="flex items-start gap-4">
        <div className="relative flex-shrink-0">
          {employee.photo_url ? (
            <img src={employee.photo_url} alt={initials} className="w-16 h-16 rounded-2xl object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-lavender flex items-center justify-center">
              <span className="text-xl font-bold text-primary">{initials}</span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-heading font-semibold text-foreground text-base">{employee.first_name} {employee.last_name}</p>
              <p className="text-sm text-muted-foreground">{employee.position}</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[employee.status] || 'bg-gray-100 text-gray-600'}`}>
                {employee.status || 'Actif'}
              </span>
              {isHR && onDelete && (
                <button
                  onClick={e => { e.stopPropagation(); if (confirm(`Supprimer ${employee.first_name} ${employee.last_name} ?`)) onDelete(employee.id); }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Building2 className="w-3.5 h-3.5" />
              <span className="truncate">{getAssignmentLabel(employee, agencies)}</span>
            </div>
            {employee.email && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Mail className="w-3.5 h-3.5" />
                <span className="truncate">{employee.email}</span>
              </div>
            )}
            {employee.phone && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Phone className="w-3.5 h-3.5" />
                <span>{employee.phone}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}