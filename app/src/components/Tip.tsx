import { useEffect, useId, useState } from 'react';
import { IconInfo } from './Icons';

/** Help tooltip reachable by keyboard and hover; Escape dismisses it. */
export function Tip({ text, label }: { text: string; label: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  return (
    <span className="tip" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className="tip__btn"
        aria-label={`About ${label}`}
        aria-describedby={id}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((o) => !o)}
      >
        <IconInfo />
      </button>
      <span role="tooltip" id={id} className={`tip__bubble${open ? ' is-open' : ''}`}>
        {text}
      </span>
    </span>
  );
}
