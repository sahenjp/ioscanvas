import { lintDocument } from '../lib/hig';
import { useEditorStore } from '../store/editor';

export function TopBar() {
  const document = useEditorStore((state) => state.document);
  const resetDocument = useEditorStore((state) => state.resetDocument);
  const setExportOpen = useEditorStore((state) => state.setExportOpen);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const canUndo = useEditorStore((state) => state.past.length > 0);
  const canRedo = useEditorStore((state) => state.future.length > 0);
  const issues = lintDocument(document);
  const warnings = issues.filter((issue) => issue.severity === 'warning').length;
  const notes = issues.length - warnings;

  return (
    <header className="topbar">
      <div className="brand-mark" aria-label="iOS canvas"><span className="brand-square" />iOS canvas</div>
      <div className="document-name">{document.name}</div>
      <div className="topbar-spacer" />
      <div className={`lint-status ${warnings > 0 ? 'has-issues' : ''}`}>
        {warnings === 0 ? 'HIG clean' : `${warnings} warning${warnings === 1 ? '' : 's'}`}
        {notes > 0 && ` · ${notes} note${notes === 1 ? '' : 's'}`}
      </div>
      <button className="toolbar-button history-button" type="button" onClick={undo} disabled={!canUndo} aria-label="Undo">↶</button>
      <button className="toolbar-button history-button" type="button" onClick={redo} disabled={!canRedo} aria-label="Redo">↷</button>
      <button className="toolbar-button" type="button" onClick={resetDocument}>Reset</button>
      <button className="primary-toolbar-button" type="button" onClick={() => setExportOpen(true)}>Export</button>
    </header>
  );
}
