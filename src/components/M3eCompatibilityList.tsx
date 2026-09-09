import { useState } from 'react';
import { describeM3eCompatibilityStatus, type M3eCompatibilityAnomaly, type M3eCompatibilityTarget } from '../lib/m3e';
import { copyText } from '../lib/share';

interface M3eCompatibilityListProps {
  anomalies: M3eCompatibilityAnomaly[];
  resolvePath: (path: string) => M3eCompatibilityTarget | null;
  onSelectTarget: (target: M3eCompatibilityTarget, path: string) => void;
  pathCaption: string;
}

export function M3eCompatibilityList({ anomalies, resolvePath, onSelectTarget, pathCaption }: M3eCompatibilityListProps) {
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [copyError, setCopyError] = useState(false);

  const copyPath = async (path: string) => {
    try {
      await copyText(path);
      setCopyError(false);
      setCopiedPath(path);
      window.setTimeout(() => setCopiedPath((current) => current === path ? null : current), 1200);
    } catch {
      setCopiedPath(null);
      setCopyError(true);
    }
  };

  return (
    <>
      <ul className="m3e-anomaly-list">
        {anomalies.map((anomaly) => (
          <li key={`${anomaly.code}-${anomaly.label}`} className={`m3e-anomaly-${anomaly.status}`}>
            <div className="m3e-anomaly-heading">
              <span className="m3e-anomaly-status">{describeM3eCompatibilityStatus(anomaly.status)}</span>
              <strong>{anomaly.label}</strong>
            </div>
            <span>{anomaly.detail}</span>
            <small>{anomaly.guidance}</small>
            {anomaly.paths.length > 0 && (
              <div className="m3e-anomaly-targets" aria-label={`${anomaly.label}の${pathCaption}`}>
                {anomaly.paths.map((path) => {
                  const target = resolvePath(path);
                  return (
                    <div className="m3e-anomaly-path-row" key={path}>
                      {target ? (
                        <button type="button" className="m3e-anomaly-target-button" onClick={() => onSelectTarget(target, path)}>
                          {target.scope === 'document' ? 'メタデータを確認' : target.nodeId ? '要素を選択' : '画面を表示'} <code>{path}</code>
                        </button>
                      ) : (
                        <span className="m3e-anomaly-unresolved-path">
                          <span>{pathCaption}のみ</span>
                          <code>{path}</code>
                        </span>
                      )}
                      <button
                        type="button"
                        className="m3e-anomaly-copy-button"
                        onClick={() => void copyPath(path)}
                        aria-label={`${pathCaption}をコピー: ${path}`}
                        title={`${pathCaption}をコピー`}
                      >
                        {copiedPath === path ? 'コピー済み' : 'パスをコピー'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </li>
        ))}
      </ul>
      {copyError && <span className="m3e-anomaly-copy-error" role="status">パスをコピーできません。</span>}
    </>
  );
}
