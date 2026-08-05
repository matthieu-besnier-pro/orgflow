import { useEffect, useRef, useState } from 'react';
import { Map, X } from 'lucide-react';

const MAP_W = 180;
const MAP_H = 120;

// Mini-carte de navigation : aperçu schématique de l'organigramme + rectangle de la zone visible
export default function OrgMiniMap({ containerRef, contentRef, deps }) {
  const [open, setOpen] = useState(true);
  const [cards, setCards] = useState([]);
  const [size, setSize] = useState({ w: 1, h: 1 });
  const [view, setView] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const dragging = useRef(false);

  // Mesure du contenu (positions des cartes) + zone visible
  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const measure = () => {
      const cRect = content.getBoundingClientRect();
      const scale = cRect.width / (content.offsetWidth || 1);
      const nodes = [...content.querySelectorAll('[draggable="true"]')].map(el => {
        const r = el.getBoundingClientRect();
        return {
          x: (r.left - cRect.left) / scale,
          y: (r.top - cRect.top) / scale,
          w: r.width / scale,
          h: r.height / scale,
        };
      });
      setCards(nodes);
      setSize({ w: content.offsetWidth || 1, h: content.offsetHeight || 1 });
      setView({
        x: container.scrollLeft / scale,
        y: container.scrollTop / scale,
        w: container.clientWidth / scale,
        h: container.clientHeight / scale,
      });
    };

    measure();
    const t = setTimeout(measure, 300);
    container.addEventListener('scroll', measure);
    window.addEventListener('resize', measure);
    return () => {
      clearTimeout(t);
      container.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deps]);

  const ratio = Math.min(MAP_W / size.w, MAP_H / size.h);

  const scrollTo = (e) => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;
    const scale = content.getBoundingClientRect().width / (content.offsetWidth || 1);
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = (e.clientX - rect.left) / ratio;
    const cy = (e.clientY - rect.top) / ratio;
    container.scrollLeft = (cx - view.w / 2) * scale;
    container.scrollTop = (cy - view.h / 2) * scale;
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Afficher la mini-carte"
        className="fixed bottom-5 right-5 z-30 w-9 h-9 rounded-lg bg-white border border-border shadow-lg flex items-center justify-center text-muted-foreground hover:text-foreground print:hidden"
      >
        <Map className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-30 bg-white/95 backdrop-blur border border-border rounded-xl shadow-xl p-2 print:hidden">
      <div className="flex items-center justify-between mb-1 px-0.5">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Navigation</span>
        <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
          <X className="w-3 h-3" />
        </button>
      </div>
      <div
        onMouseDown={(e) => { dragging.current = true; scrollTo(e); }}
        onMouseMove={(e) => { if (dragging.current) scrollTo(e); }}
        onMouseUp={() => { dragging.current = false; }}
        onMouseLeave={() => { dragging.current = false; }}
        className="relative bg-secondary/60 rounded-md cursor-pointer overflow-hidden"
        style={{ width: MAP_W, height: MAP_H }}
      >
        {cards.map((c, i) => (
          <span
            key={i}
            className="absolute rounded-sm bg-primary/50"
            style={{
              left: c.x * ratio,
              top: c.y * ratio,
              width: Math.max(2, c.w * ratio),
              height: Math.max(2, c.h * ratio),
            }}
          />
        ))}
        <span
          className="absolute border-2 border-primary rounded-sm bg-primary/10 pointer-events-none"
          style={{
            left: view.x * ratio,
            top: view.y * ratio,
            width: Math.min(MAP_W, view.w * ratio),
            height: Math.min(MAP_H, view.h * ratio),
          }}
        />
      </div>
    </div>
  );
}