import { useEffect, useMemo, useState } from 'react';
import { generateImplementationPrompt, type PromptScope } from '../lib/prompt';
import { copyText } from '../lib/share';
import { generateSwiftUI } from '../lib/swiftui';
import { useEditorStore } from '../store/editor';

type ExportTab = 'swiftui' | 'prompt';

export function ExportPanel() {
  const open = useEditorStore((state) => state.exportOpen);
  const setOpen = useEditorStore((state) => state.setExportOpen);
  const document = useEditorStore((state) => state.document);
  const [tab, setTab] = useState<ExportTab>('swiftui');
  const [promptScope, setPromptScope] = useState<PromptScope>('active');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const swiftui = useMemo(() => generateSwiftUI(document), [document]);
  const prompt = useMemo(() => generateImplementationPrompt(document, promptScope), [document, promptScope]);
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
      await copyText(value);
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
      <section className="export-panel" role="dialog" aria-modal="true" aria-label="SwiftUIを書き出す" onMouseDown={(event) => event.stopPropagation()}>
        <header className="export-header">
          <div>
            <strong>SwiftUIを書き出す</strong>
            <span>意味構造から実装コードを生成します。</span>
          </div>
          <button type="button" className="icon-button" onClick={() => setOpen(false)} aria-label="閉じる">×</button>
        </header>
        <div className="export-tabs">
          <button type="button" className={tab === 'swiftui' ? 'active' : ''} onClick={() => setTab('swiftui')}>SwiftUIコード</button>
          <button type="button" className={tab === 'prompt' ? 'active' : ''} onClick={() => setTab('prompt')}>実装の説明</button>
          {tab === 'prompt' && (
            <label className="export-scope">
              <span>対象</span>
              <select value={promptScope} onChange={(event) => setPromptScope(event.target.value as PromptScope)} aria-label="実装の説明の対象">
                <option value="active">現在の画面</option>
                <option value="all">全画面</option>
              </select>
            </label>
          )}
        </div>
        <pre className="export-code"><code>{value}</code></pre>
        <footer className="export-footer">
          <span>{copyError ? 'コピーできません。テキストを手動で選択してください。' : tab === 'swiftui' ? 'ドキュメントの意味構造から生成' : '実装条件と現在のHIGチェックを含みます。'}</span>
          <button type="button" className="primary-toolbar-button" onClick={copy}>{copied ? 'コピーしました' : 'コピー'}</button>
        </footer>
      </section>
    </div>
  );
}
