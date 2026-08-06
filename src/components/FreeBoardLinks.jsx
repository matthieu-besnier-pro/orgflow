import { getServiceColor } from '@/lib/serviceColors';

const BLOCK_W = 250;
const HEADER = 34;

export default function FreeBoardLinks({ links, positions, width, height, heights = {} }) {
  return (
    <svg width={width} height={height} className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
      {links.map(({ from, to }) => {
        const a = positions[from];
        const b = positions[to];
        if (!a || !b) return null;
        const color = getServiceColor(from).bg;
        const ha = heights[from] || 100;

        const vertical = b.y > a.y + ha - 10;
        let x1, y1, x2, y2, d;
        if (vertical) {
          x1 = a.x + BLOCK_W / 2; y1 = a.y + ha;
          x2 = b.x + BLOCK_W / 2; y2 = b.y;
          const my = (y1 + y2) / 2;
          d = `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`;
        } else {
          const leftToRight = b.x > a.x;
          x1 = leftToRight ? a.x + BLOCK_W : a.x;
          x2 = leftToRight ? b.x : b.x + BLOCK_W;
          y1 = a.y + HEADER / 2 + 6;
          y2 = b.y + HEADER / 2 + 6;
          const mx = (x1 + x2) / 2;
          d = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
        }

        return (
          <g key={`${from}->${to}`}>
            <path d={d} stroke={color} strokeWidth="1.5" fill="none" opacity="0.7" />
            <circle cx={x1} cy={y1} r="3" fill={color} />
            <circle cx={x2} cy={y2} r="3" fill={color} />
          </g>
        );
      })}
    </svg>
  );
}