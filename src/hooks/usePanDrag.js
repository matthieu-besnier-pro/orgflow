import { useRef, useState } from 'react';

// Déplacement du canevas au glisser-souris (sur le fond uniquement)
export default function usePanDrag() {
  const ref = useRef(null);
  const state = useRef(null);
  const [panning, setPanning] = useState(false);

  const onMouseDown = (e) => {
    // ne pas capturer les clics sur les cartes / boutons
    if (e.button !== 0 || e.target.closest('[draggable="true"], button, input, a')) return;
    const el = ref.current;
    if (!el) return;
    state.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop };
    setPanning(true);
  };

  const onMouseMove = (e) => {
    if (!state.current || !ref.current) return;
    ref.current.scrollLeft = state.current.left - (e.clientX - state.current.x);
    ref.current.scrollTop = state.current.top - (e.clientY - state.current.y);
  };

  const stop = () => { state.current = null; setPanning(false); };

  return {
    ref,
    panning,
    handlers: { onMouseDown, onMouseMove, onMouseUp: stop, onMouseLeave: stop },
  };
}