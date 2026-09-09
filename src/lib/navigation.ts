import type { CanvasNode, CanvasScreen, ToolbarItem } from '../types/document';

export interface NavigationEntry {
  key: string;
  nodeId: string | null;
  destinationScreenId?: string;
  navigationAction?: 'back';
  context?: string;
}

export function navigationEntries(nodes: CanvasNode[], context = ''): NavigationEntry[] {
  return nodes.flatMap((node) => {
    const entries: NavigationEntry[] = [];
    const directAction = node.navigationAction === 'back'
      ? { navigationAction: 'back' as const }
      : (node.kind === 'navigation-link' || node.kind === 'button') && node.destinationScreenId
        ? { destinationScreenId: node.destinationScreenId }
        : undefined;

    if (directAction) {
      entries.push({ key: node.id, nodeId: node.id, ...directAction, ...(context ? { context } : {}) });
    }

    if (node.kind === 'alert') {
      entries.push(...(node.actions ?? []).flatMap((action, index) => actionEntry(
        action,
        `${node.id}-alert-${index}`,
        node.id,
        joinContext(context, `Alert · ${action.label || `操作${index + 1}`}`),
      )));
    }

    entries.push(...Object.entries(node.m3eMenuActions ?? {}).flatMap(([slot, action]) => actionEntry(
      action,
      `${node.id}-menu-${slot}`,
      node.id,
      joinContext(context, `メニュー · ${menuActionLabel(node, slot)}`),
    )));

    const childContext = node.m3eKind === 'fabMenu' || node.m3eKind === 'toolbar'
      ? joinContext(context, node.label?.trim() || (node.m3eKind === 'fabMenu' ? 'FABメニュー' : 'ツールバー'))
      : context;
    return [...entries, ...(node.children ? navigationEntries(node.children, childContext) : [])];
  });
}

export function screenNavigationEntries(screen: CanvasScreen): NavigationEntry[] {
  return [
    ...navigationEntries(screen.root.children),
    ...toolbarEntries(screen.toolbarItems, 'toolbar'),
    ...toolbarEntries(screen.tabBarItems, 'tab'),
  ];
}

function toolbarEntries(items: ToolbarItem[] | undefined, kind: 'toolbar' | 'tab'): NavigationEntry[] {
  return (items ?? []).flatMap((item) => {
    if (!item.destinationScreenId && item.navigationAction !== 'back') return [];
    return [{
      key: `${kind}-${item.id}`,
      nodeId: null,
      ...(item.destinationScreenId ? { destinationScreenId: item.destinationScreenId } : {}),
      ...(item.navigationAction === 'back' ? { navigationAction: 'back' as const } : {}),
      context: `${kind === 'toolbar' ? 'ツールバー' : 'タブバー'} · ${item.title || '操作'}`,
    }];
  });
}

function actionEntry(
  action: { destinationScreenId?: string; navigationAction?: 'back' },
  key: string,
  nodeId: string,
  context: string,
): NavigationEntry[] {
  if (!action.destinationScreenId && action.navigationAction !== 'back') return [];
  return [{
    key,
    nodeId,
    ...(action.destinationScreenId ? { destinationScreenId: action.destinationScreenId } : {}),
    ...(action.navigationAction === 'back' ? { navigationAction: 'back' as const } : {}),
    ...(context ? { context } : {}),
  }];
}

function menuActionLabel(node: CanvasNode, slot: string): string {
  const match = /^tab:(\d+)$/.exec(slot);
  const index = match ? Number(match[1]) : -1;
  return node.m3eMetadata?.tabs?.[index]?.label?.trim() || slot;
}

function joinContext(parent: string, current: string): string {
  return [parent, current].filter(Boolean).join(' · ');
}
