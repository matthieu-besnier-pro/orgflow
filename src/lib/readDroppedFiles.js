// Récupère tous les fichiers d'un dépôt (drag & drop), y compris ceux
// contenus dans des dossiers déposés (récursif).
async function readEntry(entry, out) {
  if (!entry) return;
  if (entry.isFile) {
    await new Promise(resolve => entry.file(f => { out.push(f); resolve(); }, resolve));
    return;
  }
  if (entry.isDirectory) {
    const reader = entry.createReader();
    let batch;
    do {
      batch = await new Promise(resolve => reader.readEntries(resolve, () => resolve([])));
      for (const child of batch) await readEntry(child, out);
    } while (batch.length > 0);
  }
}

export default async function readDroppedFiles(dataTransfer) {
  if (!dataTransfer) return [];
  const items = dataTransfer.items ? [...dataTransfer.items] : [];
  const entries = items
    .map(it => (it.webkitGetAsEntry ? it.webkitGetAsEntry() : null))
    .filter(Boolean);

  if (entries.length > 0) {
    const out = [];
    for (const entry of entries) await readEntry(entry, out);
    if (out.length > 0) return out;
  }
  return [...(dataTransfer.files || [])];
}