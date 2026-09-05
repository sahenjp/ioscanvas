import type { CanvasDocument, CanvasNode } from '../types/document';

export type LintSeverity = 'warning' | 'info';

export interface LintIssue {
  nodeId: string;
  severity: LintSeverity;
  code:
    | 'HIT_TARGET'
    | 'TEXT_SIZE'
    | 'DYNAMIC_TYPE'
    | 'EMPTY_LABEL'
    | 'EMPTY_SECTION'
    | 'FIXED_HEIGHT'
    | 'NAVIGATION_STRUCTURE'
    | 'ACCESSIBILITY';
  message: string;
}

function lintNode(node: CanvasNode, issues: LintIssue[]): void {
  if (node.kind === 'button' || node.kind === 'toggle' || node.kind === 'textfield') {
    if (node.minHeight < 44) {
      issues.push({
        nodeId: node.id,
        severity: 'warning',
        code: 'HIT_TARGET',
        message: '操作領域は44pt以上を推奨します。',
      });
    }
    if (node.minHeight > 88) {
      issues.push({
        nodeId: node.id,
        severity: 'warning',
        code: 'FIXED_HEIGHT',
        message: '固定高さが大きく、Dynamic Typeや内容の折り返しを妨げる可能性があります。',
      });
    }
    if (node.label.trim().length === 0) {
      issues.push({
        nodeId: node.id,
        severity: 'warning',
        code: 'EMPTY_LABEL',
        message: '操作要素には表示ラベルとVoiceOverで理解できる名前を付けてください。',
      });
    }
  }

  if (node.kind === 'text') {
    if (node.fontSize < 11) {
      issues.push({
        nodeId: node.id,
        severity: 'warning',
        code: 'TEXT_SIZE',
        message: 'テキストは11pt以上を推奨します。',
      });
    }
    issues.push({
      nodeId: node.id,
      severity: 'info',
      code: 'DYNAMIC_TYPE',
      message: '固定サイズのフォントはDynamic Typeで拡大されない可能性があります。',
    });
  }

  if (node.kind === 'image' && node.systemName.trim().length === 0) {
    issues.push({
      nodeId: node.id,
      severity: 'warning',
      code: 'ACCESSIBILITY',
      message: 'ImageのSF Symbol名が空です。表示する意味のある画像を指定してください。',
    });
  }

  if (node.kind === 'section') {
    if (node.children.length === 0) {
      issues.push({
        nodeId: node.id,
        severity: 'warning',
        code: 'EMPTY_SECTION',
        message: 'Sectionに表示する子要素がありません。',
      });
    }
    if (node.children.length > 0) {
      issues.push({
        nodeId: node.id,
        severity: 'info',
        code: 'NAVIGATION_STRUCTURE',
        message: 'Sectionは生成コードではScrollView内に配置されます。ListまたはFormが必要か確認してください。',
      });
    }
  }

  if (node.kind === 'hstack') {
    const controls = node.children.filter((child) =>
      child.kind === 'button' || child.kind === 'toggle' || child.kind === 'textfield',
    );
    if (controls.length > 1 && (node.spacing ?? 0) < 8) {
      issues.push({
        nodeId: node.id,
        severity: 'warning',
        code: 'ACCESSIBILITY',
        message: 'HStack内の操作要素が近すぎます。VoiceOver操作と44ptの操作領域が干渉しないか確認してください。',
      });
    }
  }

  node.children?.forEach((child) => lintNode(child, issues));
}

export function lintDocument(document: CanvasDocument): LintIssue[] {
  const issues: LintIssue[] = [];
  for (const screen of document.screens) {
    if (screen.navigationTitle.trim().length === 0) {
      issues.push({
        nodeId: screen.root.id,
        severity: 'warning',
        code: 'NAVIGATION_STRUCTURE',
        message: 'NavigationStackのタイトルが空です。画面の階層と目的が伝わるタイトルを設定してください。',
      });
    }
    screen.root.children.forEach((node) => lintNode(node, issues));
  }
  return issues;
}
