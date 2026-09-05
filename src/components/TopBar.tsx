import { useRef, useState } from 'react';
import { parseCanvasDocument } from '../lib/document';
import { lintDocument } from '../lib/hig';
import { findNode } from '../lib/nodes';
import { useEditorStore } from '../store/editor';

export function TopBar() {
  const document = useEditorStore((state) => state.document);
  const selectScreen = useEditorStore((state) => state.selectScreen);
  const selectNode = useEditorStore((state) => state.selectNode);
  const addScreen = useEditorStore((state) => state.addScreen);
  const duplicateActiveScreen = useEditorStore((state) => state.duplicateActiveScreen);
  const deleteActiveScreen = useEditorStore((state) => state.deleteActiveScreen);
  const previewMode = useEditorStore((state) => state.previewMode);
  const setPreviewMode = useEditorStore((state) => state.setPreviewMode);
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

  const focusFirstIssue = () => {
    const issue = issues[0];
    if (!issue) return;
    const owner = document.screens.find((candidate) =>
      candidate.root.id === issue.nodeId || Boolean(findNode(candidate.root.children, issue.nodeId)),
    );
    if (!owner) return;
    if (owner.id !== document.activeScreenId) selectScreen(owner.id);
    selectNode(owner.root.id === issue.nodeId ? null : issue.nodeId);
  };

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
      <div className="topbar-brand">
        <div className="brand-mark" aria-label="iOS canvas"><span className="brand-square" />iOS canvas</div>
        <div className="topbar-document">
          <span className="topbar-eyebrow">Design file</span>
          <span className="document-name">{document.name}</span>
        </div>
      </div>
      <div className="topbar-context">
        <span>Screen</span>
        <select value={document.activeScreenId} onChange={(event) => selectScreen(event.target.value)} aria-label="Active screen">
          {document.screens.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}
        </select>
      </div>
      <div className="screen-actions">
        <button className="compact-toolbar-button" type="button" onClick={addScreen} aria-label="Add screen" title="Add screen">+</button>
        <button className="compact-toolbar-button" type="button" onClick={duplicateActiveScreen} aria-label="Duplicate screen" title="Duplicate screen">⧉</button>
        <button className="compact-toolbar-button" type="button" onClick={deleteActiveScreen} disabled={document.screens.length <= 1} aria-label="Delete screen" title="Delete screen">−</button>
      </div>
      <div className="topbar-spacer" />
      <div className="topbar-status">
        <button className={`lint-status ${warnings > 0 ? 'has-issues' : ''}`} type="button" onClick={focusFirstIssue} disabled={issues.length === 0} aria-label="Show first HIG issue">
          <span className="status-dot" aria-hidden="true" />
          <span>{warnings === 0 ? 'HIG clean' : `${warnings} warning${warnings === 1 ? '' : 's'}`}</span>
          {notes > 0 && <span className="status-notes">{notes} note{notes === 1 ? '' : 's'}</span>}
        </button>
        {fileError && <span className="project-error" role="status">{fileError}</span>}
      </div>
      <div className="topbar-actions">
        <input ref={fileInput} className="visually-hidden" type="file" accept=".json,.ioscanvas,application/json" onChange={openProject} />
        <button className="toolbar-button" type="button" onClick={() => fileInput.current?.click()}>Open</button>
        <button className="toolbar-button" type="button" onClick={saveProject}>Save</button>
        <span className="toolbar-divider" aria-hidden="true" />
        <button className="toolbar-button history-button" type="button" onClick={undo} disabled={!canUndo} aria-label="Undo">↶</button>
        <button className="toolbar-button history-button" type="button" onClick={redo} disabled={!canRedo} aria-label="Redo">↷</button>
        <button className="toolbar-button" type="button" onClick={resetDocument}>Reset</button>
        <button className={`toolbar-button preview-button ${previewMode ? 'is-active' : ''}`} type="button" onClick={() => setPreviewMode(!previewMode)} aria-pressed={previewMode}>{previewMode ? 'Edit' : 'Preview'}</button>
        <button className="primary-toolbar-button" type="button" onClick={() => setExportOpen(true)}>Export code</button>
      </div>
    </header>
  );
}
