import { parseCanvasDocument } from './document';
import type {
  ButtonStyle,
  CanvasDocument,
  CanvasNode,
  CanvasScreen,
  ContainerNode,
  ImageSource,
  SwipeDirection,
  ToolbarItem,
} from '../types/document';

type JsonObject = Record<string, unknown>;

interface M3eFrame {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  note?: string;
  swipe?: Partial<Record<SwipeDirection, string>>;
}

interface M3eGroup {
  id: string;
  x: number;
  y: number;
  axis: 'x' | 'y';
  items: JsonObject[];
}

interface ConversionContext {
  usedIds: Set<string>;
  frameIds: Map<string, string>;
}

const symbolAliases: Record<string, string> = {
  add: 'plus',
  add_circle: 'plus.circle.fill',
  arrow_back: 'chevron.left',
  arrow_forward: 'chevron.right',
  calendar_month: 'calendar',
  check: 'checkmark',
  check_circle: 'checkmark.circle.fill',
  chevron_left: 'chevron.left',
  chevron_right: 'chevron.right',
  close: 'xmark',
  delete: 'trash',
  edit: 'pencil',
  favorite: 'heart.fill',
  home: 'house.fill',
  image: 'photo',
  info: 'info.circle',
  lock: 'lock.fill',
  map: 'map.fill',
  menu: 'line.3.horizontal',
  more_horiz: 'ellipsis',
  more_vert: 'ellipsis.vertical',
  notifications: 'bell.fill',
  person: 'person.fill',
  photo_camera: 'camera.fill',
  play_arrow: 'play.fill',
  search: 'magnifyingglass',
  send: 'paperplane.fill',
  settings: 'gearshape.fill',
  share: 'square.and.arrow.up',
  star: 'star.fill',
};

