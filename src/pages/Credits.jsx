import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Zap, MessageSquare, Mail, Image, Video, Volume2, FileText, Upload, Bot, Info, TrendingDown } from 'lucide-react';
import { useCompany } from '@/lib/CompanyContext';
import { CREDIT_COSTS } from '@/lib/creditTracking';

const SERVICE_ICONS = {
  agent_message: Bot,
  invoke_llm: MessageSquare,
  invoke_llm_advanced: MessageSquare,
  send_email: Mail,
  generate_image: Image,
  generate_video: Video,
  generate_speech: Volume2,
  transcribe_audio: Volume2,
  extract_data: FileText,
  upload_file: Upload,
};

export default function Credits() {
  const { companies } = useCompany();
  const [usage, setUsage] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsage();
  }, []);

  const loadUsage = async () => {
    try {
      const list = await base44.entities.CreditUsage.list('-created_date', 5000);
      setUsage(list);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  // Group by company
  const byCompany = useMemo(() => {
    const map = {};
    usage.forEach(u => {
      const key = u.company_id || 'unknown';
      if (!map[key]) map[key] = { name: u.company_name || 'Société inconnue', total: 0, services: {} };
      map[key].total += u.credits_estimated || 0;
      if (!map[key].services[u.service]) map[key].services[u.service] = 0;
      map[key].services[u.service] += u.credits_estimated || 0;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [usage]);

  // Total
  const totalCredits = useMemo(() => usage.reduce((sum, u) => sum + (u.credits_estimated || 0), 0), [usage]);

  // By service (all companies)
  const byService = useMemo(() => {
    const map = {};
    usage.forEach(u => {
      if (!map[u.service]) map[u.service] = { count: 0, credits: 0 };
      map[u.service].count++;
      map[u.service].credits += u.credits_estimated || 0;
    });
    return Object.entries(map).sort((a, b) => b[1].credits - a[1].credits);
  }, [usage]);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-lavender border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
          <Zap className="w-6 h-6 text-primary" />
          Crédits & Consommation
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Suivi des crédits d'intégration consommés par l'application, par société</p>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-2 text-sm text-blue-900">
            <p className="font-semibold">Comment fonctionnent les crédits ?</p>
            <p>Base44 utilise <strong>deux types de crédits</strong> :</p>
            <ul className="list-disc pl-5 space-y-1 text-blue-800">
              <li><strong>Crédits de messages</strong> — consommés lors de la <em>construction</em> de l'app (chat avec Base44). Non divisibles par société car liés au niveau du workspace.</li>
              <li><strong>Crédits d'intégration</strong> — consommés par l'application en production (Assistant IA, emails, génération d'images...). Suivis ci-dessous par société.</li>
            </ul>
            <p className="text-xs text-blue-700 mt-2">Le suivi ci-dessous est une <strong>estimation</strong> basée sur les coûts documentés. Pour les chiffres exacts, consultez Paramètres → Utilisation des crédits dans votre workspace.</p>
          </div>
        </div>
      </div>

      {/* Total */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-border p-5">
          <div className="w-10 h-10 rounded-xl bg-lavender flex items-center justify-center mb-3">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <p className="text-3xl font-heading font-bold text-foreground">{totalCredits}</p>
          <p className="text-sm text-muted-foreground mt-1">Crédits d'intégration totaux</p>
        </div>
        <div className="bg-white rounded-2xl border border-border p-5">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mb-3">
            <TrendingDown className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-heading font-bold text-foreground">{byCompany.length}</p>
          <p className="text-sm text-muted-foreground mt-1">Sociétés actives</p>
        </div>
        <div className="bg-white rounded-2xl border border-border p-5">
          <div className="w-10 h-10 rounded-xl bg-mint flex items-center justify-center mb-3">
            <Bot className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-3xl font-heading font-bold text-foreground">{usage.filter(u => u.service === 'agent_message').length}</p>
          <p className="text-sm text-muted-foreground mt-1">Messages IA envoyés</p>
        </div>
      </div>

      {/* Per company breakdown */}
      <div className="bg-white rounded-2xl border border-border p-6">
        <h2 className="font-heading font-semibold text-foreground mb-4">Consommation par société</h2>
        {byCompany.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Aucune consommation enregistrée pour le moment.</p>
        ) : (
          <div className="space-y-4">
            {byCompany.map((c, i) => (
              <div key={i} className="border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-foreground">{c.name}</p>
                  <p className="text-lg font-heading font-bold text-primary">{c.total} crédits</p>
                </div>
                <div className="space-y-2">
                  {Object.entries(c.services).sort((a, b) => b[1] - a[1]).map(([svc, credits]) => {
                    const Icon = SERVICE_ICONS[svc] || Zap;
                    const cost = CREDIT_COSTS[svc];
                    return (
                      <div key={svc} className="flex items-center gap-3 text-sm">
                        <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-foreground flex-1">{cost?.label || svc}</span>
                        <span className="text-muted-foreground">{credits} crédits</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cost reference table */}
      <div className="bg-white rounded-2xl border border-border p-6">
        <h2 className="font-heading font-semibold text-foreground mb-4">Référentiel des coûts</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Service</th>
                <th className="pb-2 pr-4 font-medium">Coût / appel</th>
                <th className="pb-2 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(CREDIT_COSTS).filter(([, v]) => v.credits > 0).map(([key, val]) => {
                const Icon = SERVICE_ICONS[key] || Zap;
                return (
                  <tr key={key} className="border-b border-border/50">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">{val.label}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="px-2 py-0.5 bg-lavender rounded-md text-primary font-semibold text-xs">{val.credits} crédit{val.credits > 1 ? 's' : ''}</span>
                    </td>
                    <td className="py-3 text-muted-foreground">{val.desc}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-3">Les coûts ci-dessus sont des estimations basées sur la documentation Base44. Les modèles LLM avancés (Claude, GPT-5) consomment plus de crédits que le modèle automatique.</p>
      </div>
    </div>
  );
}