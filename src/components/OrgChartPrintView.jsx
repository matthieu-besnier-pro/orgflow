import { ChevronDown, ChevronRight } from 'lucide-react';

const STATUS_COLORS = {
  'Actif': '#16a34a',
  'En recrutement': '#eab308',
  'Apprenti': '#3b82f6',
  'Alternant': '#a855f7',
  'Départ': '#ef4444',
};

function PrintCard({ employee, depth = 0 }) {
  const initials = `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`.toUpperCase();
  const dotColor = STATUS_COLORS[employee.status] || '#10b981';

  // Couleurs en dégradé selon la profondeur
  const colors = ['#003D7A', '#0056B3', '#0070D0', '#FDB913'];
  const bgColor = colors[Math.min(depth, colors.length - 1)];

  return (
    <div style={{ marginLeft: `${depth * 20}px` }} className="mb-2">
      <div
        style={{
          backgroundColor: bgColor,
          borderRadius: '8px',
          padding: '8px 12px',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '11px',
          pageBreakInside: 'avoid',
        }}
      >
        {/* Avatar/Initials */}
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '9px',
            fontWeight: 'bold',
            flexShrink: 0,
          }}
        >
          {initials}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '10px' }}>
            {employee.first_name} {employee.last_name}
          </div>
          <div style={{ fontSize: '9px', opacity: 0.9 }}>
            {employee.position}
          </div>
        </div>

        {/* Status dot */}
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: dotColor,
            flexShrink: 0,
          }}
        />
      </div>
    </div>
  );
}

function PrintTree({ children, depth = 0 }) {
  if (!children || children.length === 0) return null;

  return (
    <div style={{ marginLeft: '20px', borderLeft: '2px solid #ccc', paddingLeft: '8px' }}>
      {children.map((child) => (
        <div key={child.id} style={{ pageBreakInside: 'avoid' }}>
          <PrintCard employee={child} depth={depth} />
          <PrintTree children={child.children} depth={depth + 1} />
        </div>
      ))}
    </div>
  );
}

export default function OrgChartPrintView({ employees, roots, childrenMap, pageFormat = 'A4' }) {
  // Construire l'arbre avec children
  const buildTree = (emp) => ({
    ...emp,
    children: (childrenMap[emp.id] || []).map(buildTree),
  });

  const treesWithChildren = roots.map(buildTree);

  // Dimensions pour A4/A3 (en mm, convertis en px à 96dpi)
  const margins = 20; // mm
  const pageWidth = pageFormat === 'A3' ? 297 : 210; // mm
  const pageHeight = pageFormat === 'A3' ? 420 : 297; // mm

  const styles = `
    @media print {
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        background: white;
        color: #000;
      }
      .print-container {
        width: ${pageWidth}mm;
        height: ${pageHeight}mm;
        padding: ${margins}mm;
        page-break-after: always;
        background: white;
      }
      .print-container:last-child {
        page-break-after: avoid;
      }
      .print-header {
        font-size: 14px;
        font-weight: bold;
        margin-bottom: 12px;
        color: #003D7A;
        border-bottom: 2px solid #003D7A;
        padding-bottom: 8px;
      }
      .print-content {
        font-family: Arial, sans-serif;
      }
    }
    @page {
      size: ${pageFormat};
      margin: 0;
      padding: 0;
    }
  `;

  return (
    <>
      <style>{styles}</style>
      <div style={{ backgroundColor: 'white' }}>
        {treesWithChildren.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
            Aucun collaborateur à afficher
          </div>
        ) : (
          treesWithChildren.map((tree, i) => (
            <div key={tree.id} className="print-container" style={{ breakAfter: 'page' }}>
              <div className="print-header">
                {tree.first_name} {tree.last_name}
                <div style={{ fontSize: '11px', fontWeight: 'normal', color: '#666', marginTop: '4px' }}>
                  {tree.position}
                </div>
              </div>
              <div className="print-content">
                <PrintTree children={tree.children} depth={0} />
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}