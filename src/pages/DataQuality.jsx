import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, Merge, ShieldCheck, Camera } from 'lucide-react';
import { useCompany } from '@/lib/CompanyContext';
import AccessRequestButton from '@/components/AccessRequestButton';
import AnomalyList from '@/components/AnomalyList';
import ServiceMergePanel from '@/components/ServiceMergePanel';
import PhotoNormalizationPanel from '@/components/PhotoNormalizationPanel';

export default function DataQuality() {
  const [employees, setEmployees] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('anomalies');
  const { selectedCompanyId, loading: companyLoading } = useCompany();

  const load = () => {
    if (!selectedCompanyId) return;
    setLoading(true);
    Promise.all([
      base44.entities.Employee.filter({ company_id: selectedCompanyId }),
      base44.entities.Agency.filter({ company_id: selectedCompanyId }),
    ]).then(([emps, ags]) => { setEmployees(emps); setAgencies(ags); setLoading(false); });
  };

  useEffect(load, [selectedCompanyId]);

  if (companyLoading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-lavender border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!selectedCompanyId) return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
      <ShieldCheck className="w-10 h-10 text-muted-foreground/40" />
      <p className="text-muted-foreground font-medium">Aucune société accessible avec ce compte</p>
      <p className="text-sm text-muted-foreground">Demandez l'accès à un administrateur.</p>
      <AccessRequestButton />
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-lavender border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-1">
        <ShieldCheck className="w-6 h-6 text-primary" />
        <h1 className="font-heading text-2xl font-bold text-foreground">Qualité des données</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Corrigez les fiches incomplètes et harmonisez les libellés de services.</p>

      <div className="flex items-center gap-1 bg-secondary rounded-xl p-1 w-fit mb-6">
        <button onClick={() => setTab('anomalies')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'anomalies' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground'}`}>
          <AlertTriangle className="w-4 h-4" /> Anomalies
        </button>
        <button onClick={() => setTab('services')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'services' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground'}`}>
          <Merge className="w-4 h-4" /> Harmonisation des services
        </button>
        <button onClick={() => setTab('photos')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'photos' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground'}`}>
          <Camera className="w-4 h-4" /> Photos
        </button>
      </div>

      {tab === 'anomalies' ? (
        <AnomalyList employees={employees} agencies={agencies} onChanged={load} />
      ) : tab === 'services' ? (
        <ServiceMergePanel employees={employees} onChanged={load} />
      ) : (
        <PhotoNormalizationPanel employees={employees} onChanged={load} />
      )}
    </div>
  );
}