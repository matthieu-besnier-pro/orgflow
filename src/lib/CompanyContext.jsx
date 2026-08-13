import { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const CompanyContext = createContext(null);

export function CompanyProvider({ children }) {
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.functions.invoke('getUserCompanies', {})
      .then((res) => {
        const comps = res.data?.companies || [];
        setCompanies(comps);
        const stored = localStorage.getItem('selectedCompanyId');
        if (stored && comps.find((c) => c.id === stored)) {
          setSelectedCompanyId(stored);
        } else if (comps.length > 0) {
          setSelectedCompanyId(comps[0].id);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Realtime: refresh company list on changes
  useEffect(() => {
    const unsubscribe = base44.entities.Company.subscribe(() => {
      base44.functions.invoke('getUserCompanies', {})
        .then((res) => setCompanies(res.data?.companies || []))
        .catch(() => {});
    });
    return unsubscribe;
  }, []);

  const setSelectedCompany = (id) => {
    setSelectedCompanyId(id);
    if (id) localStorage.setItem('selectedCompanyId', id);
  };

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);

  const value = {
    companies,
    selectedCompany,
    selectedCompanyId,
    setSelectedCompany,
    loading,
    services: selectedCompany?.services || [],
    statuses: selectedCompany?.statuses || [],
    zones: selectedCompany?.zones || [],
  };

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

export function useCompany() {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error('useCompany must be used within CompanyProvider');
  return ctx;
}