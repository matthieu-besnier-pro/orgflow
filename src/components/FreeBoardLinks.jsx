import { getServiceColor } from '@/lib/serviceColors';

const BLOCK_W = 250;
const HEADER_Y = 14; // centre de l'en-tête du bloc

// Traits de rattachement hiérarchique entre les blocs de service du canevas A3
export default function FreeBoardLinks({ links, positions, width, height }) {
  if (!links.length) return null;

  return (
    <svg className="absolute inset-0 pointer-events-none" width={width} height={height} style={{ overflow: 'visible' }}>
      {links.map(({ from, to }) => {
        const a = positions[from];
        const b = positions[to];
        if (!a || !b) return null;
        const color = getServiceColor(to).bg;

        // Sortie par le côté du bloc parent, entrée par le côté du bloc enfant
        const parentRight = b.x > a.x;
        const x1 = a.x + (parentRight ? BLOCK_W : 0);
        const y1 = a.y + HEADER_Y;
        const x2 = b.x + (parentRight ? 0 : BLOCK_W);
        const y2 = b.y + HEADER_Y;
        const dx = Math.max(30, Math.abs(x2 - x1) / 2);
        const c1 = x1 + (parentRight ? dx : -dx);
        const c2 = x2 + (parentRight ? -dx : dx);

        return (
          <g key={`${from}->${to}`}>
            <path
              d={`M ${x1} ${y1} C ${c1} ${y1}, ${c2} ${y2}, ${x2} ${y2}`}
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