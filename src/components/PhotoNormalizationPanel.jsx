import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Camera, CheckCircle2, AlertCircle, Wand2 } from 'lucide-react';
import { processPhotoFromUrl } from '@/lib/imageProcessing';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';

export default function PhotoNormalizationPanel({ employees, onChanged }) {
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, errors: 0 });

  const withPhotos = employees.filter(e => e.photo_url);
  const total = withPhotos.length;
  const done = progress.done;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const handleNormalizeAll = async () => {
    if (total === 0) return;
    if (!confirm(`Normaliser ${total} photo(s) ?\n\nChaque photo sera recadrée en 500×500px, centrée sur le visage si détecté, puis ré-uploadée en JPEG optimisé.`)) return;
    setProcessing(true);
    let errors = 0;
    for (let i = 0; i < withPhotos.length; i++) {
      const emp = withPhotos[i];
      setProgress({ done: i, total, errors });
      try {
        const processed = await processPhotoFromUrl(emp.photo_url);
        const { file_url } = await base44.integrations.Core.UploadFile({ file: processed });
        await base44.entities.Employee.update(emp.id, { photo_url: file_url });
      } catch {
        errors++;
      }
    }
    setProgress({ done: total, total, errors });
    setProcessing(false);
    if (errors === 0) {
      toast({ title: `${total} photo(s) normalisée(s)`, description: 'Toutes les photos ont été optimisées.' });
    } else {
      toast({ title: `${total - errors} réussie(s), ${errors} échec(s)`, variant: 'destructive' });
    }
    onChanged && onChanged();
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-border p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-lavender flex items-center justify-center flex-shrink-0">
            <Camera className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-heading font-semibold text-foreground">Normalisation des photos</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Recadre toutes les photos existantes en 500×500px, centrées sur le visage si détecté,
              et les compresse en JPEG optimisé. Utile pour harmoniser les photos importées avant
              la mise en place du traitement automatique.
            </p>
            <div className="flex items-center gap-3 mt-4">
              <Button onClick={handleNormalizeAll} disabled={processing || total === 0} className="gap-2">
                {processing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Wand2 className="w-4 h-4" />}
                {processing ? `Traitement ${done}/${total}` : `Normaliser ${total} photo(s)`}
              </Button>
              <span className="text-sm text-muted-foreground">
                {total} photo{total > 1 ? 's' : ''} à traiter
              </span>
            </div>
          </div>
        </div>

        {processing && (
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>Progression</span>
              <span>{pct}%</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
            {progress.errors > 0 && (
              <p className="text-xs text-destructive mt-2 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                {progress.errors} échec(s) — vérifiez la connexion ou les URLs
              </p>
            )}
          </div>
        )}

        {!processing && progress.done > 0 && (
          <div className="mt-5 flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
            {progress.total - progress.errors} photo(s) optimisée(s)
            {progress.errors > 0 && <span className="text-destructive">· {progress.errors} échec(s)</span>}
          </div>
        )}
      </div>

      {total === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Aucune photo à normaliser pour cette société.
        </div>
      )}
    </div>
  );
}