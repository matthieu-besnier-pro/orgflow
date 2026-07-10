const STATUS_COLORS = {
  'Actif': '#16a34a',
  'En recrutement': '#eab308',
  'Apprenti': '#3b82f6',
  'Alternant': '#a855f7',
  'Départ': '#ef4444',
};

const DEPTH_ACCENTS = [
  { bar: '#003D7A', bg: '#F0F5FB', border: '#003D7A' },
  { bar: '#0056B3', bg: '#F0F6FC', border: '#0056B3' },
  { bar: '#0070D0', bg: '#F0F7FD', border: '#0070D0' },
  { bar: '#FDB913', bg: '#FFFBF0', border: '#FDB913' },
];

function getAccent(depth) {
  return DEPTH_ACCENTS[Math.min(depth, DEPTH_ACCENTS.length - 1)];
}

// ── Carte individuelle (style print, moderne) ──────────────────────────────
function PrintCard({ employee, depth = 0 }) {
  const initials = `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`.toUpperCase();
  const dotColor = STATUS_COLORS[employee.status] || '#10b981';
  const accent = getAccent(depth);

  return (
    <div
      style={{
        display: 'inline-block',
        verticalAlign: 'top',
        pageBreakInside: 'avoid',
        breakInside: 'avoid',
      }}
    >
      <div
        style={{
          width: '170px',
          borderRadius: '10px',
          border: `1px solid ${accent.border}33`,
          backgroundColor: accent.bg,
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
        {/* Barre de couleur en haut */}
        <div style={{ height: '4px', backgroundColor: accent.bar }} />

        {/* Contenu */}
        <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Avatar */}
          <div style={{ flexShrink: 0, position: 'relative' }}>
            {employee.photo_url ? (
              <img
                src={employee.photo_url}
                alt={initials}
                style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${accent.bar}` }}
              />
            ) : (
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: accent.bar,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'white',
                }}
              >
                {initials}
              </div>
            )}
            <div
              style={{
                position: 'absolute',
                bottom: -1,
                right: -1,
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: dotColor,
                border: '2px solid white',
              }}
            />
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#1a1a2e', lineHeight: '1.2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {employee.first_name} {employee.last_name}
            </div>
            <div style={{ fontSize: '9px', color: '#666', marginTop: '2px', lineHeight: '1.2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {employee.position}
            </div>
            {employee.service && (
              <div style={{ fontSize: '8px', color: accent.bar, marginTop: '3px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {employee.service}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Nœud arborescent avec connecteurs ───────────────────────────────────────
function PrintNode({ employee, childrenMap, depth = 0 }) {
  const children = childrenMap[employee.id] || [];
  const accent = getAccent(depth);
  const lineColor = depth === 0 ? '#003D7A' : getAccent(depth).bar;

  return (
    <div style={{ display: 'inline-block', verticalAlign: 'top', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
      {/* Carte du nœud */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <PrintCard employee={employee} depth={depth} />
      </div>

      {/* Enfants avec connecteurs */}
      {children.length > 0 && (
        <div style={{ marginTop: '0' }}>
          {/* Tige verticale sous le parent */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: '1.5px', height: '16px', backgroundColor: lineColor }} />
          </div>

          {/* Barre horizontale reliant les enfants */}
          {children.length > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
              <div
                style={{
                  height: '1.5px',
                  backgroundColor: lineColor,
                  width: `${children.length * 180 - 10}px`,
                }}
              />
            </div>
          )}

          {/* Conteneur des enfants */}
          <div
            style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'center',
              alignItems: 'flex-start',
              flexWrap: 'nowrap',
            }}
          >
            {children.map((child) => (
              <div key={child.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                {/* Tige verticale au-dessus de chaque enfant */}
                <div style={{ width: '1.5px', height: '12px', backgroundColor: lineColor }} />
                <PrintNode employee={child} childrenMap={childrenMap} depth={depth + 1} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── En-tête de page (marque) ────────────────────────────────────────────────
function PageHeader({ rootEmployee, index, total }) {
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '2.5px solid #003D7A',
        paddingBottom: '10px',
        marginBottom: '20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Logo bloc */}
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #003D7A 0%, #0070D0 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 800,
            fontSize: '16px',
            letterSpacing: '-1px',
          }}
        >
          GD
        </div>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#003D7A', fontFamily: 'Sora, Arial, sans-serif' }}>
            GONNIN DURIS
          </div>
          <div style={{ fontSize: '9px', color: '#888', marginTop: '1px' }}>
            Organigramme — {rootEmployee.first_name} {rootEmployee.last_name}
          </div>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '9px', color: '#888' }}>
          {today}
        </div>
        {total > 1 && (
          <div style={{ fontSize: '9px', color: '#aaa', marginTop: '2px' }}>
            Page {index + 1} / {total}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Pied de page ───────────────────────────────────────────────────────────
function PageFooter() {
  return (
    <div
      style={{
        marginTop: '20px',
        paddingTop: '8px',
        borderTop: '1px solid #e0e0e0',
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '8px',
        color: '#aaa',
      }}
    >
      <span>Document confidentiel — GONNIN DURIS</span>
      <span>Ressources Humaines</span>
    </div>
  );
}

// ── Légende des statuts ─────────────────────────────────────────────────────
function StatusLegend() {
  const items = [
    { label: 'Actif', color: STATUS_COLORS['Actif'] },
    { label: 'En recrutement', color: STATUS_COLORS['En recrutement'] },
    { label: 'Apprenti', color: STATUS_COLORS['Apprenti'] },
    { label: 'Alternant', color: STATUS_COLORS['Alternant'] },
    { label: 'Départ', color: STATUS_COLORS['Départ'] },
  ];

  return (
    <div
      style={{
        display: 'flex',
        gap: '14px',
        flexWrap: 'wrap',
        marginBottom: '16px',
        padding: '8px 12px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #e8e8e8',
      }}
    >
      <span style={{ fontSize: '9px', fontWeight: 600, color: '#666' }}>Statuts :</span>
      {items.map((item) => (
        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color }} />
          <span style={{ fontSize: '8px', color: '#666' }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Composant principal ─────────────────────────────────────────────────────
export default function OrgChartPrintView({ employees, roots, childrenMap, pageFormat = 'A4' }) {
  const pageWidth = pageFormat === 'A3' ? '297mm' : '210mm';
  const pageHeight = pageFormat === 'A3' ? '420mm' : '297mm';

  const styles = `
    @media print {
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      body {
        background: white;
      }
      .print-page {
        width: ${pageWidth};
        min-height: ${pageHeight};
        padding: 18mm 15mm;
        page-break-after: always;
        break-after: page;
        background: white;
        display: flex;
        flex-direction: column;
      }
      .print-page:last-child {
        page-break-after: avoid;
        break-after: avoid;
      }
      .print-body {
        flex: 1;
        overflow: hidden;
      }
    }
    @page {
      size: ${pageFormat};
      margin: 0;
    }
  `;

  if (!roots || roots.length === 0) {
    return (
      <>
        <style>{styles}</style>
        <div style={{ padding: '40px', textAlign: 'center', color: '#999', fontSize: '14px' }}>
          Aucun collaborateur à afficher
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div>
        {roots.map((root, i) => (
          <div key={root.id} className="print-page">
            <PageHeader rootEmployee={root} index={i} total={roots.length} />
            <StatusLegend />
            <div className="print-body">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  overflow: 'auto',
                }}
              >
                <PrintNode employee={root} childrenMap={childrenMap} depth={0} />
              </div>
            </div>
            <PageFooter />
          </div>
        ))}
      </div>
    </>
  );
}