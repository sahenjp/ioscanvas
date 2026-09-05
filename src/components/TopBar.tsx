import { lintDocument } from '../lib/hig';
import { useEditorStore } from '../store/editor';

export function TopBar() {
  const document = useEditorStore((state) => state.document);
  const resetDocument = useEditorStore((state) => state.resetDocument);
  const setExportOpen = useEditorStore((state) => state.setExportOpen);
  const issues = lintDocument(document);

  return (
    <header className="topbar">
      <div className="brand-mark" aria-label="iOS canvas"><span className="brand-square" />iOS canvas</div>
      <div className="document-name">{document.name}</div>
      <div className="topbar-spacer" />
      <div className={`lint-status ${issues.length > 0 ? 'has-issues' : ''}`}>{issues.length === 0 ? 'HIG clean' : `${issues.length} warning${issues.length === 1 ? '' : 's'}`}</div>
      <button className="toolbar-button" type="button" onClick={resetDocument}>Reset</button>
      <button className="primary-toolbar-button" type="button" onClick={() => setExportOpen(true)}>Export</button>
    </header>
  );
}
