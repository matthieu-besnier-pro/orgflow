import { getServiceColor } from '@/lib/serviceColors';

const BLOCK_W = 250;
const HEADER_Y = 14; // centre de l'en-tête du bloc

// Traits de rattachement hiérarchique entre les blocs de service du canevas A3
export default function FreeBoardLinks({ links, positions, width, height, heights = {} }) {
  if (!links.length) return null;

  return (
    <svg className="absolute inset-0 pointer-events-none" width={width} height={height} style={{ overflow: 'visible' }}>
      {links.map(({ from, to }) => {
        const a = positions[from];
        const b = positions[to];
        if (!a || !b) return null;
        const color = getServiceColor(to).bg;

        const aH = heights[from] || 80;
        // Bloc parent au-dessus → lien vertical (pyramide) ; sinon lien latéral
        const vertical = b.y >= a.y + aH - 10;
        let x1, y1, x2, y2, d;
        if (vertical) {
          x1 = a.x + BLOCK_W / 2;
          y1 = a.y + aH;
          x2 = b.x + BLOCK_W / 2;
          y2 = b.y;
          const dy = Math.max(24, (y2 - y1) / 2);
          d = `M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`;
        } else {
          const parentRight = b.x > a.x;
          x1 = a.x + (parentRight ? BLOCK_W : 0);
          y1 = a.y + HEADER_Y;
          x2 = b.x + (parentRight ? 0 : BLOCK_W);
          y2 = b.y + HEADER_Y;
          const dx = Math.max(30, Math.abs(x2 - x1) / 2);
          d = `M ${x1} ${y1} C ${x1 + (parentRight ? dx : -dx)} ${y1}, ${x2 + (parentRight ? -dx : dx)} ${y2}, ${x2} ${y2}`;
        }

        return (
          <g key={`${from}->${to}`}>
            <path
              d={d}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeOpacity="0.55"
            />
            <circle cx={x1} cy={y1} r="3" fill={color} />
            <circle cx={x2} cy={y2} r="4" fill="white" stroke={color} strokeWidth="2" />
          </g>
        );
      })}
    </svg>
  );
}