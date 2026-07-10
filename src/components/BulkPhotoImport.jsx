import { useState, useRef } from 'react';
import { X, Upload, ImagePlus, Check, AlertCircle, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

const PHOTO_EXTENSIONS = /\.(jpg|jpeg|png|webp|gif|bmp|heic)$/i;

function normalize(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function normalizeName(str) {
  return normalize(str).replace(/[^a-z]/g, '');
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  let curr = Array(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

function tokenThreshold(name) {
  if (name.length <= 4) return 1;
  if (name.length <= 7) return 2;
  return 3;
}

function matchFilenameToEmployee(filename, employees) {
  const base = filename.replace(PHOTO_EXTENSIONS, '');
  const normalized = normalize(base);
  if (!normalized) return null;
  const fullNorm = normalized.replace(/[^a-z]/g, '');

  // 1. Correspondance exacte concaténée (prénom+nom ou nom+prénom)
  for (const emp of employees) {
    const first = normalizeName(emp.first_name);
    const last = normalizeName(emp.last_name);
    if (!first || !last) continue;
    if (fullNorm === first + last || fullNorm === last + first) return emp;
  }

  // 2. Correspondance floue par jetons (tolère fautes + ordre inversé)
  const tokens = normalized.split(/[^a-z]+/).filter(t => t.length >= 2);
  if (tokens.length > 0) {
    let best = null;
    let bestScore = -1;
    for (const emp of employees) {
      const first = normalizeName(emp.first_name);
      const last = normalizeName(emp.last_name);
      if (!first || !last) continue;
      let firstDist = Infinity, lastDist = Infinity;
      for (const token of tokens) {
        firstDist = Math.min(firstDist, levenshtein(token, first));
        lastDist = Math.min(lastDist, levenshtein(token, last));
      }
      const firstThreshold = tokenThreshold(first);
      const lastThreshold = tokenThreshold(last);
      if (firstDist <= firstThreshold && lastDist <= lastThreshold) {
        const score = (firstThreshold - firstDist) + (lastThreshold - lastDist);
        if (score > bestScore) {
          bestScore = score;
          best = emp;
        }
      }
    }
    if (best) return best;
  }

  // 3. Correspondance floue concaténée (ex: "jeandupon" → "jeandupont")
  for (const emp of employees) {
    const first = normalizeName(emp.first_name);
    const last = normalizeName(emp.last_name);
    if (!first || !last) continue;
    const concat1 = first + last;
    const concat2 = last + first;
    const threshold = tokenThreshold(concat1);
    if (levenshtein(fullNorm, concat1) <= threshold || levenshtein(fullNorm, concat2) <= threshold) return emp;
  }

  return null;
}

export default function BulkPhotoImport({ employees, onClose, onDone }) {
  const [items, setItems] = useState([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();
  const { toast } = useToast();

  const addFiles = (files) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    const newItems = imageFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      matchedEmployee: matchFilenameToEmployee(file.name, employees),
      uploaded: false,
    }));
    setItems(prev => [...prev, ...newItems]);
  };

  const handleFiles = (e) => {
    addFiles(Array.from(e.target.files || []));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    addFiles(Array.from(e.dataTransfer.files || []));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragging(false);
  };

  const setMatch = (idx, employeeId) => {
    setItems(prev => prev.map((it, i) =>
      i === idx ? { ...it, matchedEmployee: employees.find(e => e.id === employeeId) || null } : it
    ));
  };

  const removeItem = (idx) => {
    setItems(prev => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const matchedCount = items.filter(it => it.matchedEmployee).length;

  const handleImport = async () => {
    const toImport = items.filter(it => it.matchedEmployee && !it.uploaded);
    if (toImport.length === 0) return;
    setImporting(true);
    setProgress({ done: 0, total: toImport.length });
    let done = 0;
    for (const item of toImport) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: item.file });
        await base44.entities.Employee.update(item.matchedEmployee.id, { photo_url: file_url });
        item.uploaded = true;
        item.photo_url = file_url;
      } catch (err) {
        console.error('Erreur import photo', item.file.name, err);
      }
      done++;
      setProgress({ done, total: toImport.length });
    }
    setImporting(false);
    const successCount = toImport.filter(it => it.uploaded).length;
    toast({
      title: 'Import terminé',
      description: `${successCount} photo(s) importée(s) sur ${toImport.length}.`,
      duration: 4000,
    });
    onDone && onDone();
    if (successCount === toImport.length) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="font-heading font-semibold text-foreground">Import de photos en masse</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Le nom du fichier doit contenir le prénom et le nom du collaborateur (ex: « Jean Dupont.jpg »)
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {items.length === 0 ? (
            <div
              className={`border-2 border-dashed rounded-xl py-16 flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors ${dragging ? 'border-primary bg-lavender/30' : 'border-border hover:border-primary hover:bg-lavender/20'}`}
              onClick={() => fileRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <ImagePlus className={`w-12 h-12 ${dragging ? 'text-primary' : 'text-muted-foreground'}`} />
              <div className="text-center">
                <p className="font-medium text-foreground">{dragging ? 'Déposez vos fichiers ici' : 'Glissez vos photos ici ou cliquez pour sélectionner'}</p>
                <p className="text-sm text-muted-foreground mt-1">JPG, PNG, WEBP — plusieurs fichiers possibles</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{items.length} fichier(s)</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-green-600 font-medium flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  {matchedCount} associé(s)
                </span>
                {items.length - matchedCount > 0 && (
                  <>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-amber-600 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {items.length - matchedCount} non reconnu(s)
                    </span>
                  </>
                )}
              </div>

              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className={`flex items-center gap-3 p-3 rounded-xl border ${item.uploaded ? 'border-green-300 bg-green-50' : item.matchedEmployee ? 'border-border' : 'border-amber-300 bg-amber-50'}`}>
                    <img src={item.preview} alt={item.file.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.file.name}</p>
                      {item.matchedEmployee ? (
                        <p className="text-xs text-muted-foreground">
                          → {item.matchedEmployee.first_name} {item.matchedEmployee.last_name}
                          {item.matchedEmployee.position ? ` — ${item.matchedEmployee.position}` : ''}
                        </p>
                      ) : (
                        <p className="text-xs text-amber-600">Aucun collaborateur trouvé</p>
                      )}
                    </div>
                    {item.uploaded ? (
                      <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                        <Check className="w-4 h-4" />
                        Importé
                      </span>
                    ) : (
                      <>
                        <Select
                          value={item.matchedEmployee?.id || 'none'}
                          onValueChange={v => setMatch(idx, v === 'none' ? null : v)}
                        >
                          <SelectTrigger className="w-52 h-8 text-xs">
                            <SelectValue placeholder="Associer..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Aucun</SelectItem>
                            {employees
                              .sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`, 'fr'))
                              .map(e => (
                                <SelectItem key={e.id} value={e.id}>
                                  {e.last_name} {e.first_name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <button
                          onClick={() => removeItem(idx)}
                          className="w-7 h-7 rounded-lg hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground flex-shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={() => fileRef.current?.click()}
                className="text-sm text-primary hover:underline flex items-center gap-1.5"
              >
                <ImagePlus className="w-3.5 h-3.5" />
                Ajouter d'autres photos
              </button>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {importing && (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Import {progress.done}/{progress.total}...
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} disabled={importing}>
              Fermer
            </Button>
            <Button
              className="gap-2"
              onClick={handleImport}
              disabled={importing || matchedCount === 0}
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Importer ({matchedCount})
            </Button>
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFiles}
        />
      </div>
    </div>
  );
}