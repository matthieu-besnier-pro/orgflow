import { base44 } from '@/api/base44Client';

// Coûts estimés en crédits d'intégration par service (source : docs Base44)
export const CREDIT_COSTS = {
  agent_message: { credits: 3, label: 'Message agent IA', desc: 'Chaque message envoyé à l\'Assistant RH (modèle automatique)' },
  invoke_llm: { credits: 1, label: 'Appel LLM (auto)', desc: 'Génération de texte simple (modèle automatique)' },
  invoke_llm_advanced: { credits: 2, label: 'Appel LLM (avancé)', desc: 'Génération avec modèle avancé (Claude, GPT-5...)' },
  send_email: { credits: 1, label: 'Email', desc: 'Envoi d\'un email (2 crédits avec domaine personnalisé)' },
  generate_image: { credits: 1, label: 'Image IA', desc: 'Génération d\'une image par IA' },
  generate_video: { credits: 30, label: 'Vidéo IA (6s)', desc: '5 crédits/seconde — 4s=20, 6s=30, 8s=40' },
  generate_speech: { credits: 1, label: 'Synthèse vocale', desc: '1 crédit / 50 caractères (max 100/call)' },
  transcribe_audio: { credits: 1, label: 'Transcription audio', desc: 'Transcription d\'un fichier audio en texte' },
  extract_data: { credits: 1, label: 'Extraction fichier', desc: 'Extraction de données depuis un fichier uploadé' },
  upload_file: { credits: 0, label: 'Upload fichier', desc: 'Stockage de fichier (gratuit)' },
};

export async function logCreditUsage({ companyId, companyName, service, creditsEstimated, description }) {
  try {
    const user = await base44.auth.me().catch(() => null);
    await base44.entities.CreditUsage.create({
      company_id: companyId || '',
      company_name: companyName || '',
      user_id: user?.id || '',
      user_name: user?.full_name || user?.email || '',
      credit_type: 'integration',
      service,
      credits_estimated: creditsEstimated,
      description: description || '',
    });
  } catch (e) {
    // Silencieux — ne pas bloquer l'opération
  }
}