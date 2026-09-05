import { useRef, useState } from 'react';
import { parseCanvasDocument } from '../lib/document';
import { lintDocument } from '../lib/hig';
import { useEditorStore } from '../store/editor';

export function TopBar() {
  const document = useEditorStore((state) => state.document);
  const loadDocument = useEditorStore((state) => state.loadDocument);
  const resetDocument = useEditorStore((state) => state.resetDocument);
  const setExportOpen = useEditorStore((state) => state.setExportOpen);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const canUndo = useEditorStore((state) => state.past.length > 0);
  const canRedo = useEditorStore((state) => state.future.length > 0);
  const fileInput = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const issues = lintDocument(document);
  const warnings = issues.filter((issue) => issue.severity === 'warning').length;
  const notes = issues.length - warnings;

  const saveProject = () => {
    const baseName = document.name.trim().replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '') || 'ioscanvas';
    const blob = new Blob([JSON.stringify(document, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement('a');
    anchor.href = url;
    anchor.download = `${baseName}.ioscanvas.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setFileError(null);
  };

  const openProject = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const raw: unknown = JSON.parse(await file.text());
      const parsed = parseCanvasDocument(raw);
      if (!parsed) throw new Error('Invalid project file');
      loadDocument(parsed);
      setFileError(null);
    } catch {
      setFileError('Could not open that project file.');
    }
  };

  return (
    <header className="topbar">
      <div className="brand-mark" aria-label="iOS canvas"><span className="brand-square" />iOS canvas</div>
      <div className="document-name">{document.name}</div>
      <div className="topbar-spacer" />
      <div className={`lint-status ${warnings > 0 ? 'has-issues' : ''}`}>
        {warnings === 0 ? 'HIG clean' : `${warnings} warning${warnings === 1 ? '' : 's'}`}
        {notes > 0 && ` · ${notes} note${notes === 1 ? '' : 's'}`}
      </div>
      {fileError && <span className="project-error" role="status">{fileError}</span>}
      <input ref={fileInput} className="visually-hidden" type="file" accept=".json,.ioscanvas,application/json" onChange={openProject} />
      <button className="toolbar-button" type="button" onClick={() => fileInput.current?.click()}>Open</button>
      <button className="toolbar-button" type="button" onClick={saveProject}>Save</button>
      <button className="toolbar-button history-button" type="button" onClick={undo} disabled={!canUndo} aria-label="Undo">↶</button>
      <button className="toolbar-button history-button" type="button" onClick={redo} disabled={!canRedo} aria-label="Redo">↷</button>
      <button className="toolbar-button" type="button" onClick={resetDocument}>Reset</button>
      <button className="primary-toolbar-button" type="button" onClick={() => setExportOpen(true)}>Export</button>
    </header>
  );
}
