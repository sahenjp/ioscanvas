import type { CanvasNode, NodeKind } from '../types/document';

let sequence = 0;

export function createId(prefix = 'node'): string {
  sequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${sequence.toString(36)}`;
}

export function createNode(kind: NodeKind): CanvasNode {
  const id = createId(kind);
  switch (kind) {
    case 'text':
      return { id, kind, text: 'Text', fontSize: 17, weight: 'regular' };
    case 'button':
      return { id, kind, label: 'Button', role: 'normal', minHeight: 44 };
    case 'toggle':
      return { id, kind, label: 'Toggle', binding: 'isEnabled', minHeight: 44 };
    case 'textfield':
      return { id, kind, label: 'Text field', binding: 'value', minHeight: 44 };
    case 'vstack':
      return { id, kind, spacing: 12, children: [] };
    case 'hstack':
      return { id, kind, spacing: 8, children: [] };
    case 'section':
      return { id, kind, title: 'Section', children: [] };
    case 'divider':
      return { id, kind };
    case 'spacer':
      return { id, kind };
  }
}

export function updateNode(nodes: CanvasNode[], id: string, patch: Partial<CanvasNode>): CanvasNode[] {
  return nodes.map((node) => {
    if (node.id === id) {
      return { ...node, ...patch } as CanvasNode;
    }
    if (node.children) {
      return { ...node, children: updateNode(node.children, id, patch) } as CanvasNode;
    }
    return node;
  });
}

export function removeNode(nodes: CanvasNode[], id: string): CanvasNode[] {
  return nodes
    .filter((node) => node.id !== id)
    .map((node) =>
      node.children ? ({ ...node, children: removeNode(node.children, id) } as CanvasNode) : node,
    );
}

export function findNode(nodes: CanvasNode[], id: string): CanvasNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNode(node.children, id);
      if (found) return found;
    }
  }
  return undefined;
}
