import { useEffect, useState } from 'react';
import { IconCopy } from './Icons';

async function writeClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  ta.remove();
}

export function CopyButton({ text, label = 'Copy report' }: { text: string; label?: string }) {
  const [status, setStatus] = useState<'idle' | 'done' | 'failed'>('idle');
  useEffect(() => {
    if (status === 'idle') return;
    const t = setTimeout(() => setStatus('idle'), 2000);
    return () => clearTimeout(t);
  }, [status]);
  return (
    <button
      type="button"
      className="btn btn--small"
      onClick={() => writeClipboard(text).then(() => setStatus('done'), () => setStatus('failed'))}
    >
      <IconCopy />
      <span aria-live="polite">{status === 'done' ? 'Copied' : status === 'failed' ? 'Copy failed' : label}</span>
    </button>
  );
}
