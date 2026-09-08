import type { CanvasNode, ContainerNode, NodeKind, PatternId } from '../types/document';

export const NODE_DRAG_MIME = 'application/x-ioscanvas-node';

export type DragData =
  | { kind: 'new'; nodeKind: NodeKind }
  | { kind: 'pattern'; pattern: PatternId }
  | { kind: 'move'; nodeId: string };

const patternIds = new Set<PatternId>(['glass-card', 'settings-section', 'list-row', 'empty-state']);

const nodeKinds = new Set<NodeKind>([
  'vstack', 'hstack', 'lazyvstack', 'lazyhstack', 'zstack', 'navigation-split-view', 'glass-container', 'group', 'tabview', 'disclosure-group', 'sheet', 'groupbox', 'lazyvgrid', 'lazyhgrid', 'scrollview', 'list', 'form', 'section', 'text', 'button', 'alert', 'confirmation-dialog', 'toggle', 'textfield', 'searchfield', 'securefield', 'texteditor', 'picker', 'colorpicker', 'slider', 'stepper', 'menu', 'progress', 'gauge', 'content-unavailable', 'navigation-link', 'label', 'link', 'datepicker', 'image', 'camera', 'map', 'divider', 'spacer',
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
      return { id, kind, text: 'Text', fontSize: 17, weight: 'regular', textStyle: 'body' };
    case 'button':
      return { id, kind, label: 'Button', role: 'normal', minHeight: 44 };
    case 'alert':
      return {
        id,
        kind,
        label: '確認を表示',
        title: '確認',
        message: 'この操作を続けますか？',
        primaryButton: '続ける',
        primaryRole: 'normal',
        secondaryButton: 'キャンセル',
        secondaryRole: 'cancel',
        minHeight: 44,
      };
    case 'confirmation-dialog':
      return {
        id,
        kind,
        label: '選択肢を表示',
        title: '操作を選択',
        message: '実行する操作を選んでください。',
        options: ['編集', '削除'],
        cancelButton: 'キャンセル',
        minHeight: 44,
      };
    case 'toggle':
      return { id, kind, label: 'Toggle', binding: 'isEnabled', minHeight: 44 };
    case 'textfield':
      return { id, kind, label: 'Text field', binding: 'value', minHeight: 44 };
    case 'searchfield':
      return { id, kind, label: '検索', binding: 'query', prompt: '検索', minHeight: 44 };
    case 'securefield':
      return { id, kind, label: 'Password', binding: 'password', minHeight: 44 };
    case 'texteditor':
      return { id, kind, label: 'Notes', binding: 'notes', minHeight: 88 };
    case 'picker':
      return { id, kind, label: 'Selection', binding: 'selection', options: ['Option 1', 'Option 2'], minHeight: 44 };
    case 'colorpicker':
      return { id, kind, label: 'Tint', binding: 'tintColor', color: '#007AFF', minHeight: 44 };
    case 'slider':
      return { id, kind, label: 'Value', binding: 'value', value: 50, minimum: 0, maximum: 100, step: 1, minHeight: 44 };
    case 'stepper':
      return { id, kind, label: 'Quantity', binding: 'quantity', value: 1, minimum: 0, maximum: 10, step: 1, minHeight: 44 };
    case 'menu':
      return { id, kind, label: 'Actions', options: ['Edit', 'Delete'], minHeight: 44 };
    case 'progress':
      return { id, kind, label: 'Progress', value: 0.6, style: 'linear' };
    case 'gauge':
      return { id, kind, label: 'Progress', value: 0.6, minimum: 0, maximum: 1, minHeight: 44 };
    case 'content-unavailable':
      return { id, kind, title: 'No items', systemName: 'tray', description: 'There is nothing to show here.' };
    case 'navigation-link':
      return { id, kind, label: 'Open screen', destinationScreenId: '', minHeight: 44 };
    case 'label':
      return { id, kind, title: 'Label', systemName: 'star.fill', accessibilityLabel: 'Label' };
    case 'link':
      return { id, kind, label: 'Open link', url: 'https://example.com', minHeight: 44 };
    case 'datepicker':
      return { id, kind, label: 'Date', binding: 'selectedDate', minHeight: 44 };
    case 'image':
      return { id, kind, systemName: 'star.fill', accessibilityLabel: 'Image' };
    case 'camera':
      return { id, kind, label: 'カメラ', minHeight: 44 };
    case 'map':
      return { id, kind, label: '地図' };
    case 'vstack':
      return { id, kind, spacing: 12, children: [] };
    case 'hstack':
      return { id, kind, spacing: 8, children: [] };
    case 'lazyvstack':
      return { id, kind, spacing: 12, children: [] };
    case 'lazyhstack':
      return { id, kind, spacing: 8, children: [] };
    case 'zstack':
      return { id, kind, children: [] };
    case 'navigation-split-view':
      return {
        id,
        kind,
        children: [
          { id: createId('sidebar'), kind: 'list', children: [] },
          { id: createId('detail'), kind: 'vstack', spacing: 12, children: [] },
        ],
      };
    case 'glass-container':
      return { id, kind, spacing: 12, children: [] };
    case 'group':
      return { id, kind, children: [] };
    case 'tabview':
      return { id, kind, children: [] };
    case 'disclosure-group':
      return { id, kind, title: 'Details', children: [] };
    case 'sheet':
      return { id, kind, label: 'Open sheet', title: 'Sheet', children: [] };
    case 'groupbox':
      return { id, kind, title: 'Group Box', children: [] };
    case 'lazyvgrid':
      return { id, kind, columns: 2, spacing: 12, children: [] };
    case 'lazyhgrid':
      return { id, kind, rows: 2, spacing: 12, children: [] };
    case 'scrollview':
      return { id, kind, children: [] };
    case 'list':
      return { id, kind, children: [] };
    case 'form':
      return { id, kind, children: [] };
    case 'section':
      return { id, kind, title: 'Section', children: [] };
    case 'divider':
      return { id, kind };
    case 'spacer':
      return { id, kind };
  }
}

