import { X, Mail, Phone, Building2, BadgeCheck, UserCircle2, MapPin, Calendar, Layers } from 'lucide-react';

const STATUS_LABEL = {
  'Actif': 'Actif',
  'En recrutement': 'En recrutement',
  'Apprenti': 'Apprenti',
  'Alternant': 'Alternant',
  'Départ': 'Départ',
};

const STATUS_DOT = {
  'Actif': 'bg-emerald-400',
  'En recrutement': 'bg-yellow-400',
  'Apprenti': 'bg-blue-400',
  'Alternant': 'bg-purple-400',
  'Départ': 'bg-red-400',
};

function InfoRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
      <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <span className="text-xs text-muted-foreground w-28 flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-foreground flex-1 min-w-0 break-words">{children}</span>
    </div>
  );
}

export default function PublicEmployeeModal({ employee, employees, agencies = [], onClose }) {
  if (!employee) return null;
  const initials = `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`.toUpperCase();
  const manager = employee.manager_id ? employees.find(e => e.id === employee.manager_id) : null;
  const dot = STATUS_DOT[employee.status] || 'bg-emerald-400';
  const agency = employee.agency_id ? agencies.find(a => a.id === employee.agency_id) : null;
  const directReports = employees.filter(e => e.manager_id === employee.id);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-fade-in" onClick={e => e.stopPropagation()}>
        {/* Header avec photo */}
        <div className="relative bg-gradient-to-br from-primary to-primary/80 px-6 pt-6 pb-5">
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              {employee.photo_url ? (
                <img src={employee.photo_url} alt={initials} className="w-20 h-20 rounded-2xl object-cover border-2 border-white/80 shadow-lg" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-white/25 flex items-center justify-center border-2 border-white/60 shadow-lg">
                  <span className="text-2xl font-bold text-white">{initials}</span>
                </div>
              )}
              <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${dot}`} />
            </div>
            <div className="min-w-0">
              <h2 className="font-heading font-bold text-white text-lg leading-tight">{employee.first_name} {employee.last_name}</h2>
              <p className="text-white/80 text-sm mt-0.5">{employee.position}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {employee.service && (
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/20 text-white text-xs font-medium">
                    {employee.service}
                  </span>
                )}
                {employee.is_group_support && (
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/20 text-white text-xs font-medium">
                    Support Groupe
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Détails */}
        <div className="px-6 py-2">
          {manager && (
            <InfoRow icon={UserCircle2} label="Manager direct">
              {manager.first_name} {manager.last_name}
            </InfoRow>
          )}
          {directReports.length > 0 && (
            <InfoRow icon={Building2} label="Équipe directe">
              {directReports.length} collaborateur{directReports.length > 1 ? 's' : ''}
            </InfoRow>
          )}
          {employee.status && (
            <InfoRow icon={BadgeCheck} label="Statut">
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${dot}`} />
                {STATUS_LABEL[employee.status] || employee.status}
              </span>
            </InfoRow>
          )}
          {agency && (
            <InfoRow icon={Building2} label="Agence">
              {agency.name}{agency.city ? ` — ${agency.city}` : ''}
            </InfoRow>
          )}
          {employee.zone && (
            <InfoRow icon={MapPin} label="Zone">
              {employee.zone}
            </InfoRow>
          )}
          {employee.ancienne_entite && (
            <InfoRow icon={Layers} label="Ancienne entité">
              {employee.ancienne_entite}
            </InfoRow>
          )}
          {employee.hire_date && (
            <InfoRow icon={Calendar} label="Date d'entrée">
              {new Date(employee.hire_date).toLocaleDateString('fr-FR')}
            </InfoRow>
          )}
          {employee.email && (
            <InfoRow icon={Mail} label="Email">
              <span className="truncate">{employee.email}</span>
            </InfoRow>
          )}
          {employee.phone && (
            <InfoRow icon={Phone} label="Téléphone">
              {employee.phone}
            </InfoRow>
          )}
        </div>
      </div>
    </div>
  );
}