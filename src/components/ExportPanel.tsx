import { useEffect, useMemo, useState } from 'react';
import { generateImplementationPrompt } from '../lib/prompt';
import { generateSwiftUI } from '../lib/swiftui';
import { useEditorStore } from '../store/editor';

type ExportTab = 'swiftui' | 'prompt';

export function ExportPanel() {
  const open = useEditorStore((state) => state.exportOpen);
  const setOpen = useEditorStore((state) => state.setExportOpen);
  const document = useEditorStore((state) => state.document);
  const [tab, setTab] = useState<ExportTab>('swiftui');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const swiftui = useMemo(() => generateSwiftUI(document), [document]);
  const prompt = useMemo(() => generateImplementationPrompt(document), [document]);
  const value = tab === 'swiftui' ? swiftui : prompt;

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open, setOpen]);

  if (!open) return null;

  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(value);
      setCopyError(false);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
      setCopyError(true);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
      <section className="export-panel" role="dialog" aria-modal="true" aria-label="Export" onMouseDown={(event) => event.stopPropagation()}>
        <header className="export-header">
          <div>
            <strong>Export</strong>
            <span>Use the structure, not a screenshot guess.</span>
          </div>
          <button type="button" className="icon-button" onClick={() => setOpen(false)} aria-label="Close">×</button>
        </header>
        <div className="export-tabs">
          <button type="button" className={tab === 'swiftui' ? 'active' : ''} onClick={() => setTab('swiftui')}>SwiftUI</button>
          <button type="button" className={tab === 'prompt' ? 'active' : ''} onClick={() => setTab('prompt')}>Codex prompt</button>
        </div>
        <pre className="export-code"><code>{value}</code></pre>
        <footer className="export-footer">
          <span>{copyError ? 'Copy failed. Select the text manually.' : tab === 'swiftui' ? 'Generated from the document tree.' : 'Includes implementation constraints and current HIG warnings.'}</span>
          <button type="button" className="primary-toolbar-button" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
        </footer>
      </section>
    </div>
  );
}
