import { useRef, useState } from 'react';
import { parseCanvasDocument } from '../lib/document';
import { convertM3eDocument, inspectM3eCompatibility } from '../lib/m3e';
import { lintDocument } from '../lib/hig';
import { findNode } from '../lib/nodes';
import { copyText, createShareUrl } from '../lib/share';
import { useEditorStore } from '../store/editor';

export function TopBar() {
  const document = useEditorStore((state) => state.document);
  const selectScreen = useEditorStore((state) => state.selectScreen);
  const selectNode = useEditorStore((state) => state.selectNode);
  const previewMode = useEditorStore((state) => state.previewMode);
  const setPreviewMode = useEditorStore((state) => state.setPreviewMode);
  const loadDocument = useEditorStore((state) => state.loadDocument);
  const resetDocument = useEditorStore((state) => state.resetDocument);
  const setExportOpen = useEditorStore((state) => state.setExportOpen);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const canUndo = useEditorStore((state) => state.past.length > 0);
  const canRedo = useEditorStore((state) => state.future.length > 0);
  const selectedNodeId = useEditorStore((state) => state.selectedNodeId);
  const clipboard = useEditorStore((state) => state.clipboard);
  const copySelectedNode = useEditorStore((state) => state.copySelectedNode);
  const pasteNode = useEditorStore((state) => state.pasteNode);
  const fileInput = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileNotice, setFileNotice] = useState<string | null>(null);
  const [shareState, setShareState] = useState<'idle' | 'copied' | 'error'>('idle');
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
      const imported = parsed ? null : convertM3eDocument(raw);
      const loadedDocument = parsed ?? imported;
      if (!loadedDocument) throw new Error('Invalid project file');
      loadDocument(loadedDocument);
      const report = imported ? inspectM3eCompatibility(raw) : null;
      if (report) {
        const details = [
          report.invalidFrameCount > 0 ? `無効な画面${report.invalidFrameCount}件` : '',
          report.invalidGroupCount > 0 ? `無効なグループ${report.invalidGroupCount}件` : '',
          report.orphanedGroupCount > 0 ? `画面外グループ${report.orphanedGroupCount}件` : '',
          report.discardedItemCount > 0 ? `破棄した項目${report.discardedItemCount}件` : '',
          report.unresolvedDestinationCount > 0 ? `未解決の遷移${report.unresolvedDestinationCount}件` : '',
          report.unsupportedKinds.length > 0 ? `未対応パーツ: ${report.unsupportedKinds.join(', ')}` : '',
        ].filter(Boolean);
        setFileNotice(details.length > 0 ? `M3E互換確認: ${details.join(' / ')}` : null);
      } else {
        setFileNotice(null);
      }
      setFileError(null);
    } catch {
      setFileError('プロジェクトファイルを開けませんでした。');
      setFileNotice(null);
    }
  };

  const shareProject = async () => {
    try {
      await copyText(createShareUrl(document, window.location.href));
      setShareState('copied');
      window.setTimeout(() => setShareState('idle'), 1600);
    } catch {
      setShareState('error');
    }
  };

  const resetProject = () => {
    if (window.confirm('現在のプロジェクトを初期状態に戻します。変更内容はUndoで戻せます。続けますか？')) resetDocument();
  };

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <div className="brand-mark" aria-label="S3E Canvas">S3E Canvas</div>
        <span className="brand-divider" aria-hidden="true" />
        <div className="topbar-document">
          <span className="topbar-eyebrow">プロジェクト</span>
          <strong className="document-name">{document.name}</strong>
        </div>
      </div>

      <nav className="topbar-edit-actions" aria-label="編集操作">
        <button className="toolbar-button history-button" type="button" onClick={undo} disabled={!canUndo} aria-label="元に戻す" title="元に戻す">
          <span aria-hidden="true">↶</span><span>元に戻す</span>
        </button>
        <button className="toolbar-button history-button" type="button" onClick={redo} disabled={!canRedo} aria-label="やり直す" title="やり直す">
          <span aria-hidden="true">↷</span><span>やり直す</span>
        </button>
        <span className="toolbar-divider" aria-hidden="true" />
        <button className="toolbar-button clipboard-button" type="button" onClick={copySelectedNode} disabled={!selectedNodeId} title="選択した要素をコピー（⌘C / Ctrl+C）">コピー</button>
        <button className="toolbar-button clipboard-button" type="button" onClick={pasteNode} disabled={!clipboard} title="コピーした要素を貼り付け（⌘V / Ctrl+V）">貼り付け</button>
        <span className="toolbar-divider" aria-hidden="true" />
        <button className={`toolbar-button preview-button ${previewMode ? 'is-active' : ''}`} type="button" onClick={() => setPreviewMode(!previewMode)} aria-pressed={previewMode}>
          {previewMode ? '編集に戻る' : 'プレビュー'}
        </button>
      </nav>

      <div className="topbar-spacer" />

      <div className="topbar-status">
        <button className={`lint-status ${warnings > 0 ? 'has-issues' : ''}`} type="button" onClick={focusFirstIssue} disabled={issues.length === 0} aria-label="HIGチェックを表示">
          <span className="status-label">HIG</span>
          <span>{warnings === 0 ? '問題なし' : `${warnings}件の警告`}</span>
          {notes > 0 && <span className="status-notes">補足 {notes}</span>}
        </button>
        {fileError && <span className="project-error" role="status">{fileError}</span>}
        {fileNotice && <span className="project-notice" role="status">{fileNotice}</span>}
      </div>

      <div className="topbar-actions">
        <input ref={fileInput} className="visually-hidden" type="file" accept=".json,.ioscanvas,application/json" onChange={openProject} />
        <button className="toolbar-button" type="button" onClick={() => fileInput.current?.click()}>開く</button>
        <button className="toolbar-button" type="button" onClick={saveProject}>保存</button>
        <button className="toolbar-button" type="button" onClick={shareProject} aria-label="共有リンクをコピー">
          {shareState === 'copied' ? 'リンクをコピーしました' : shareState === 'error' ? '共有できません' : '共有'}
        </button>
        <span className="toolbar-divider" aria-hidden="true" />
        <button className="toolbar-button" type="button" onClick={resetProject}>リセット</button>
        <button className="primary-toolbar-button" type="button" onClick={() => setExportOpen(true)}>書き出す</button>
      </div>
    </header>
  );
}