function containerWithChildren(kind: Extract<ContainerNode['kind'], 'vstack' | 'hstack' | 'glass-container' | 'section'>, children: CanvasNode[]): ContainerNode {
  const node = createNode(kind);
  if (!isContainerNode(node)) throw new Error(`Unsupported pattern container: ${kind}`);
  node.children = children;
  return node;
}

export function createPattern(pattern: PatternId): CanvasNode {
  switch (pattern) {
    case 'glass-card': {
      const title = createNode('text');
      if (title.kind !== 'text') throw new Error('Unable to create pattern title');
      title.text = '新しいカード';
      title.textStyle = 'headline';
      title.weight = 'semibold';

      const body = createNode('text');
      if (body.kind !== 'text') throw new Error('Unable to create pattern body');
      body.text = '説明を追加してください';
      body.textStyle = 'body';

      const action = createNode('button');
      if (action.kind !== 'button') throw new Error('Unable to create pattern action');
      action.label = '続ける';
      action.systemName = 'arrow.right';
      action.glass = 'prominent';
      action.glassInteractive = true;
      action.glassTint = 'blue';

      const stack = containerWithChildren('vstack', [title, body, action]);
      stack.spacing = 8;
      stack.padding = 8;
      const glass = containerWithChildren('glass-container', [stack]);
      glass.spacing = 12;
      return glass;
    }
    case 'settings-section': {
      const notifications = createNode('toggle');
      if (notifications.kind !== 'toggle') throw new Error('Unable to create pattern toggle');
      notifications.label = '通知';
      notifications.binding = 'notificationsEnabled';

      const appearance = createNode('picker');
      if (appearance.kind !== 'picker') throw new Error('Unable to create pattern picker');
      appearance.label = '表示モード';
      appearance.binding = 'appearanceMode';
      appearance.options = ['システム', 'ライト', 'ダーク'];

      const section = containerWithChildren('section', [notifications, appearance]);
      section.title = '設定';
      return section;
    }
    case 'list-row': {
      const icon = createNode('image');
      if (icon.kind !== 'image') throw new Error('Unable to create pattern icon');
      icon.systemName = 'star.fill';
      icon.accessibilityLabel = '項目';

      const title = createNode('text');
      if (title.kind !== 'text') throw new Error('Unable to create pattern row title');
      title.text = '項目';
      title.textStyle = 'body';

      const detail = createNode('text');
      if (detail.kind !== 'text') throw new Error('Unable to create pattern row detail');
      detail.text = '補足情報';
      detail.textStyle = 'caption';

      const labels = containerWithChildren('vstack', [title, detail]);
      labels.spacing = 2;
      labels.alignment = 'leading';
      const row = containerWithChildren('hstack', [icon, labels]);
      row.spacing = 12;
      row.alignment = 'center';
      row.frameWidth = 'max';
      return row;
    }
    case 'empty-state': {
      const empty = createNode('content-unavailable');
      if (empty.kind !== 'content-unavailable') throw new Error('Unable to create pattern empty state');
      empty.title = '項目がありません';
      empty.systemName = 'tray';
      empty.description = '新しい項目を追加すると、ここに表示されます。';
      return empty;
    }
  }
}

