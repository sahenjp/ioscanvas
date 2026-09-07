import { lintDocument } from './hig';
import type { CanvasDocument, CanvasNode } from '../types/document';

function describe(node: CanvasNode, depth = 0): string[] {
  const pad = '  '.repeat(depth);
  const common = `${pad}- ${node.kind}${node.glass ? ` / glass=${node.glass}` : ''}`;
  switch (node.kind) {
    case 'text':
      return [`${common}: ${node.text} / ${node.fontSize}pt / ${node.weight}`];
    case 'button':
      return [`${common}: ${node.label} / role=${node.role}`];
    case 'toggle':
      return [`${common}: ${node.label} / binding=${node.binding}`];
    case 'textfield':
      return [`${common}: ${node.label} / binding=${node.binding}`];
    case 'navigation-link':
      return [`${common}: ${node.label} / destination=${node.destinationScreenId || 'unset'}`];
    case 'image':
      return [`${common}: ${node.systemName} / accessibility=${node.accessibilityLabel || 'decorative'}`];
    case 'section':
      return [`${common}: ${node.title ?? 'Section'}`, ...node.children.flatMap((child) => describe(child, depth + 1))];
    case 'vstack':
    case 'hstack':
    case 'list':
    case 'form':
      return [common, ...node.children.flatMap((child) => describe(child, depth + 1))];
    default:
      return [common];
  }
}

export function generateImplementationPrompt(document: CanvasDocument): string {
  const screen = document.screens.find((candidate) => candidate.id === document.activeScreenId) ?? document.screens[0];
  if (!screen) return '';
  const issues = lintDocument(document);

  return [
    'SwiftUIでこの画面を実装してください。',
    '',
    `対象: iOS ${document.minimumOS}以降 / SwiftUI`,
    `画面: ${screen.name}`,
    `ナビゲーションタイトル: ${screen.navigationTitle}`,
    `外観: ${document.appearance.colorScheme} / tint=${document.appearance.accentColor}`,
    '',
    '構造:',
    ...screen.root.children.flatMap((node) => describe(node)),
    '',
    '実装ルール:',
    '- SwiftUI標準コンポーネントを優先し、iOS標準UIをCSS的に再現しない。',
    '- Dynamic Type、VoiceOver、Reduce Motionを考慮する。',
    '- Safe Areaを尊重する。',
    '- 操作領域は原則44x44pt以上を確保する。',
    '- 不要な抽象化や独自デザインシステムを追加しない。',
    '- この仕様にない画面・機能を勝手に増やさない。',
    ...(issues.length > 0
      ? ['', '現在のデザイン警告:', ...issues.map((issue) => `- ${issue.message} (${issue.nodeId})`)]
      : []),
  ].join('\n');
}
