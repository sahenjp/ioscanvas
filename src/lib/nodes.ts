import type { CanvasNode, ContainerNode, NodeKind } from '../types/document';

export const NODE_DRAG_MIME = 'application/x-ioscanvas-node';

export type DragData =
  | { kind: 'new'; nodeKind: NodeKind }
  | { kind: 'move'; nodeId: string };

const nodeKinds = new Set<NodeKind>([
  'vstack', 'hstack', 'section', 'text', 'button', 'toggle', 'textfield', 'image', 'divider', 'spacer',
]);

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
    case 'image':
      return { id, kind, systemName: 'star.fill', accessibilityLabel: 'Image' };
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

export function cloneNode(node: CanvasNode): CanvasNode {
  const cloned = { ...node, id: createId(node.kind) } as CanvasNode;
  if (node.children) cloned.children = node.children.map(cloneNode);
  return cloned;
}

export function isContainerNode(node: CanvasNode): node is ContainerNode {
  return node.kind === 'vstack' || node.kind === 'hstack' || node.kind === 'section';
}

export function encodeDragData(data: DragData): string {
  return JSON.stringify(data);
}

export function decodeDragData(value: string): DragData | null {
  try {
    const data: unknown = JSON.parse(value);
    if (!data || typeof data !== 'object') return null;

    if (
      'kind' in data &&
      data.kind === 'new' &&
      'nodeKind' in data &&
      typeof data.nodeKind === 'string' &&
      nodeKinds.has(data.nodeKind as NodeKind)
    ) {
      return { kind: 'new', nodeKind: data.nodeKind as NodeKind };
    }

    if (
      'kind' in data &&
      data.kind === 'move' &&
      'nodeId' in data &&
      typeof data.nodeId === 'string'
    ) {
      return { kind: 'move', nodeId: data.nodeId };
    }
  } catch {
    return null;
  }

  return null;
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

export interface NodeLocation {
  node: CanvasNode;
  parentId: string | null;
  index: number;
}

export function findNodeLocation(
  nodes: CanvasNode[],
  id: string,
  parentId: string | null = null,
): NodeLocation | undefined {
  for (const [index, node] of nodes.entries()) {
    if (node.id === id) return { node, parentId, index };
    if (node.children) {
      const found = findNodeLocation(node.children, id, node.id);
      if (found) return found;
    }
  }
  return undefined;
}

function insertAt(nodes: CanvasNode[], node: CanvasNode, index?: number): CanvasNode[] {
  const next = [...nodes];
  const position = index === undefined ? next.length : Math.max(0, Math.min(index, next.length));
  next.splice(position, 0, node);
  return next;
}

export function insertNode(
  nodes: CanvasNode[],
  parentId: string | null,
  node: CanvasNode,
  index?: number,
): CanvasNode[] {
  if (parentId === null) return insertAt(nodes, node, index);

  return nodes.map((candidate) => {
    if (candidate.id === parentId) {
      return isContainerNode(candidate)
        ? { ...candidate, children: insertAt(candidate.children, node, index) }
        : candidate;
    }
    return candidate.children
      ? ({ ...candidate, children: insertNode(candidate.children, parentId, node, index) } as CanvasNode)
      : candidate;
  });
}

export function moveNode(
  nodes: CanvasNode[],
  nodeId: string,
  parentId: string | null,
  index?: number,
): CanvasNode[] {
  const source = findNodeLocation(nodes, nodeId);
  const target = parentId === null ? undefined : findNode(nodes, parentId);
  if (
    !source
    || nodeId === parentId
    || (target && !isContainerNode(target))
    || (target && findNode(source.node.children ?? [], target.id))
  ) {
    return nodes;
  }

  const withoutSource = removeNode(nodes, nodeId);
  const adjustedIndex = source.parentId === parentId && index !== undefined && index > source.index
    ? index - 1
    : index;
  return insertNode(withoutSource, parentId, source.node, adjustedIndex);
}