export function cloneNode(node: CanvasNode): CanvasNode {
  const cloned = { ...node, id: createId(node.kind) } as CanvasNode;
  if (node.children) cloned.children = node.children.map(cloneNode);
  if (node.kind === 'button' && cloned.kind === 'button' && node.toggle) cloned.toggle = { ...node.toggle };
  return cloned;
}

export function isContainerNode(node: CanvasNode): node is ContainerNode {
  return node.kind === 'vstack'
    || node.kind === 'hstack'
    || node.kind === 'lazyvstack'
    || node.kind === 'lazyhstack'
    || node.kind === 'zstack'
    || node.kind === 'navigation-split-view'
    || node.kind === 'glass-container'
    || node.kind === 'group'
    || node.kind === 'tabview'
    || node.kind === 'disclosure-group'
    || node.kind === 'sheet'
    || node.kind === 'groupbox'
    || node.kind === 'lazyvgrid'
    || node.kind === 'lazyhgrid'
    || node.kind === 'scrollview'
    || node.kind === 'list'
    || node.kind === 'form'
    || node.kind === 'section';
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
      data.kind === 'pattern' &&
      'pattern' in data &&
      typeof data.pattern === 'string' &&
      patternIds.has(data.pattern as PatternId)
    ) {
      return { kind: 'pattern', pattern: data.pattern as PatternId };
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
      return updateCardLayout({ ...node, ...patch } as CanvasNode, patch);
    }
    if (node.children) {
      return { ...node, children: updateNode(node.children, id, patch) } as CanvasNode;
    }
    return node;
  });
}

function updateCardLayout(node: CanvasNode, patch: Partial<CanvasNode>): CanvasNode {
  if (node.kind !== 'groupbox' || (!('cardImagePosition' in patch) && !('cardNoImage' in patch))) return node;

  const wrappers = node.children.filter((child) => child.kind === 'hstack' || child.kind === 'zstack');
  const wrapper = wrappers[0];
  const candidates = wrapper && isContainerNode(wrapper) ? wrapper.children : node.children;
  const image = candidates.find((child): child is Extract<CanvasNode, { kind: 'image' }> => child.kind === 'image');
  const content = candidates.find((child): child is Extract<CanvasNode, { kind: 'vstack' }> => child.kind === 'vstack')
    ?? { id: createId('card-content'), kind: 'vstack' as const, spacing: 4, alignment: 'leading' as const, frameWidth: 'max' as const, children: candidates.filter((child) => child.kind !== 'image') };
  const nextImage = node.cardNoImage ? undefined : image ?? createNode('image');
  if (nextImage?.kind === 'image' && !nextImage.accessibilityLabel) nextImage.accessibilityLabel = 'カード画像';
  if (!nextImage) return { ...node, children: [content] };

  switch (node.cardImagePosition ?? 'top') {
    case 'background':
      return {
        ...node,
        children: [{ id: wrapper?.id ?? createId('card-background'), kind: 'zstack', children: [nextImage, content] }],
      };
    case 'leading':
    case 'trailing':
      return {
        ...node,
        children: [{
          id: wrapper?.id ?? createId('card-row'),
          kind: 'hstack',
          spacing: 12,
          alignment: 'center',
          children: node.cardImagePosition === 'leading' ? [nextImage, content] : [content, nextImage],
        }],
      };
    case 'top':
    default:
      return { ...node, children: [nextImage, content] };
  }
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
