import { useEffect, useMemo, useState } from 'react';
import { generateImplementationPrompt, type PromptScope } from '../lib/prompt';
import { describeM3eCompatibilityFields, describeM3eCompatibilityKinds, describeM3eCompatibilityStatus, generateM3eJson, getM3eCompatibilityAnomalies, inspectM3eExportCompatibility } from '../lib/m3e';
import { copyText } from '../lib/share';
import { generateSwiftUI } from '../lib/swiftui';
import { useEditorStore } from '../store/editor';

type ExportTab = 'swiftui' | 'prompt' | 'm3e';

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
  const m3e = useMemo(() => generateM3eJson(document), [document]);
  const m3eReport = useMemo(() => inspectM3eExportCompatibility(document), [document]);
  const m3eAnomalies = useMemo(() => getM3eCompatibilityAnomalies(m3eReport), [m3eReport]);
  const value = tab === 'swiftui' ? swiftui : tab === 'prompt' ? prompt : m3e;
  const m3eHasWarnings = m3eAnomalies.length > 0;
  const lostAnomalyCount = m3eAnomalies.filter((anomaly) => anomaly.status === 'lost').length;
  const unresolvedAnomalyCount = m3eAnomalies.filter((anomaly) => anomaly.status === 'unresolved').length;
  const approximatedAnomalyCount = m3eAnomalies.filter((anomaly) => anomaly.status === 'approximated').length;

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

  const saveM3e = () => {
    const url = URL.createObjectURL(new Blob([m3e], { type: 'application/json' }));
    const anchor = window.document.createElement('a');
    anchor.href = url;
    anchor.download = `${document.name.trim().replace(/[^a-z0-9_-]+/gi, '-') || 'ioscanvas'}.m3e.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
      <section className={`export-panel ${tab === 'm3e' ? 'has-compatibility' : ''}`} role="dialog" aria-modal="true" aria-label="設計を書き出す" onMouseDown={(event) => event.stopPropagation()}>
        <header className="export-header">
          <div>
            <strong>設計を書き出す</strong>
            <span>意味構造から実装コードと互換データを生成します。</span>
          </div>
          <button type="button" className="icon-button" onClick={() => setOpen(false)} aria-label="閉じる">×</button>
        </header>
        <div className="export-tabs">
          <button type="button" className={tab === 'swiftui' ? 'active' : ''} onClick={() => setTab('swiftui')}>SwiftUIコード</button>
          <button type="button" className={tab === 'prompt' ? 'active' : ''} onClick={() => setTab('prompt')}>実装の説明</button>
          <button type="button" className={tab === 'm3e' ? 'active' : ''} onClick={() => setTab('m3e')}>M3E JSON</button>
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
        {tab === 'm3e' && (
          <div className={`m3e-compatibility ${m3eHasWarnings ? 'has-warning' : ''}`} role="status" aria-label="M3E互換診断">
            <strong>M3E互換診断</strong>
            <div className="m3e-compatibility-summary" aria-live="polite">
              <span className={m3eHasWarnings ? 'has-anomalies' : 'is-clean'}>{m3eHasWarnings ? `互換異常 ${m3eAnomalies.length}件` : '互換異常なし'}</span>
              {lostAnomalyCount > 0 && <span>要確認 {lostAnomalyCount}件</span>}
              {unresolvedAnomalyCount > 0 && <span>未解決 {unresolvedAnomalyCount}件</span>}
              {approximatedAnomalyCount > 0 && <span>近似 {approximatedAnomalyCount}件</span>}
            </div>
            <span>出力要素 {m3eReport.flattenedItemCount}件 / 構造平坦化 {m3eReport.flattenedPaths.length}箇所 / {m3eReport.normalizedScreenCount}画面を端末プリセットへ正規化</span>
            <span>再読込検証: {m3eReport.roundTripValid ? '成功' : '要確認'}</span>
            {m3eReport.unsupportedNodeKinds.length > 0 && <span>直接対応なし: {m3eReport.unsupportedNodeKinds.join(', ')}</span>}
            {m3eReport.flattenedNodeKinds.length > 0 && <span>構造平坦化: {m3eReport.flattenedNodeKinds.join(', ')}</span>}
            {m3eReport.approximatedKinds.length > 0 && <span>近似変換: {describeM3eCompatibilityKinds(m3eReport.approximatedKinds)}</span>}
            {m3eReport.unresolvedDestinationCount > 0 && <span>未解決の遷移: {m3eReport.unresolvedDestinationCount}件</span>}
            {m3eReport.unresolvedActionCount > 0 && <span>未解決の操作: {m3eReport.unresolvedActionCount}件</span>}
            {m3eReport.lostActionPaths.length > 0 && <span>出力できない操作: {m3eReport.lostActionPaths.length}件</span>}
            {m3eReport.preservedFields.length > 0 && <span>保持フィールド: {m3eReport.preservedFields.length}件</span>}
            {m3eReport.approximatedFields.length > 0 && <span>近似フィールド: {describeM3eCompatibilityFields(m3eReport.approximatedFields)}</span>}
            {m3eReport.lostFields.length > 0 && <span>出力できないフィールド: {m3eReport.lostFields.join(', ')}</span>}
            {m3eReport.invalidFields.length > 0 && <span>不正な値: {m3eReport.invalidFields.join(', ')}</span>}
            {m3eReport.duplicateIdFields.length > 0 && <span>重複したID: {m3eReport.duplicateIdFields.join(', ')}</span>}
            {m3eReport.unknownFields.length > 0 && <span>未知のフィールド: {m3eReport.unknownFields.join(', ')}</span>}
            {m3eAnomalies.length > 0 && (
              <details className="m3e-anomaly-details">
                <summary>互換異常 {m3eAnomalies.length}件を確認</summary>
                <ul className="m3e-anomaly-list">
                  {m3eAnomalies.map((anomaly) => (
                    <li key={`${anomaly.code}-${anomaly.label}`} className={`m3e-anomaly-${anomaly.status}`}>
                      <div className="m3e-anomaly-heading">
                        <span className="m3e-anomaly-status">{describeM3eCompatibilityStatus(anomaly.status)}</span>
                        <strong>{anomaly.label}</strong>
                      </div>
                      <span>{anomaly.detail}</span>
                      <small>{anomaly.guidance}</small>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
        <pre className="export-code"><code>{value}</code></pre>
        <footer className="export-footer">
          <span>{copyError ? 'コピーできません。テキストを手動で選択してください。' : tab === 'swiftui' ? 'ドキュメントの意味構造から生成' : tab === 'prompt' ? '実装条件と現在のHIGチェックを含みます。' : 'M3E Canvasで開ける座標射影データとして生成'}</span>
          {tab === 'm3e' && <button type="button" onClick={saveM3e}>M3Eとして保存</button>}
          <button type="button" className="primary-toolbar-button" onClick={copy}>{copied ? 'コピーしました' : 'コピー'}</button>
        </footer>
      </section>
    </div>
  );
}
