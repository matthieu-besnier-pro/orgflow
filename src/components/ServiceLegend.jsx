import { getServiceColor } from '@/lib/serviceColors';

export default function ServiceLegend({ services = [] }) {
  if (services.length === 0) return null;
  return (
    <div className="flex items-center gap-2 flex-wrap px-4 py-2 bg-white border-b border-border">
      <span className="text-xs font-semibold text-muted-foreground mr-1">Services :</span>
      {services.map(s => (
        <span key={s} className="flex items-center gap-1.5 text-xs text-foreground bg-secondary/60 rounded-full pl-1.5 pr-2.5 py-0.5">
          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: getServiceColor(s).bg }} />
          {s}
        </span>
      ))}
    </div>
  );
}