function isRecord(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(record: JsonObject, key: string): string | undefined {
  return typeof record[key] === 'string' ? record[key] : undefined;
}

function numberValue(record: JsonObject, key: string): number | undefined {
  return typeof record[key] === 'number' && Number.isFinite(record[key]) ? record[key] : undefined;
}

function booleanValue(record: JsonObject, key: string): boolean | undefined {
  return typeof record[key] === 'boolean' ? record[key] : undefined;
}

function recordValue(record: JsonObject, key: string): JsonObject | undefined {
  return isRecord(record[key]) ? record[key] : undefined;
}

function stableId(prefix: string, source: string, usedIds: Set<string>): string {
  const readable = source.trim().replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'item';
  const base = `${prefix}-${readable}`;
  let id = base;
  let suffix = 2;
  while (usedIds.has(id)) id = `${base}-${suffix++}`;
  usedIds.add(id);
  return id;
}

function readFrame(value: unknown): M3eFrame | null {
  if (!isRecord(value)) return null;
  const id = stringValue(value, 'id');
  const name = stringValue(value, 'name');
  const x = numberValue(value, 'x');
  const y = numberValue(value, 'y');
  if (!id || !name || x === undefined || y === undefined) return null;

  const swipeValue = recordValue(value, 'swipe');
  const swipe: Partial<Record<SwipeDirection, string>> = {};
  for (const direction of ['left', 'right', 'up', 'down'] as SwipeDirection[]) {
    const destination = swipeValue && stringValue(swipeValue, direction);
    if (destination) swipe[direction] = destination;
  }

  return {
    id,
    name,
    x,
    y,
    width: Math.max(1, numberValue(value, 'w') ?? 412),
    height: Math.max(1, numberValue(value, 'h') ?? 892),
    ...(stringValue(value, 'note')?.trim() ? { note: stringValue(value, 'note') } : {}),
    ...(Object.keys(swipe).length > 0 ? { swipe } : {}),
  };
}

function readGroup(value: unknown): M3eGroup | null {
  if (!isRecord(value) || !Array.isArray(value.items)) return null;
  const id = stringValue(value, 'id');
  const x = numberValue(value, 'x');
  const y = numberValue(value, 'y');
  const axis = value.axis === 'y' ? 'y' : value.axis === 'x' ? 'x' : undefined;
  if (!id || x === undefined || y === undefined || !axis) return null;
  const items = value.items.filter(isRecord);
  return items.length > 0 ? { id, x, y, axis, items } : null;
}

function frameForGroup(group: M3eGroup, frames: M3eFrame[]): M3eFrame | undefined {
  // ponytail: use the group's origin for ownership; use bounding-box intersection if mixed-frame groups become a supported input.
  return frames.find((frame) => group.x >= frame.x && group.x <= frame.x + frame.width && group.y >= frame.y && group.y <= frame.y + frame.height)
    ?? frames[0];
}

function buttonStyle(variant: unknown): ButtonStyle | undefined {
  switch (variant) {
    case 'filled': return 'borderedProminent';
    case 'tonal':
    case 'outlined': return 'bordered';
    case 'elevated': return 'bordered';
    case 'text': return 'plain';
    default: return undefined;
  }
}

function iconOf(item: JsonObject, key = 'icon'): string | undefined {
  const value = item[key];
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const symbol = value.trim();
  return symbolAliases[symbol] ?? symbol;
}

function labelOf(item: JsonObject, fallback: string): string {
  return stringValue(item, 'label')?.trim() || fallback;
}

function tabEntries(item: JsonObject): JsonObject[] {
  return Array.isArray(item.tabs) ? item.tabs.filter(isRecord) : [];
}

function actionTarget(item: JsonObject, context: ConversionContext): { destination?: string; back: boolean } {
  const action = recordValue(item, 'action');
  const target = action && stringValue(action, 'to');
  if (!target) return { back: false };
  if (target === 'back') return { back: true };
  const destination = context.frameIds.get(target);
  return destination ? { destination, back: false } : { back: false };
}

function appendNotes(node: CanvasNode, item: JsonObject, extra: string[] = []): CanvasNode {
  const notes = [
    node.notes?.trim() ?? '',
    stringValue(item, 'supporting')?.trim() ? `補足: ${stringValue(item, 'supporting')}` : '',
    stringValue(item, 'note')?.trim() ?? '',
    ...extra,
  ].filter(Boolean);
  if (notes.length > 0) node.notes = notes.join('\n');
  return node;
}

function setButtonAction(node: Extract<CanvasNode, { kind: 'button' }>, item: JsonObject, context: ConversionContext): void {
  const action = actionTarget(item, context);
  if (action.destination) {
    if (node.toggle) {
      node.notes = [node.notes, 'M3Eのトグル状態を優先しました。遷移先は実装時に組み合わせてください。'].filter(Boolean).join('\n');
    } else {
      node.destinationScreenId = action.destination;
    }
  }
  if (action.back) node.notes = [node.notes, 'タップで前の画面へ戻る'].filter(Boolean).join('\n');
}

function linkM3eNode(node: CanvasNode, item: JsonObject, context: ConversionContext, fallbackLabel: string): CanvasNode {
  const annotated = appendNotes(node, item);
  const action = actionTarget(item, context);
  if (action.back) {
    annotated.notes = [annotated.notes, 'タップで前の画面へ戻る'].filter(Boolean).join('\n');
    return annotated;
  }
  if (!action.destination) return annotated;

  return {
    id: stableId('m3e-link', node.id, context.usedIds),
    kind: 'navigation-link',
    label: labelOf(item, fallbackLabel),
    destinationScreenId: action.destination,
    minHeight: 44,
    children: [annotated],
    notes: 'タップで画面へ遷移',
  };
}

function imageNode(id: string, icon: string | undefined, source: ImageSource, label: string): Extract<CanvasNode, { kind: 'image' }> {
  return {
    id,
    kind: 'image',
    systemName: icon ?? (source === 'remote' ? '' : 'photo'),
    accessibilityLabel: label,
    ...(source === 'symbol' ? {} : { source }),
  };
}

function tabViewNode(item: JsonObject, context: ConversionContext): CanvasNode {
  const id = stableId('m3e-tabview', stringValue(item, 'id') ?? 'tabs', context.usedIds);
  const children = tabEntries(item).map((tab, index) => {
    const title = labelOf(tab, `タブ${index + 1}`);
    const tabId = stableId('m3e-tab', `${stringValue(item, 'id') ?? 'tabs'}-${index}`, context.usedIds);
    const actions = recordValue(item, 'actions');
    const tabAction = actions && recordValue(actions, `tab:${index}`);
    const target = tabAction && stringValue(tabAction, 'to');
    const destination = target && target !== 'back' ? context.frameIds.get(target) : undefined;
    return destination
      ? {
          id: tabId,
          kind: 'navigation-link' as const,
          label: title,
          destinationScreenId: destination,
          minHeight: 44,
          tabTitle: title,
          tabSystemName: iconOf(tab) ?? 'square',
          notes: 'M3Eのタブ操作をNavigationLinkへ変換しました。',
        }
      : {
          id: tabId,
          kind: 'text' as const,
          text: title,
          fontSize: 17,
          weight: 'regular' as const,
          tabTitle: title,
          tabSystemName: iconOf(tab) ?? 'square',
          notes: target === 'back' ? 'M3Eのタブ操作は前の画面へ戻る動作です。' : undefined,
        };
  });
  return appendNotes({ id, kind: 'tabview', children }, item);
}

function listItemNode(item: JsonObject, context: ConversionContext): CanvasNode {
  const label = labelOf(item, '項目');
  const children: CanvasNode[] = [];
  const leadingIcon = iconOf(item);
  if (leadingIcon) {
    children.push(imageNode(stableId('m3e-icon', `${stringValue(item, 'id') ?? label}-leading`, context.usedIds), leadingIcon, 'symbol', label));
  }

  const labels: CanvasNode[] = [{
    id: stableId('m3e-label', `${stringValue(item, 'id') ?? label}-title`, context.usedIds),
    kind: 'text',
    text: label,
    fontSize: 17,
    weight: 'regular',
    textStyle: 'body',
  }];
  const supporting = stringValue(item, 'supporting')?.trim();
  if (supporting) {
    labels.push({
      id: stableId('m3e-label', `${stringValue(item, 'id') ?? label}-supporting`, context.usedIds),
      kind: 'text',
      text: supporting,
      fontSize: 13,
      weight: 'regular',
      textStyle: 'caption',
    });
  }
  children.push({
    id: stableId('m3e-stack', `${stringValue(item, 'id') ?? label}-labels`, context.usedIds),
    kind: 'vstack',
    spacing: 2,
    alignment: 'leading',
    children: labels,
  });

  if (booleanValue(item, 'switch')) {
    children.push({
      id: stableId('m3e-toggle', stringValue(item, 'id') ?? label, context.usedIds),
      kind: 'toggle',
      label,
      binding: `is_${stringValue(item, 'id') ?? 'Enabled'}`,
      ...(booleanValue(item, 'checked') === undefined ? {} : { isOn: booleanValue(item, 'checked') }),
      minHeight: 44,
    });
  } else if (iconOf(item, 'icon2')) {
    children.push(imageNode(stableId('m3e-icon', `${stringValue(item, 'id') ?? label}-trailing`, context.usedIds), iconOf(item, 'icon2'), 'symbol', label));
  }

  const sourceId = stringValue(item, 'id') ?? label;
  const rowId = stableId('m3e-row', sourceId, context.usedIds);
  const node: ContainerNode = {
    id: rowId,
    kind: 'hstack',
    spacing: 12,
    alignment: 'center',
    frameWidth: 'max',
    children,
  };
  const action = actionTarget(item, context);
  if (action.destination) {
    node.id = stableId('m3e-row-content', sourceId, context.usedIds);
    return appendNotes({
      id: rowId,
      kind: 'navigation-link',
      label: label || '項目',
      destinationScreenId: action.destination,
      minHeight: 44,
      children: [node],
    }, item, ['タップで画面へ遷移']);
  }
  if (action.back) node.notes = 'タップで前の画面へ戻る';
  return appendNotes(node, item);
}

function mapItem(item: JsonObject, context: ConversionContext): CanvasNode | null {
  const sourceId = stringValue(item, 'id') ?? `${stringValue(item, 'kind') ?? 'part'}-${context.usedIds.size}`;
  const id = stableId('m3e', sourceId, context.usedIds);
  const label = stringValue(item, 'label')?.trim() ?? '';
  const icon = iconOf(item);
  const style = buttonStyle(item.variant);
  const imageSource: ImageSource = typeof stringValue(item, 'src') === 'string' && /^https?:\/\//i.test(stringValue(item, 'src') ?? '') ? 'remote' : 'symbol';

  switch (item.kind) {
    case 'button':
    case 'iconButton':
    case 'fab':
    case 'extendedFab':
    case 'splitButton':
    case 'chip': {
      const node: Extract<CanvasNode, { kind: 'button' }> = {
        id,
        kind: 'button',
        label: label || (item.kind === 'iconButton' || item.kind === 'fab' ? '' : 'アクション'),
        role: 'normal',
        minHeight: item.kind === 'chip' ? 44 : 44,
        ...(item.kind === 'iconButton' || item.kind === 'fab'
          ? { accessibilityLabel: label || (item.kind === 'fab' ? '追加' : '操作') }
          : {}),
        ...(icon ? { systemName: icon } : {}),
        ...(style ? { buttonStyle: style } : {}),
      };
      const toggle = recordValue(item, 'toggle');
      if (toggle || booleanValue(item, 'checked') !== undefined) {
        const onLabel = toggle ? labelOf(toggle, node.label || 'オン') : `${node.label || '項目'}を解除`;
        node.toggle = {
          isOn: booleanValue(item, 'checked') ?? false,
          onLabel,
          ...(iconOf(toggle ?? {}, 'icon') ? { onSystemName: iconOf(toggle ?? {}, 'icon') } : {}),
          ...(buttonStyle(toggle?.variant) ? { onButtonStyle: buttonStyle(toggle?.variant) } : {}),
        };
      }
      setButtonAction(node, item, context);
      return appendNotes(node, item);
    }
    case 'searchBar':
      return appendNotes({ id, kind: 'searchfield', label: label || '検索', binding: `query_${sourceId}`, prompt: label || '検索', minHeight: 44 }, item);
    case 'textField':
      return appendNotes({ id, kind: 'textfield', label: label || '入力', binding: `value_${sourceId}`, minHeight: 44 }, item);
    case 'select': {
      const options = tabEntries(item).map((tab, index) => labelOf(tab, `選択肢${index + 1}`));
      return appendNotes({ id, kind: 'picker', label: label || '選択', binding: `selection_${sourceId}`, options: options.length > 0 ? options : ['選択肢'], minHeight: 44 }, item);
    }
    case 'switch':
    case 'checkbox':
    case 'radio': {
      const checked = booleanValue(item, 'checked');
      return appendNotes({ id, kind: 'toggle', label: label || '設定', binding: `is_${sourceId}`, ...(checked === undefined ? {} : { isOn: checked }), minHeight: 44 }, item);
    }
    case 'slider': {
      const value = Math.max(0, Math.min(100, numberValue(item, 'value') ?? 50));
      return appendNotes({ id, kind: 'slider', label: label || '値', binding: `value_${sourceId}`, value, minimum: 0, maximum: 100, step: 1, minHeight: 44 }, item);
    }
    case 'text': {
      const fontSize = Math.max(11, numberValue(item, 'size') ?? 17);
      return linkM3eNode({ id, kind: 'text', text: label || 'テキスト', fontSize, weight: booleanValue(item, 'bold') ? 'bold' : 'regular', textStyle: fontSize >= 28 ? 'title' : 'body' }, item, context, 'テキスト');
    }
    case 'image': {
      const src = stringValue(item, 'src');
      const node = imageNode(id, imageSource === 'remote' ? src : icon, imageSource, label || '画像');
      return linkM3eNode(node, item, context, '画像');
    }
    case 'camera':
      return appendNotes(imageNode(id, 'camera.fill', 'symbol', label || 'カメラ'), item, ['M3EのカメラプレースホルダーをImageとして読み込みました。']);
    case 'map':
      return appendNotes(imageNode(id, 'map.fill', 'symbol', label || '地図'), item, ['M3Eの地図プレースホルダーです。実装時はMapKitのMapへ置き換えてください。']);
    case 'divider':
      return appendNotes({ id, kind: 'divider' }, item);
    case 'loadingIndicator':
      return appendNotes({ id, kind: 'progress', label: label || '読み込み中', value: 0.5 }, item, ['M3Eの不確定ローディング表示です。']);
    case 'linearProgress':
    case 'circularProgress': {
      const value = numberValue(item, 'value');
      return appendNotes({ id, kind: 'progress', label: label || '進捗', value: value === undefined ? 0.5 : Math.max(0, Math.min(1, value > 1 ? value / 100 : value)) }, item, value === undefined ? ['M3Eの不確定プログレス表示です。'] : []);
    }
    case 'badge':
      return appendNotes({ id, kind: 'text', text: label || 'バッジ', fontSize: 13, weight: 'semibold', textStyle: 'caption' }, item);
    case 'box':
      return appendNotes({ id, kind: 'groupbox', title: label || 'ボックス', children: [] }, item);
    case 'card': {
      const children: CanvasNode[] = [];
      if (icon) children.push(imageNode(stableId('m3e-card-icon', sourceId, context.usedIds), icon, 'symbol', label || 'カード'));
      if (label) children.push({ id: stableId('m3e-card-title', sourceId, context.usedIds), kind: 'text', text: label, fontSize: 20, weight: 'semibold', textStyle: 'headline' });
      const supporting = stringValue(item, 'supporting')?.trim();
      if (supporting) children.push({ id: stableId('m3e-card-body', sourceId, context.usedIds), kind: 'text', text: supporting, fontSize: 17, weight: 'regular', textStyle: 'body' });
      return linkM3eNode({ id, kind: 'groupbox', title: label || 'カード', children }, item, context, 'カード');
    }
    case 'listItem':
      return listItemNode(item, context);
    case 'dialog':
      return appendNotes({ id, kind: 'alert', label: '確認を表示', title: label || '確認', message: stringValue(item, 'supporting') ?? '', primaryButton: '続ける', primaryRole: 'normal', minHeight: 44 }, item);
    case 'snackbar':
      return appendNotes({ id, kind: 'text', text: label || '通知', fontSize: 15, weight: 'regular', textStyle: 'callout' }, item, ['M3EのSnackbarです。実装時はToastまたは独自の表示状態へ置き換えてください。']);
    case 'fabMenu':
    case 'toolbar': {
      const actions = recordValue(item, 'actions');
      const children = tabEntries(item).map((tab, index) => {
        const action = actions && recordValue(actions, `tab:${index}`);
        return mapItem({
          ...tab,
          id: `${sourceId}-${index}`,
          kind: 'iconButton',
          label: labelOf(tab, 'アクション'),
          icon: iconOf(tab) ?? 'ellipsis',
          ...(action ? { action } : {}),
        }, context);
      }).filter((node): node is CanvasNode => node !== null);
      return appendNotes({ id, kind: 'hstack', spacing: 8, alignment: 'center', children }, item);
    }
    case 'navRail': {
      const links = tabEntries(item).map((tab, index) => {
        const tabLabel = labelOf(tab, `項目${index + 1}`);
        const rawActions = recordValue(item, 'actions');
        const action = rawActions && recordValue(rawActions, `tab:${index}`);
        const target = action && stringValue(action, 'to');
        return {
          id: stableId('m3e-rail-link', `${sourceId}-${index}`, context.usedIds),
          kind: 'navigation-link' as const,
          label: tabLabel,
          destinationScreenId: target ? context.frameIds.get(target) ?? '' : '',
          minHeight: 44,
        };
      });
      return appendNotes({
        id,
        kind: 'navigation-split-view',
        children: [
          { id: stableId('m3e-rail-sidebar', sourceId, context.usedIds), kind: 'list', children: links },
          { id: stableId('m3e-rail-detail', sourceId, context.usedIds), kind: 'vstack', spacing: 12, children: [] },
        ],
      }, item, ['M3EのNavigation RailをNavigationSplitViewへ変換しました。']);
    }
    case 'topAppBar':
    case 'bottomNav':
    case 'tabs':
      return tabViewNode(item, context);
    default:
      return appendNotes({ id, kind: 'text', text: label || String(item.kind ?? 'パーツ'), fontSize: 17, weight: 'regular', textStyle: 'body' }, item, [`未対応のM3Eパーツ「${String(item.kind ?? 'unknown')}」をTextとして読み込みました。`]);
  }
}

function toolbarItem(item: JsonObject, icon: string | undefined, placement: ToolbarItem['placement'], suffix: string, context: ConversionContext): ToolbarItem | null {
  if (!icon) return null;
  const actions = recordValue(item, 'actions');
  const action = actions && recordValue(actions, suffix);
  const target = action && stringValue(action, 'to');
  return {
    id: stableId('m3e-toolbar', `${stringValue(item, 'id') ?? 'bar'}-${suffix}`, context.usedIds),
    title: target === 'back' ? '戻る' : icon,
    systemName: icon,
    placement,
    ...(target && target !== 'back' && context.frameIds.has(target) ? { destinationScreenId: context.frameIds.get(target) } : {}),
  };
}

function bottomNavigationItems(item: JsonObject, context: ConversionContext): ToolbarItem[] {
  const sourceId = stringValue(item, 'id') ?? 'bottom-nav';
  const actions = recordValue(item, 'actions');
  return tabEntries(item).map((tab, index) => {
    const action = actions && recordValue(actions, `tab:${index}`);
    const target = action && stringValue(action, 'to');
    const destination = target && target !== 'back' ? context.frameIds.get(target) : undefined;
    return {
      id: stableId('m3e-bottom-nav', `${sourceId}-${index}`, context.usedIds),
      title: labelOf(tab, `タブ${index + 1}`),
      ...(iconOf(tab) ? { systemName: iconOf(tab) } : {}),
      placement: 'bottomBar' as const,
      ...(destination ? { destinationScreenId: destination } : {}),
    };
  });
}

function groupsForScreen(groups: M3eGroup[], frame: M3eFrame, frames: M3eFrame[]): M3eGroup[] {
  return groups
    .filter((group) => frameForGroup(group, frames)?.id === frame.id)
    .sort((left, right) => left.y - right.y || left.x - right.x);
}

function convertScreen(frame: M3eFrame, groups: M3eGroup[], frames: M3eFrame[], context: ConversionContext): CanvasScreen {
  const toolbarItems: ToolbarItem[] = [];
  const bodyNodes: CanvasNode[] = [];
  let splitView: ContainerNode | undefined;
  let navigationTitle = frame.name;

  for (const group of groupsForScreen(groups, frame, frames)) {
    const groupNodes: CanvasNode[] = [];
    for (const item of group.items) {
      if (item.kind === 'topAppBar') {
        navigationTitle = labelOf(item, frame.name);
        const leading = toolbarItem(item, iconOf(item), 'topBarLeading', 'icon', context);
        const trailing = toolbarItem(item, iconOf(item, 'icon2'), 'topBarTrailing', 'icon2', context);
        if (leading) toolbarItems.push(leading);
        if (trailing) toolbarItems.push(trailing);
        continue;
      }
      if (item.kind === 'bottomNav') {
        toolbarItems.push(...bottomNavigationItems(item, context));
        continue;
      }
      if (item.kind === 'navRail') {
        const node = mapItem(item, context);
        if (node?.kind === 'navigation-split-view') splitView = node;
        continue;
      }
      const node = mapItem(item, context);
      if (node) groupNodes.push(node);
    }

    if (groupNodes.length === 1) {
      const node = groupNodes[0];
      if (node) bodyNodes.push(node);
    } else if (groupNodes.length > 1) {
      bodyNodes.push({
        id: stableId('m3e-group', group.id, context.usedIds),
        kind: group.axis === 'x' ? 'hstack' : 'vstack',
        spacing: group.axis === 'x' ? 8 : 12,
        alignment: group.axis === 'x' ? 'center' : 'leading',
        children: groupNodes,
      });
    }
  }

  if (splitView) {
    const detail = splitView.children[1];
    if (detail?.kind === 'vstack') detail.children = bodyNodes;
  }

  const rootChildren = splitView ? [splitView] : bodyNodes;
  const root: ContainerNode = {
    id: stableId('m3e-root', frame.id, context.usedIds),
    kind: 'vstack',
    spacing: 16,
    children: rootChildren,
  };

  return {
    id: context.frameIds.get(frame.id) ?? stableId('m3e-screen', frame.id, context.usedIds),
    name: frame.name,
    navigationTitle,
    ...(frame.note ? { notes: frame.note } : {}),
    ...(toolbarItems.length > 0 ? { toolbarItems } : {}),
    ...(frame.swipe ? {
      swipe: Object.fromEntries(
        Object.entries(frame.swipe).flatMap(([direction, target]) => context.frameIds.has(target) ? [[direction, context.frameIds.get(target) as string]] : []),
      ) as Partial<Record<SwipeDirection, string>>,
    } : {}),
    root,
  };
}

export function isM3eDocument(value: unknown): value is JsonObject {
  return isRecord(value) && Array.isArray(value.frames) && Array.isArray(value.groups) && !Array.isArray(value.screens);
}

export function convertM3eDocument(value: unknown): CanvasDocument | null {
  if (!isM3eDocument(value)) return null;
  const rawFrames = Array.isArray(value.frames) ? value.frames : [];
  const rawGroups = Array.isArray(value.groups) ? value.groups : [];
  const frames = rawFrames.map((frame: unknown) => readFrame(frame)).filter((frame): frame is M3eFrame => frame !== null);
  if (frames.length === 0) return null;
  const groups = rawGroups.map((group: unknown) => readGroup(group)).filter((group): group is M3eGroup => group !== null);
  const usedIds = new Set<string>();
  const frameIds = new Map<string, string>();
  for (const frame of frames) frameIds.set(frame.id, stableId('screen', frame.id, usedIds));
  const context: ConversionContext = { usedIds, frameIds };
  const screens = frames.map((frame) => convertScreen(frame, groups, frames, context));
  const activeScreenId = screens[0]?.id;
  if (!activeScreenId) return null;

  const theme = recordValue(value, 'theme');
  const paletteKey = stringValue(value, 'paletteKey');
  const appearance: CanvasDocument['appearance'] = {
    colorScheme: booleanValue(theme ?? {}, 'dark')
      ? 'dark'
      : booleanValue(theme ?? {}, 'bothModes') === false
        ? 'light'
        : 'system',
    accentColor: 'blue',
  };
  switch (paletteKey) {
    case 'purple':
      appearance.accentColor = 'purple';
      break;
    case 'green':
      appearance.accentColor = 'green';
      break;
    case 'coral':
      appearance.accentColor = 'custom';
      appearance.accentHex = '#ff6b6b';
      break;
    case 'amber':
      appearance.accentColor = 'custom';
      appearance.accentHex = '#f59e0b';
      break;
    case 'teal':
      appearance.accentColor = 'custom';
      appearance.accentHex = '#14b8a6';
      break;
    case 'mono':
      appearance.accentColor = 'custom';
      appearance.accentHex = '#6e6e73';
      break;
    case 'blue':
    default:
      appearance.accentColor = 'blue';
      break;
  }
  if (stringValue(theme ?? {}, 'font') === 'robotoSerif') appearance.fontDesign = 'serif';

  const document: CanvasDocument = {
    version: 1,
    name: stringValue(value, 'title')?.trim() || 'M3Eから読み込んだ設計',
    platform: 'iOS',
    minimumOS: '26.0',
    appearance,
    screens,
    activeScreenId,
  };
  return parseCanvasDocument(document);
}
