import { useRef, useState, useLayoutEffect } from 'react';
import OrgTreeNode from '@/components/OrgTreeNode';

// Dimensions utiles (96 dpi) avec marge d'impression de 8 mm
const FORMATS = {
  'A3-paysage': { w: 1557, h: 1093, css: 'A3 landscape' },
  'A3': { w: 1093, h: 1557, css: 'A3 portrait' },
  'A4-paysage': { w: 1093, h: 764, css: 'A4 landscape' },
  'A4': { w: 764, h: 1093, css: 'A4 portrait' },
};

export default function OrgChartExactPrint({ roots, childrenMap, pageFormat = 'A3-paysage', template, colorMode, depthColors, showAnomalies, company }) {
  const fmt = FORMATS[pageFormat] || FORMATS['A3-paysage'];
  const innerRef = useRef(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.scrollWidth;
      const h = el.scrollHeight;
      if (!w || !h) return;
      setScale(Math.min(1, (fmt.w - 20) / w, (fmt.h - 70) / h));
    };
    measure();
    const t = setTimeout(measure, 150);
    return () => clearTimeout(t);
  }, [fmt.w, fmt.h, roots, childrenMap, template]);

  const noop = () => {};

  return (
    <div className="flex justify-center">
      <style>{`
        @media print {
          @page { size: ${fmt.css}; margin: 8mm; }
          body * { visibility: hidden; }
          .exact-print-page, .exact-print-page * {
            visibility: visible;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          .exact-print-page { position: absolute; left: 0; top: 0; box-shadow: none !important; border: none !important; }
        }
      `}</style>

      <div
        className="exact-print-page bg-white border border-border shadow-lg flex flex-col"
        style={{ width: fmt.w, height: fmt.h }}
      >
        <div className="flex items-center justify-between px-6 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            {company?.logo_url && <img src={company.logo_url} alt="" className="h-7 object-contain" />}
            <p className="font-heading font-bold text-foreground">{company?.name || 'Organigramme'}</p>
          </div>
          <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString('fr-FR')}</p>
        </div>

        <div className="flex-1 flex items-start justify-center overflow-hidden p-2">
          <div style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}>
            <div ref={innerRef} className="flex gap-12 items-start justify-center flex-wrap">
              {roots.map(root => (
                <OrgTreeNode
                  key={root.id}
                  employee={root}
                  childrenMap={childrenMap}
                  onSelect={noop}
                  defaultExpanded
                  depth={0}
                  onDragStart={noop}
                  onDrop={noop}
                  template={template}
                  colorMode={colorMode}
                  depthColors={depthColors}
                  showAnomalies={showAnomalies}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}