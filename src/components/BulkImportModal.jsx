import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Upload, Check, X, FileSpreadsheet, Loader2 } from 'lucide-react';

const ENTITIES = ['GONNIN', 'QUITTE', 'DURIS', 'DBS'];
const ZONES = ['Zone Centre', 'Zone Ouest'];

export default function BulkImportModal({ employees, agencies, onClose, onDone }) {
  const [step, setStep] = useState('upload');
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState({ updates: 0, creates: 0, errors: 0 });
  const [results, setResults] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef(null);

  const empByEmail = {};
  const empByName = {};
  employees.forEach(e => {
    if (e.email) empByEmail[e.email.toLowerCase().trim()] = e;
    empByName[`${e.first_name} ${e.last_name}`.toLowerCase().trim()] = e;
  });

  const agencyByName = {};
  agencies.forEach(a => { agencyByName[a.name.toLowerCase().trim()] = a; });

  const resolveAssignment = (affectation) => {
    if (!affectation) return {};
    const val = String(affectation).trim();
    const lower = val.toLowerCase();
    if (lower === 'groupe gonnin duris' || lower === 'support groupe' || lower === 'groupe') {
      return { is_group_support: true, agency_id: null, ancienne_entite: null, zone: null };
    }
    if (agencyByName[lower]) return { agency_id: agencyByName[lower].id };
    if (ENTITIES.includes(val)) return { ancienne_entite: val };
    if (ZONES.includes(val)) return { zone: val };
    return {};
  };

  const handleFile = async (file) => {
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const jsonRows = XLSX.utils.sheet_to_json(ws, { raw: false, defval: '' });

      const processed = [];
      let updates = 0, creates = 0, errors = 0;

      jsonRows.forEach((row, idx) => {
        const firstName = String(row['Prénom'] || '').trim();
        const lastName = String(row['Nom'] || '').trim();
        const email = String(row['Email'] || '').trim().toLowerCase();

        if (!firstName || !lastName) {
          errors++;
          processed.push({ row: idx + 2, action: 'error', name: `${firstName} ${lastName}`.trim(), reason: 'Nom ou prénom manquant' });
          return;
        }

        let existing = email ? empByEmail[email] : null;
        if (!existing) existing = empByName[`${firstName} ${lastName}`.toLowerCase().trim()];

        const assignment = resolveAssignment(row['Affectation']);
        const managerName = String(row['Responsable direct'] || '').trim();
        const managerId = managerName ? empByName[managerName.toLowerCase()]?.id : null;

        const empData = {
          first_name: firstName,
          last_name: lastName,
          position: String(row['Poste'] || '').trim() || undefined,
          service: String(row['Service'] || '').trim() || undefined,
          email: String(row['Email'] || '').trim() || undefined,
          phone: String(row['Téléphone'] || '').trim() || undefined,
          status: String(row['Statut'] || 'Actif').trim(),
          hire_date: String(row["Date d'entrée"] || '').trim() || undefined,
          departure_date: String(row['Date de départ'] || '').trim() || undefined,
          notes: String(row['Notes RH'] || '').trim() || undefined,
        };

        if (Object.keys(assignment).length > 0) {
          Object.assign(empData, assignment);
        } else {
          const entite = String(row['Ancienne entité'] || '').trim();
          const zone = String(row['Zone géographique'] || '').trim();
          const support = String(row['Support Groupe'] || '').trim();
          if (entite) empData.ancienne_entite = entite;
          if (zone) empData.zone = zone;
          if (support === 'Oui') empData.is_group_support = true;
          else if (support === 'Non') empData.is_group_support = false;
        }

        if (managerId) empData.manager_id = managerId;
        Object.keys(empData).forEach(k => empData[k] === undefined && delete empData[k]);

        if (existing) {
          updates++;
          processed.push({ row: idx + 2, action: 'update', id: existing.id, name: `${firstName} ${lastName}`, data: empData });
        } else {
          creates++;
          processed.push({ row: idx + 2, action: 'create', name: `${firstName} ${lastName}`, data: empData });
        }
      });

      setRows(processed);
      setStats({ updates, creates, errors });
      setStep('preview');
    } catch (err) {
      alert('Erreur de lecture du fichier: ' + err.message);
    }
  };

  const applyChanges = async () => {
    setStep('applying');
    let updated = 0, created = 0, failed = 0;
    for (const row of rows) {
      if (row.action === 'error') continue;
      try {
        if (row.action === 'update') {
          await base44.entities.Employee.update(row.id, row.data);
          updated++;
        } else {
          await base44.entities.Employee.create(row.data);
          created++;
        }
      } catch {
        failed++;
      }
    }
    setResults({ updated, created, failed });
    setStep('done');
    onDone();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            <h2 className="font-heading font-semibold text-foreground">Import en masse</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'upload' && (
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors ${dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
            >
              <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="font-heading font-semibold text-foreground mb-1">Glissez votre fichier ici</p>
              <p className="text-sm text-muted-foreground">ou cliquez pour parcourir — formats .xlsx, .csv</p>
              <p className="text-xs text-muted-foreground mt-4">Exportez l'annuaire en Excel/CSV, modifiez-le puis réimportez-le. Les lignes sont rapprochées par email ou par nom.</p>
              <p className="text-xs text-emerald-600 mt-2 font-medium">✓ Les photos déjà affectées sont conservées lors des mises à jour.</p>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-muted-foreground">{fileName}</span>
                <div className="flex gap-2">
                  {stats.updates > 0 && <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">{stats.updates} mise{stats.updates > 1 ? 's' : ''} à jour</span>}
                  {stats.creates > 0 && <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">{stats.creates} création{stats.creates > 1 ? 's' : ''}</span>}
                  {stats.errors > 0 && <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 text-red-700">{stats.errors} erreur{stats.errors > 1 ? 's' : ''}</span>}
                </div>
              </div>
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-secondary text-muted-foreground">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Ligne</th>
                      <th className="text-left px-3 py-2 font-medium">Collaborateur</th>
                      <th className="text-left px-3 py-2 font-medium">Action</th>
                      <th className="text-left px-3 py-2 font-medium">Détail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="px-3 py-2 text-muted-foreground">{r.row}</td>
                        <td className="px-3 py-2 font-medium text-foreground">{r.name}</td>
                        <td className="px-3 py-2">
                          {r.action === 'update' && <span className="text-blue-600 font-medium">Mise à jour</span>}
                          {r.action === 'create' && <span className="text-emerald-600 font-medium">Création</span>}
                          {r.action === 'error' && <span className="text-red-600 font-medium">Erreur</span>}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground text-xs">{r.reason || (r.data.position || '')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 'applying' && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
              <p className="font-heading font-semibold text-foreground">Application des modifications...</p>
              <p className="text-sm text-muted-foreground mt-1">Veuillez patienter</p>
            </div>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <Check className="w-7 h-7 text-emerald-600" />
              </div>
              <p className="font-heading font-semibold text-foreground text-lg">Import terminé</p>
              <div className="flex gap-4 mt-4">
                {results.updated > 0 && <span className="text-sm text-blue-600 font-medium">{results.updated} mis à jour</span>}
                {results.created > 0 && <span className="text-sm text-emerald-600 font-medium">{results.created} créés</span>}
                {results.failed > 0 && <span className="text-sm text-red-600 font-medium">{results.failed} échoués</span>}
              </div>
            </div>
          )}
        </div>

        {step === 'preview' && (
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button onClick={applyChanges} disabled={stats.updates + stats.creates === 0}>
              {stats.updates + stats.creates === 0 ? 'Rien à importer' : `Importer (${stats.updates + stats.creates})`}
            </Button>
          </div>
        )}
        {step === 'done' && (
          <div className="flex justify-end px-6 py-4 border-t border-border">
            <Button onClick={onClose}>Fermer</Button>
          </div>
        )}
      </div>
    </div>
  );
}