import type { CanvasDocument, CanvasNode } from '../types/document';

export type LintSeverity = 'warning' | 'info';

export interface LintIssue {
  nodeId: string;
  severity: LintSeverity;
  code: 'HIT_TARGET' | 'TEXT_SIZE' | 'EMPTY_LABEL';
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
  }

  if (node.kind === 'text' && node.fontSize < 11) {
    issues.push({
      nodeId: node.id,
      severity: 'warning',
      code: 'TEXT_SIZE',
      message: 'テキストは11pt以上を推奨します。',
    });
  }

  if ('label' in node && typeof node.label === 'string' && node.label.trim().length === 0) {
    issues.push({
      nodeId: node.id,
      severity: 'warning',
      code: 'EMPTY_LABEL',
      message: '操作要素には分かりやすいラベルを付けてください。',
    });
  }

  node.children?.forEach((child) => lintNode(child, issues));
}

export function lintDocument(document: CanvasDocument): LintIssue[] {
  const issues: LintIssue[] = [];
  for (const screen of document.screens) {
    screen.root.children.forEach((node) => lintNode(node, issues));
  }
  return issues;
}
