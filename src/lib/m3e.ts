import { parseCanvasDocument } from './document';
import { isContainerNode } from './nodes';
import type {
  ButtonStyle,
  CanvasDocument,
  CanvasNode,
  CanvasScreen,
  ContainerNode,
  BackgroundStyle,
  CardContentAlignment,
  CardImagePosition,
  ContentPlacement,
  ImageSource,
  NavigationTransition,
  ScreenBackground,
  ScreenDevice,
  ScreenOrientation,
  SwipeDirection,
  TextStyle,
  ToolbarItem,
  NodeKind,
  M3eVariant,
} from '../types/document';

type JsonObject = Record<string, unknown>;

interface M3eFrame {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  place?: ContentPlacement;
  background?: ScreenBackground;
  previewDevice: ScreenDevice;
  previewOrientation: ScreenOrientation;
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

interface M3eExportTab {
  label: string;
  icon: string | null;
}

interface M3eExportAction {
  to: string;
  transition: NavigationTransition;
}

interface M3eExportItem {
  id: string;
  kind: string;
  label: string;
  icon: string | null;
  icon2?: string | null;
  variant: M3eVariant;
  supporting?: string;
  size?: number;
  size2?: number;
  bold?: boolean;
  checked?: boolean;
  value?: number;
  minimum?: number;
  maximum?: number;
  step?: number;
  tabs?: M3eExportTab[];
  selected?: number;
  action?: M3eExportAction;
  actions?: Record<string, M3eExportAction>;
  note?: string;
  wavy?: boolean;
  trackThickness?: number;
  contained?: boolean;
  fill?: ScreenBackground;
  noImage?: boolean;
  imagePos?: CardImagePosition;
  imageSize?: number;
  contentAlign?: CardContentAlignment;
  src?: string;
}

interface M3eExportFrame {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  bg?: ScreenBackground;
  note?: string;
  place?: ContentPlacement;
  swipe?: Partial<Record<SwipeDirection, string>>;
}

interface M3eExportGroup {
  id: string;
  x: number;
  y: number;
  axis: 'x' | 'y';
  items: M3eExportItem[];
}

export interface M3eExportDocument {
  title: string;
  paletteKey: string;
  theme: {
    dark: boolean;
    bothModes: boolean;
    font: string;
  };
  platform: 'web';
  frame: string;
  frames: M3eExportFrame[];
  groups: M3eExportGroup[];
}

interface ConversionContext {
  usedIds: Set<string>;
  frameIds: Map<string, string>;
}

function deviceForFrame(width: number, height: number): ScreenDevice {
  const shortEdge = Math.min(width, height);
  const longEdge = Math.max(width, height);
  if (shortEdge >= 800 || longEdge >= 1180) return 'ipad-pro-11';
  if (shortEdge >= 700 || longEdge >= 1000) return 'ipad-mini';
  if (shortEdge <= 380 && longEdge <= 700) return 'iphone-se';
  return 'iphone-16';
}

function orientationForFrame(width: number, height: number): ScreenOrientation {
  return width > height ? 'landscape' : 'portrait';
}

export interface M3eCompatibilityReport {
  invalidFrameCount: number;
  invalidGroupCount: number;
  orphanedGroupCount: number;
  discardedItemCount: number;
  unresolvedDestinationCount: number;
  unsupportedKinds: string[];
  approximatedKinds: string[];
}

export interface M3eExportCompatibilityReport {
  flattenedItemCount: number;
  unsupportedNodeKinds: string[];
  approximatedKinds: string[];
  unresolvedDestinationCount: number;
  normalizedScreenCount: number;
}

const flattenedOnlyNodeKinds: ReadonlySet<NodeKind> = new Set([
  'vstack', 'hstack', 'lazyvstack', 'lazyhstack', 'zstack', 'glass-container', 'group',
  'lazyvgrid', 'lazyhgrid', 'scrollview', 'list', 'form',
]);

const approximatedNodeKinds: ReadonlySet<NodeKind> = new Set([
  'securefield', 'texteditor', 'colorpicker', 'stepper', 'menu', 'gauge', 'content-unavailable',
  'label', 'link', 'datepicker', 'spacer', 'section', 'disclosure-group', 'sheet', 'groupbox',
  'tabview', 'navigation-split-view', 'alert', 'confirmation-dialog',
]);

const supportedM3eKinds = new Set([
  'box', 'button', 'iconButton', 'fab', 'extendedFab', 'chip', 'topAppBar', 'bottomNav', 'navRail',
  'searchBar', 'card', 'listItem', 'dialog', 'snackbar', 'textField', 'select', 'switch', 'checkbox',
  'slider', 'text', 'image', 'camera', 'map', 'divider', 'loadingIndicator', 'linearProgress',
  'circularProgress', 'splitButton', 'fabMenu', 'toolbar', 'tabs', 'radio', 'badge',
]);

const approximatedM3eKinds = new Set([
  'box', 'iconButton', 'fab', 'extendedFab', 'chip', 'topAppBar', 'bottomNav', 'navRail',
  'card', 'listItem', 'snackbar', 'checkbox', 'radio', 'splitButton', 'fabMenu', 'toolbar', 'badge',
]);

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

function isOneOf<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === 'string' && values.includes(value as T);
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
  const place = value.place === undefined
    ? undefined
    : isOneOf(value.place, ['top', 'center', 'bottom', 'spread'])
      ? value.place
      : null;
  if (place === null) return null;
  const background = value.bg === undefined
    ? undefined
    : isOneOf(value.bg, ['surface', 'surfaceContainerLow', 'surfaceContainer', 'surfaceContainerHigh', 'surfaceContainerHighest', 'primaryContainer', 'secondaryContainer', 'tertiaryContainer', 'primary', 'inverseSurface'])
      ? value.bg
      : null;
  if (background === null) return null;

  const swipeValue = recordValue(value, 'swipe');
  const swipe: Partial<Record<SwipeDirection, string>> = {};
  for (const direction of ['left', 'right', 'up', 'down'] as SwipeDirection[]) {
    const destination = swipeValue && stringValue(swipeValue, direction);
    if (destination) swipe[direction] = destination;
  }

  const width = Math.max(1, numberValue(value, 'w') ?? 412);
  const height = Math.max(1, numberValue(value, 'h') ?? 892);
  return {
    id,
    name,
    x,
    y,
    width,
    height,
    previewDevice: deviceForFrame(width, height),
    previewOrientation: orientationForFrame(width, height),
    ...(place === undefined ? {} : { place }),
    ...(background === undefined ? {} : { background: background as ScreenBackground }),
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
  return frames.find((frame) => group.x >= frame.x && group.x <= frame.x + frame.width && group.y >= frame.y && group.y <= frame.y + frame.height);
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

function textStyleForSize(size: number): TextStyle {
  const styles: Partial<Record<number, TextStyle>> = {
    34: 'largeTitle',
    28: 'title',
    22: 'title2',
    20: 'title3',
    17: 'body',
    16: 'callout',
    15: 'subheadline',
    13: 'footnote',
    12: 'caption',
    11: 'caption2',
  };
  return styles[size] ?? 'custom';
}

function backgroundStyle(item: JsonObject): BackgroundStyle | undefined {
  switch (stringValue(item, 'fill')) {
    case 'primary':
    case 'primaryContainer':
    case 'secondaryContainer':
      return 'accent';
    case 'tertiaryContainer':
      return 'tertiary';
    case 'surface':
    case 'surfaceContainerLow':
    case 'surfaceContainer':
    case 'surfaceContainerHigh':
    case 'surfaceContainerHighest':
      return 'secondary';
    case 'inverseSurface':
      return 'material';
    default:
      return undefined;
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

function actionTarget(item: JsonObject, context: ConversionContext): { destination?: string; back: boolean; transition?: NavigationTransition } {
  const action = recordValue(item, 'action');
  const target = action && stringValue(action, 'to');
  if (!target) return { back: false };
  const transition = action && isOneOf(action.transition, ['slide', 'slideLeft', 'slideUp', 'slideDown', 'fade', 'expand', 'none'])
    ? action.transition
    : undefined;
  if (target === 'back') return { back: true, ...(transition === undefined ? {} : { transition }) };
  const destination = context.frameIds.get(target);
  return destination ? { destination, back: false, ...(transition === undefined ? {} : { transition }) } : { back: false };
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
      if (action.transition) node.navigationTransition = action.transition;
    }
  }
  if (action.back) {
    node.navigationAction = 'back';
    if (action.transition) node.navigationTransition = action.transition;
    node.notes = [node.notes, 'タップで前の画面へ戻る'].filter(Boolean).join('\n');
  }
}

function linkM3eNode(node: CanvasNode, item: JsonObject, context: ConversionContext, fallbackLabel: string, extra: string[] = []): CanvasNode {
  const annotated = appendNotes(node, item, extra);
  const action = actionTarget(item, context);
  if (action.back) {
    const label = labelOf(item, node.kind === 'text' ? node.text : fallbackLabel);
    return {
      id: stableId('m3e-back', node.id, context.usedIds),
      kind: 'button',
      label,
      role: 'normal',
      minHeight: 44,
      ...(node.kind === 'image' && node.systemName.trim() ? { systemName: node.systemName } : {}),
      navigationAction: 'back',
      ...(action.transition === undefined ? {} : { navigationTransition: action.transition }),
      notes: [annotated.notes, 'タップで前の画面へ戻る'].filter(Boolean).join('\n'),
    };
  }
  if (!action.destination) return annotated;

  return {
    id: stableId('m3e-link', node.id, context.usedIds),
    kind: 'navigation-link',
    label: labelOf(item, fallbackLabel),
    destinationScreenId: action.destination,
    minHeight: 44,
    children: [annotated],
    ...(action.transition === undefined ? {} : { navigationTransition: action.transition }),
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
          ...(tabAction && isOneOf(tabAction.transition, ['slide', 'slideLeft', 'slideUp', 'slideDown', 'fade', 'expand', 'none']) ? { navigationTransition: tabAction.transition } : {}),
          notes: 'M3Eのタブ操作をNavigationLinkへ変換しました。',
        }
      : target === 'back'
        ? {
            id: tabId,
            kind: 'button' as const,
            label: title,
            role: 'normal' as const,
            minHeight: 44,
            tabTitle: title,
            tabSystemName: iconOf(tab) ?? 'square',
            navigationAction: 'back' as const,
            ...(tabAction && isOneOf(tabAction.transition, ['slide', 'slideLeft', 'slideUp', 'slideDown', 'fade', 'expand', 'none']) ? { navigationTransition: tabAction.transition } : {}),
            notes: 'M3Eのタブ操作は前の画面へ戻る動作です。',
          }
      : {
          id: tabId,
          kind: 'text' as const,
          text: title,
          fontSize: 17,
          weight: 'regular' as const,
          tabTitle: title,
          tabSystemName: iconOf(tab) ?? 'square',
        };
  });
  const selected = numberValue(item, 'selected');
  const selectedIndex = selected !== undefined && Number.isInteger(selected) && children.length > 0
    ? Math.max(0, Math.min(children.length - 1, selected))
    : undefined;
  return appendNotes({ id, kind: 'tabview', children, ...(selectedIndex === undefined ? {} : { selectedIndex }) }, item);
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
      ...(action.transition === undefined ? {} : { navigationTransition: action.transition }),
    }, item, ['タップで画面へ遷移']);
  }
  if (action.back) {
    node.navigationAction = 'back';
    if (action.transition) node.navigationTransition = action.transition;
    node.notes = 'タップで前の画面へ戻る';
  }
  return appendNotes(node, item);
}

function mapItem(item: JsonObject, context: ConversionContext): CanvasNode | null {
  const sourceId = stringValue(item, 'id') ?? `${stringValue(item, 'kind') ?? 'part'}-${context.usedIds.size}`;
  const id = stableId('m3e', sourceId, context.usedIds);
  const label = stringValue(item, 'label')?.trim() ?? '';
  const icon = iconOf(item);
  const style = buttonStyle(item.variant);
  const imageSource: ImageSource = typeof stringValue(item, 'src') === 'string' && /^https?:\/\//i.test(stringValue(item, 'src') ?? '') ? 'remote' : 'symbol';
  const presentationKind = isOneOf(item.kind, ['fab', 'extendedFab', 'chip', 'splitButton'] as const)
    ? item.kind
    : undefined;

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
        ...(presentationKind ? { m3eKind: presentationKind, m3eVariant: item.variant as M3eVariant } : {}),
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
      const safeOptions = options.length > 0 ? options : ['選択肢'];
      const selected = numberValue(item, 'selected');
      const initialOption = selected !== undefined && Number.isInteger(selected) && safeOptions[selected] !== undefined ? safeOptions[selected] : undefined;
      return appendNotes({ id, kind: 'picker', label: label || '選択', binding: `selection_${sourceId}`, options: safeOptions, ...(initialOption === undefined ? {} : { initialOption }), minHeight: 44 }, item);
    }
    case 'switch':
    case 'checkbox':
    case 'radio': {
      const checked = booleanValue(item, 'checked');
      const controlKind = item.kind === 'checkbox' || item.kind === 'radio' ? item.kind : undefined;
      return appendNotes({ id, kind: 'toggle', label: label || '設定', binding: `is_${sourceId}`, ...(checked === undefined ? {} : { isOn: checked }), minHeight: 44, ...(controlKind ? { m3eKind: controlKind } : {}) }, item);
    }
    case 'slider': {
      const value = Math.max(0, Math.min(100, numberValue(item, 'value') ?? 50));
      return appendNotes({ id, kind: 'slider', label: label || '値', binding: `value_${sourceId}`, value, minimum: 0, maximum: 100, step: 1, minHeight: 44 }, item);
    }
    case 'text': {
      const fontSize = Math.max(11, numberValue(item, 'size') ?? 17);
      return linkM3eNode({ id, kind: 'text', text: label || 'テキスト', fontSize, weight: booleanValue(item, 'bold') ? 'bold' : 'regular', textStyle: textStyleForSize(fontSize) }, item, context, 'テキスト');
    }
    case 'image': {
      const src = stringValue(item, 'src');
      const node = imageNode(id, imageSource === 'remote' ? src : icon, imageSource, label || '画像');
      return linkM3eNode(node, item, context, '画像');
    }
    case 'camera':
      return appendNotes({ id, kind: 'camera', label: label || 'カメラ', minHeight: 44 }, item, ['カメラ入力は標準ButtonからAVFoundationの実装へ接続してください。']);
    case 'map':
      return appendNotes({ id, kind: 'map', label: label || '地図' }, item, ['M3Eの地図をMapKitのMapへ変換しました。位置情報や注釈は実装側で追加してください。']);
    case 'divider':
      return appendNotes({ id, kind: 'divider' }, item);
    case 'loadingIndicator':
      return appendNotes({ id, kind: 'progress', label: label || '読み込み中', value: 0.5, style: 'circular', indeterminate: true }, item, ['M3Eの不確定ローディング表示です。標準SwiftUIでは円形ProgressViewへ変換しました。']);
    case 'linearProgress':
    case 'circularProgress': {
      const value = numberValue(item, 'value');
      const style = item.kind === 'circularProgress' ? 'circular' : 'linear';
      const trackThickness = numberValue(item, 'trackThickness');
      const extras = [
        ...(value === undefined ? ['M3Eの不確定プログレス表示です。'] : []),
        ...(booleanValue(item, 'wavy') ? ['M3Eの波形プログレス指定を保持しています。標準SwiftUIのProgressViewでは波形を直接指定できないため、実装時にカスタム表示へ置き換えてください。'] : []),
        ...(trackThickness !== undefined && Number.isInteger(trackThickness) && trackThickness >= 2 && trackThickness <= 16
          ? [`M3Eのトラック太さ ${trackThickness}pt を保持しています。標準SwiftUIのProgressViewでは太さを直接指定できません。`]
          : []),
      ];
      return appendNotes({
        id,
        kind: 'progress',
        label: label || '進捗',
        style,
        value: value === undefined ? 0.5 : Math.max(0, Math.min(1, value > 1 ? value / 100 : value)),
        ...(value === undefined ? { indeterminate: true } : {}),
        ...(booleanValue(item, 'wavy') ? { wavy: true } : {}),
        ...(trackThickness !== undefined && Number.isInteger(trackThickness) && trackThickness >= 2 && trackThickness <= 16 ? { trackThickness } : {}),
      }, item, extras);
    }
    case 'badge':
      return appendNotes({ id, kind: 'text', text: label, fontSize: 13, weight: 'semibold', textStyle: 'caption', m3eKind: 'badge' }, item);
    case 'box':
      return appendNotes({
        id,
        kind: 'groupbox',
        title: label || 'ボックス',
        children: [],
        ...(backgroundStyle(item) ? { background: backgroundStyle(item) } : {}),
        ...(booleanValue(item, 'checked') ? { isBottomSheet: true } : {}),
      }, item, booleanValue(item, 'checked') ? ['M3Eのボックスをボトムシートとして読み込みました。SwiftUIでは標準Shapeのハンドルを付けた構造として出力します。'] : []);
    case 'card': {
      const imagePosition: CardImagePosition = isOneOf(stringValue(item, 'imagePos'), ['top', 'leading', 'trailing', 'background']) ? stringValue(item, 'imagePos') as CardImagePosition : 'top';
      const contentAlignment: CardContentAlignment = isOneOf(stringValue(item, 'contentAlign'), ['start', 'center', 'end']) ? stringValue(item, 'contentAlign') as CardContentAlignment : 'start';
      const noImage = booleanValue(item, 'noImage') === true;
      const imageSize = numberValue(item, 'imageSize');
      const cardImageSource = stringValue(item, 'src');
      const hasRemoteImage = !!cardImageSource && /^https?:\/\//i.test(cardImageSource);
      const cardImage = noImage ? undefined : imageNode(
        stableId('m3e-card-icon', sourceId, context.usedIds),
        hasRemoteImage ? cardImageSource : icon ?? 'photo',
        hasRemoteImage ? 'remote' : 'symbol',
        label || 'カード画像',
      );
      const textChildren: CanvasNode[] = [];
      if (label) textChildren.push({ id: stableId('m3e-card-title', sourceId, context.usedIds), kind: 'text', text: label, fontSize: 20, weight: 'semibold', textStyle: 'headline' });
      const supporting = stringValue(item, 'supporting')?.trim();
      if (supporting) textChildren.push({ id: stableId('m3e-card-body', sourceId, context.usedIds), kind: 'text', text: supporting, fontSize: 17, weight: 'regular', textStyle: 'body' });
      const text = { id: stableId('m3e-card-content', sourceId, context.usedIds), kind: 'vstack' as const, spacing: 4, alignment: 'leading' as const, frameWidth: 'max' as const, children: textChildren };
      const children: CanvasNode[] = !cardImage
        ? [text]
        : imagePosition === 'background'
          ? [{ id: stableId('m3e-card-background', sourceId, context.usedIds), kind: 'zstack' as const, children: [cardImage, text] }]
          : imagePosition === 'leading' || imagePosition === 'trailing'
            ? [{
                id: stableId('m3e-card-row', sourceId, context.usedIds),
                kind: 'hstack' as const,
                spacing: 12,
                alignment: 'center' as const,
                children: imagePosition === 'leading' ? [cardImage, text] : [text, cardImage],
              }]
            : [cardImage, text];
      const notes = [
        ...(imageSize !== undefined && imageSize > 0 ? [`M3Eカードの画像サイズ ${imageSize}dp を読み込みました。`] : []),
        ...(cardImageSource && !hasRemoteImage ? ['M3Eカードのローカル画像データはSwiftUIのAssetへ移してから差し替えてください。'] : []),
        ...(contentAlignment !== 'start' ? [`M3Eカードの本文位置「${contentAlignment}」を保持しています。`] : []),
      ];
      return linkM3eNode({
        id,
        kind: 'groupbox',
        title: label || 'カード',
        children,
        ...(backgroundStyle(item) ? { background: backgroundStyle(item) } : {}),
        cardImagePosition: imagePosition,
        ...(imageSize === undefined || imageSize <= 0 ? {} : { cardImageSize: imageSize }),
        ...(contentAlignment === 'start' ? {} : { cardContentAlignment: contentAlignment }),
        ...(noImage ? { cardNoImage: true } : {}),
      }, item, context, 'カード', notes);
    }
    case 'listItem':
      return listItemNode(item, context);
    case 'dialog':
      return appendNotes({ id, kind: 'alert', label: '確認を表示', title: label || '確認', message: stringValue(item, 'supporting') ?? '', primaryButton: '続ける', primaryRole: 'normal', minHeight: 44 }, item);
    case 'snackbar': {
      const actionLabel = stringValue(item, 'supporting')?.trim();
      const children: CanvasNode[] = [
        {
          id: stableId('m3e-snackbar-message', sourceId, context.usedIds),
          kind: 'text',
          text: label || '通知',
          fontSize: 15,
          weight: 'regular',
          textStyle: 'callout',
          frameWidth: 'max',
        },
      ];
      if (actionLabel) {
        children.push({
          id: stableId('m3e-snackbar-action', sourceId, context.usedIds),
          kind: 'button',
          label: actionLabel,
          role: 'normal',
          buttonStyle: 'plain',
          minHeight: 44,
        });
      }
      return appendNotes({
        id,
        kind: 'hstack',
        spacing: 8,
        alignment: 'center',
        frameWidth: 'max',
        padding: 8,
        background: 'material',
        cornerRadius: 12,
        children,
      }, item, ['M3EのSnackbarをTextとButtonの意味構造へ変換しました。表示時間や再表示はSwiftUI側で状態管理してください。']);
    }
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
      return appendNotes({
        id,
        kind: item.kind === 'fabMenu' ? 'vstack' : 'hstack',
        label,
        spacing: 8,
        alignment: item.kind === 'fabMenu' ? 'trailing' : 'center',
        children,
        m3eKind: item.kind,
        m3eVariant: item.variant as M3eVariant,
        ...(item.kind === 'fabMenu' ? { m3eIcon: icon ?? 'plus' } : {}),
      }, item);
    }
    case 'navRail': {
      const links = tabEntries(item).map((tab, index) => {
        const tabLabel = labelOf(tab, `項目${index + 1}`);
        const rawActions = recordValue(item, 'actions');
        const action = rawActions && recordValue(rawActions, `tab:${index}`);
        const target = action && stringValue(action, 'to');
        const id = stableId('m3e-rail-link', `${sourceId}-${index}`, context.usedIds);
        const transition = action && isOneOf(action.transition, ['slide', 'slideLeft', 'slideUp', 'slideDown', 'fade', 'expand', 'none'])
          ? action.transition
          : undefined;
        if (target === 'back') {
          return {
            id,
            kind: 'button' as const,
            label: tabLabel,
            role: 'normal' as const,
            minHeight: 44,
            navigationAction: 'back' as const,
            ...(transition === undefined ? {} : { navigationTransition: transition }),
          };
        }
        const destination = target ? context.frameIds.get(target) : undefined;
        return destination
          ? {
              id,
              kind: 'navigation-link' as const,
              label: tabLabel,
              destinationScreenId: destination,
              minHeight: 44,
              ...(transition === undefined ? {} : { navigationTransition: transition }),
            }
          : {
              id,
              kind: 'button' as const,
              label: tabLabel,
              role: 'normal' as const,
              minHeight: 44,
              ...(target ? { notes: 'M3Eの遷移先を解決できませんでした。' } : {}),
            };
      });
      const selectedIndex = numberValue(item, 'selected');
      const normalizedSelectedIndex = selectedIndex !== undefined && Number.isInteger(selectedIndex) && links.length > 0
        ? Math.max(0, Math.min(links.length - 1, selectedIndex))
        : undefined;
      return appendNotes({
        id,
        kind: 'navigation-split-view',
        ...(normalizedSelectedIndex === undefined ? {} : { selectedIndex: normalizedSelectedIndex }),
        ...(booleanValue(item, 'railExpanded') === undefined ? {} : { railExpanded: booleanValue(item, 'railExpanded') }),
        ...(booleanValue(item, 'railModal') === undefined ? {} : { railModal: booleanValue(item, 'railModal') }),
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
  const actions = recordValue(item, 'actions');
  const action = actions && recordValue(actions, suffix);
  if (!icon && !action) return null;
  const target = action && stringValue(action, 'to');
  return {
    id: stableId('m3e-toolbar', `${stringValue(item, 'id') ?? 'bar'}-${suffix}`, context.usedIds),
    title: target === 'back' ? '戻る' : icon ?? '操作',
    ...(icon ? { systemName: icon } : {}),
    placement,
    ...(target === 'back' ? { navigationAction: 'back' as const } : {}),
    ...(action && isOneOf(action.transition, ['slide', 'slideLeft', 'slideUp', 'slideDown', 'fade', 'expand', 'none']) ? { navigationTransition: action.transition } : {}),
    ...(target && target !== 'back' && context.frameIds.has(target) ? { destinationScreenId: context.frameIds.get(target) } : {}),
  };
}

function bottomNavigationItems(item: JsonObject, context: ConversionContext): ToolbarItem[] {
  const sourceId = stringValue(item, 'id') ?? 'bottom-nav';
  const actions = recordValue(item, 'actions');
  const selectedIndex = numberValue(item, 'selected');
  return tabEntries(item).map((tab, index) => {
    const action = actions && recordValue(actions, `tab:${index}`);
    const target = action && stringValue(action, 'to');
    const destination = target && target !== 'back' ? context.frameIds.get(target) : undefined;
    return {
      id: stableId('m3e-bottom-nav', `${sourceId}-${index}`, context.usedIds),
      title: labelOf(tab, `タブ${index + 1}`),
      ...(iconOf(tab) ? { systemName: iconOf(tab) } : {}),
      placement: 'bottomBar' as const,
      ...(target === 'back' ? { navigationAction: 'back' as const } : {}),
      ...(action && isOneOf(action.transition, ['slide', 'slideLeft', 'slideUp', 'slideDown', 'fade', 'expand', 'none']) ? { navigationTransition: action.transition } : {}),
      ...(selectedIndex !== undefined && Number.isInteger(selectedIndex) ? { selected: selectedIndex === index } : {}),
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
  const tabBarItems: ToolbarItem[] = [];
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
        tabBarItems.push(...bottomNavigationItems(item, context));
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
    ...(frame.background === undefined ? {} : { background: frame.background }),
    ...(frame.note ? { notes: frame.note } : {}),
    ...(frame.place ? { contentPlacement: frame.place } : {}),
    previewDevice: frame.previewDevice,
    previewOrientation: frame.previewOrientation,
    ...(toolbarItems.length > 0 ? { toolbarItems } : {}),
    ...(tabBarItems.length > 0 ? { tabBarItems } : {}),
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

export function inspectM3eCompatibility(value: unknown): M3eCompatibilityReport | null {
  if (!isM3eDocument(value)) return null;

  const rawFrames = value.frames as unknown[];
  const frames = rawFrames.map(readFrame).filter((frame): frame is M3eFrame => frame !== null);
  const frameIds = new Set(frames.map((frame) => frame.id));
  const unsupportedKinds = new Set<string>();
  const approximatedKinds = new Set<string>();
  let invalidGroupCount = 0;
  let orphanedGroupCount = 0;
  let discardedItemCount = 0;
  let unresolvedDestinationCount = 0;

  for (const rawGroup of value.groups as unknown[]) {
    if (!isRecord(rawGroup) || !Array.isArray(rawGroup.items)) {
      invalidGroupCount += 1;
      continue;
    }
    const group = readGroup(rawGroup);
    if (!group) {
      invalidGroupCount += 1;
      continue;
    }
    if (!frameForGroup(group, frames)) orphanedGroupCount += 1;
    for (const rawItem of rawGroup.items) {
      if (!isRecord(rawItem)) {
        discardedItemCount += 1;
        continue;
      }
      const kind = stringValue(rawItem, 'kind');
      if (!kind || !supportedM3eKinds.has(kind)) unsupportedKinds.add(kind || 'unknown');
      if (kind && approximatedM3eKinds.has(kind)) approximatedKinds.add(kind);
      const actionTargets = [
        recordValue(rawItem, 'action'),
        ...Object.values(recordValue(rawItem, 'actions') ?? {}).filter(isRecord),
      ].filter(isRecord);
      for (const action of actionTargets) {
        const target = stringValue(action, 'to');
        if (target && target !== 'back' && !frameIds.has(target)) unresolvedDestinationCount += 1;
      }
    }
  }

  for (const frame of frames) {
    for (const destination of Object.values(frame.swipe ?? {})) {
      if (destination && !frameIds.has(destination)) unresolvedDestinationCount += 1;
    }
  }

  return {
    invalidFrameCount: rawFrames.length - frames.length,
    invalidGroupCount,
    orphanedGroupCount,
    discardedItemCount,
    unresolvedDestinationCount,
    unsupportedKinds: [...unsupportedKinds].sort(),
    approximatedKinds: [...approximatedKinds].sort(),
  };
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
  const requestedActiveFrame = stringValue(value, 'frame');
  const activeScreenId = (requestedActiveFrame ? frameIds.get(requestedActiveFrame) : undefined) ?? screens[0]?.id;
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

function exportVariant(node: CanvasNode): M3eVariant {
  if (node.m3eVariant) return node.m3eVariant;
  if (node.kind !== 'button') return node.glass === 'prominent' ? 'filled' : node.glass ? 'elevated' : 'filled';
  switch (node.buttonStyle) {
    case 'plain': return 'text';
    case 'bordered': return 'outlined';
    case 'borderedProminent': return 'filled';
    default: return 'filled';
  }
}

function exportFill(background: BackgroundStyle | undefined): ScreenBackground | undefined {
  switch (background) {
    case 'secondary': return 'surfaceContainerLow';
    case 'tertiary': return 'tertiaryContainer';
    case 'accent': return 'primaryContainer';
    case 'material': return 'surfaceContainer';
    default: return undefined;
  }
}

function exportNote(node: CanvasNode, extra?: string): string | undefined {
  const notes = [node.notes?.trim() ?? '', extra?.trim() ?? ''].filter(Boolean);
  return notes.length > 0 ? notes.join('\n') : undefined;
}

function exportAction(node: CanvasNode, frameIds: Map<string, string>): M3eExportAction | undefined {
  const navigable = node.kind === 'button' || node.kind === 'navigation-link' ? node : undefined;
  if (!navigable) return undefined;
  const target = navigable.navigationAction === 'back'
    ? 'back'
    : navigable.destinationScreenId && frameIds.has(navigable.destinationScreenId)
      ? frameIds.get(navigable.destinationScreenId)
      : undefined;
  if (!target) return undefined;
  return {
    to: target,
    transition: navigable.navigationTransition ?? (target === 'back' ? 'slideLeft' : 'slide'),
  };
}

function exportToolbarAction(item: ToolbarItem, frameIds: Map<string, string>): M3eExportAction | undefined {
  const target = item.navigationAction === 'back'
    ? 'back'
    : item.destinationScreenId && frameIds.has(item.destinationScreenId)
      ? frameIds.get(item.destinationScreenId)
      : undefined;
  if (!target) return undefined;
  return { to: target, transition: item.navigationTransition ?? (target === 'back' ? 'slideLeft' : 'slide') };
}

function exportListItemPresentation(node: Extract<CanvasNode, { kind: 'navigation-link' }>): Pick<M3eExportItem, 'icon' | 'icon2' | 'supporting'> {
  const row = node.children?.find((child): child is ContainerNode => child.kind === 'hstack');
  if (!row) return { icon: null };
  const images = row.children.filter((child): child is Extract<CanvasNode, { kind: 'image' }> => child.kind === 'image');
  const labelStack = row.children.find((child): child is ContainerNode => child.kind === 'vstack');
  const textChildren = labelStack?.children?.filter((child): child is Extract<CanvasNode, { kind: 'text' }> => child.kind === 'text') ?? [];
  const titleIndex = textChildren.findIndex((child) => child.text === node.label);
  const supporting = titleIndex >= 0 ? textChildren[titleIndex + 1]?.text.trim() : undefined;
  const leading = images[0];
  const trailing = images.length > 1 ? images[images.length - 1] : undefined;
  return {
    icon: leading?.source === 'remote' ? null : leading?.systemName ?? null,
    ...(trailing?.source === 'remote' ? {} : trailing?.systemName ? { icon2: trailing.systemName } : {}),
    ...(supporting ? { supporting } : {}),
  };
}

function exportItem(node: CanvasNode, frameIds: Map<string, string>, inheritedNote = ''): M3eExportItem | null {
  const base = (kind: string, label: string, icon: string | null = null, extra: Partial<M3eExportItem> = {}): M3eExportItem => ({
    id: node.id,
    kind,
    label,
    icon,
    variant: exportVariant(node),
    ...extra,
    ...(exportNote(node, inheritedNote) ? { note: exportNote(node, inheritedNote) } : {}),
  });

  switch (node.kind) {
    case 'text':
      return base(node.m3eKind === 'badge' ? 'badge' : 'text', node.text, null, { size: node.fontSize, ...(node.weight === 'bold' || node.weight === 'semibold' ? { bold: true } : {}) });
    case 'button': {
      const buttonKind = node.m3eKind === 'fab' || node.m3eKind === 'extendedFab' || node.m3eKind === 'chip' || node.m3eKind === 'splitButton'
        ? node.m3eKind
        : node.label.trim() ? 'button' : node.systemName ? 'iconButton' : 'button';
      return base(buttonKind, node.label, node.systemName ?? null, {
        ...(node.toggle ? { checked: node.toggle.isOn } : {}),
        action: exportAction(node, frameIds),
      });
    }
    case 'navigation-link': {
      const presentation = exportListItemPresentation(node);
      return base('listItem', node.label, presentation.icon, {
        ...(presentation.icon2 ? { icon2: presentation.icon2 } : {}),
        ...(presentation.supporting ? { supporting: presentation.supporting } : {}),
        action: exportAction(node, frameIds),
      });
    }
    case 'toggle':
      return base(node.m3eKind === 'checkbox' || node.m3eKind === 'radio' ? node.m3eKind : 'switch', node.label, null, { checked: node.isOn ?? false });
    case 'textfield':
      return base('textField', node.label, null);
    case 'searchfield':
      return base('searchBar', node.prompt || node.label, 'magnifyingglass');
    case 'securefield':
      return base('textField', node.label, null, { note: exportNote(node, 'SwiftUIではSecureFieldとして再構成します。') });
    case 'texteditor':
      return base('textField', node.label, null, { note: exportNote(node, 'SwiftUIではTextEditorとして再構成します。') });
    case 'picker': {
      const selected = node.initialOption ? Math.max(0, node.options.indexOf(node.initialOption)) : undefined;
      return base('select', node.label, null, {
        tabs: node.options.map((label) => ({ label, icon: null })),
        ...(selected === undefined || selected < 0 ? {} : { selected }),
      });
    }
    case 'colorpicker':
      return base('textField', node.label, null, { note: exportNote(node, `SwiftUI ColorPickerの色バインディング: ${node.binding}`) });
    case 'slider':
      return base('slider', node.label, null, {
        value: node.maximum > node.minimum ? ((node.value - node.minimum) / (node.maximum - node.minimum)) * 100 : 0,
        note: exportNote(node, `値の範囲: ${node.minimum}〜${node.maximum} / 刻み: ${node.step}`),
      });
    case 'stepper':
      return base('button', node.label, null, { note: exportNote(node, `SwiftUI Stepperとして再構成します。初期値 ${node.value} / 範囲 ${node.minimum}〜${node.maximum} / 刻み ${node.step}`) });
    case 'menu':
      return base('button', node.label, null, { note: exportNote(node, `メニュー項目: ${node.options.join('、')}`) });
    case 'progress':
      return base(node.indeterminate && node.style === 'circular' ? 'loadingIndicator' : node.style === 'circular' ? 'circularProgress' : 'linearProgress', node.label, null, {
        ...(node.indeterminate ? {} : { value: Math.round(node.value * 100) }),
        ...(node.wavy ? { wavy: true } : {}),
        ...(node.trackThickness === undefined ? {} : { trackThickness: node.trackThickness }),
      });
    case 'gauge':
      return base('linearProgress', node.label, null, {
        value: node.maximum > node.minimum ? ((node.value - node.minimum) / (node.maximum - node.minimum)) * 100 : 0,
        note: exportNote(node, `SwiftUI Gaugeとして再構成します。範囲 ${node.minimum}〜${node.maximum}`),
      });
    case 'content-unavailable':
      return base('box', node.title, node.systemName || null, { supporting: node.description });
    case 'label':
      return base('text', node.title, node.systemName || null);
    case 'link':
      return base('button', node.label, null, { note: exportNote(node, `外部リンク: ${node.url}`) });
    case 'datepicker':
      return base('textField', node.label, 'calendar_month', { note: exportNote(node, 'SwiftUIではDatePickerとして再構成します。') });
    case 'image': {
      const remote = node.source === 'remote' && /^https?:\/\//i.test(node.systemName);
      return base('image', node.accessibilityLabel || '画像', node.source === 'symbol' || node.source === undefined ? node.systemName || null : null, remote ? { src: node.systemName } : {});
    }
    case 'camera':
      return base('camera', node.label, null);
    case 'map':
      return base('map', node.label, 'map');
    case 'divider':
      return base('divider', '区切り線');
    case 'spacer':
      return base('box', 'スペーサー', null, { note: exportNote(node, 'SwiftUI Spacerとして再構成します。') });
    case 'alert':
      return base('dialog', node.title || node.label, null, { supporting: node.message, note: exportNote(node, `主ボタン: ${node.primaryButton}${node.secondaryButton ? ` / 副ボタン: ${node.secondaryButton}` : ''}`) });
    case 'confirmation-dialog':
      return base('dialog', node.title || node.label, null, { supporting: node.message, note: exportNote(node, `選択肢: ${node.options.join('、')}${node.cancelButton ? ` / キャンセル: ${node.cancelButton}` : ''}`) });
    default:
      return null;
  }
}

function exportTabItem(node: CanvasNode): M3eExportTab {
  const label = node.tabTitle
    || (node.kind === 'text' ? node.text : node.kind === 'button' || node.kind === 'navigation-link' ? node.label : '')
    || 'タブ';
  const icon = node.tabSystemName
    || (node.kind === 'button' ? node.systemName : null)
    || (node.kind === 'image' ? node.systemName : null);
  return { label, icon: icon || null };
}

function exportTabsNode(node: ContainerNode, frameIds: Map<string, string>, inheritedNote: string): M3eExportItem {
  const tabs = node.children.map((child) => exportTabItem(child));
  const actions = Object.fromEntries(node.children.flatMap((child, index) => {
    const action = exportAction(child, frameIds);
    return action ? [[`tab:${index}`, action]] : [];
  }));
  return {
    id: node.id,
    kind: 'tabs',
    label: node.title || 'タブ',
    icon: null,
    variant: exportVariant(node),
    tabs,
    ...(node.selectedIndex === undefined ? {} : { selected: node.selectedIndex }),
    ...(Object.keys(actions).length > 0 ? { actions } : {}),
    ...(exportNote(node, inheritedNote) ? { note: exportNote(node, inheritedNote) } : {}),
  };
}

function exportNavigationSplitNode(node: ContainerNode, frameIds: Map<string, string>, inheritedNote: string): M3eExportItem {
  const sidebar = node.children[0];
  const entries = sidebar && Array.isArray(sidebar.children) ? sidebar.children : [];
  const tabs = entries.map((child) => exportTabItem(child));
  const actions = Object.fromEntries(entries.flatMap((child, index) => {
    const action = exportAction(child, frameIds);
    return action ? [[`tab:${index}`, action]] : [];
  }));
  return {
    id: node.id,
    kind: 'navRail',
    label: 'ナビゲーションレール',
    icon: null,
    variant: exportVariant(node),
    tabs,
    ...(node.selectedIndex === undefined ? {} : { selected: node.selectedIndex }),
    ...(Object.keys(actions).length > 0 ? { actions } : {}),
    ...(exportNote(node, inheritedNote) ? { note: exportNote(node, inheritedNote) } : {}),
  };
}

function exportCardPresentation(node: ContainerNode): Pick<M3eExportItem, 'icon' | 'supporting' | 'src'> {
  const descendants: CanvasNode[] = [];
  const visit = (current: CanvasNode): void => {
    descendants.push(current);
    if (Array.isArray(current.children)) current.children.forEach(visit);
  };
  node.children.forEach(visit);
  const image = descendants.find((child): child is Extract<CanvasNode, { kind: 'image' }> => child.kind === 'image');
  const texts = descendants.filter((child): child is Extract<CanvasNode, { kind: 'text' }> => child.kind === 'text');
  const supporting = texts.find((child) => child.text.trim() && child.text !== node.title)?.text.trim();
  const remote = image?.source === 'remote' && /^https?:\/\//i.test(image.systemName);
  return {
    icon: remote ? null : image?.systemName ?? null,
    ...(remote ? { src: image.systemName } : {}),
    ...(supporting ? { supporting } : {}),
  };
}

function exportFabMenuNode(node: ContainerNode, frameIds: Map<string, string>, inheritedNote: string): M3eExportItem {
  const buttons = node.children.filter((child): child is Extract<CanvasNode, { kind: 'button' }> => child.kind === 'button');
  const actions = Object.fromEntries(buttons.flatMap((button, index) => {
    const action = exportAction(button, frameIds);
    return action ? [[`tab:${index}`, action]] : [];
  }));
  return {
    id: node.id,
    kind: 'fabMenu',
    label: node.label ?? 'FABメニュー',
    icon: node.m3eIcon ?? null,
    variant: exportVariant(node),
    tabs: buttons.map((button) => exportTabItem(button)),
    ...(Object.keys(actions).length > 0 ? { actions } : {}),
    ...(exportNote(node, inheritedNote) ? { note: exportNote(node, inheritedNote) } : {}),
  };
}

function exportToolbarNode(node: ContainerNode, frameIds: Map<string, string>, inheritedNote: string): M3eExportItem | null {
  if (node.kind !== 'hstack' || node.children.length === 0 || node.children.some((child) => child.kind !== 'button')) return null;
  const buttons = node.children.filter((child): child is Extract<CanvasNode, { kind: 'button' }> => child.kind === 'button');
  if (buttons.some((button) => button.toggle)) return null;
  const actions = Object.fromEntries(buttons.flatMap((button, index) => {
    const action = exportAction(button, frameIds);
    return action ? [[`tab:${index}`, action]] : [];
  }));
  return {
    id: node.id,
    kind: 'toolbar',
    label: 'ツールバー',
    icon: null,
    variant: 'filled',
    tabs: buttons.map((button) => exportTabItem(button)),
    ...(Object.keys(actions).length > 0 ? { actions } : {}),
    ...(exportNote(node, inheritedNote) ? { note: exportNote(node, inheritedNote) } : {}),
  };
}

function exportSnackbarNode(node: ContainerNode, inheritedNote: string): M3eExportItem | null {
  if (node.kind !== 'hstack' || node.background !== 'material' || node.cornerRadius !== 12 || node.children.length < 1 || node.children.length > 2) return null;
  const message = node.children.find((child): child is Extract<CanvasNode, { kind: 'text' }> => child.kind === 'text');
  const action = node.children.find((child): child is Extract<CanvasNode, { kind: 'button' }> => child.kind === 'button');
  if (!message || node.children.some((child) => child !== message && child !== action)) return null;
  return {
    id: node.id,
    kind: 'snackbar',
    label: message.text,
    icon: null,
    variant: exportVariant(node),
    ...(action ? { supporting: action.label } : {}),
    ...(exportNote(node, inheritedNote) ? { note: exportNote(node, inheritedNote) } : {}),
  };
}

function isExportContainer(node: CanvasNode): node is ContainerNode {
  return isContainerNode(node);
}

function exportContainerItems(node: ContainerNode, frameIds: Map<string, string>, inheritedNote = ''): M3eExportItem[] {
  if (node.m3eKind === 'fabMenu') return [exportFabMenuNode(node, frameIds, inheritedNote)];
  if (node.kind === 'tabview') return [exportTabsNode(node, frameIds, inheritedNote)];
  if (node.kind === 'navigation-split-view') {
    const detail = node.children[1];
    const detailItems = detail && isExportContainer(detail) ? exportContainerItems(detail, frameIds, inheritedNote) : [];
    return [exportNavigationSplitNode(node, frameIds, inheritedNote), ...detailItems];
  }

  const snackbar = exportSnackbarNode(node, inheritedNote);
  if (snackbar) return [snackbar];
  const toolbar = exportToolbarNode(node, frameIds, inheritedNote);
  if (toolbar) return [toolbar];

  const containerNote = node.kind === 'zstack'
    ? [inheritedNote, 'SwiftUI ZStackの重なりを含みます。'].filter(Boolean).join('\n')
    : inheritedNote;
  const children = node.children.flatMap((child) => isExportContainer(child)
    ? exportContainerItems(child, frameIds, containerNote)
    : [exportItem(child, frameIds, containerNote)].filter((item): item is M3eExportItem => item !== null));
  const titled = node.kind === 'section' || node.kind === 'groupbox' || node.kind === 'disclosure-group' || node.kind === 'sheet';
  if (!titled) return children;

  const title = node.title || node.label || (node.kind === 'sheet' ? 'シート' : 'グループ');
  const isBottomSheet = node.isBottomSheet === true;
  const isCard = node.kind === 'groupbox' && !isBottomSheet;
  const card = isCard ? exportCardPresentation(node) : { icon: null };
  const containerItem: M3eExportItem = {
    id: `${node.id}-container`,
    kind: isCard ? 'card' : 'box',
    label: title,
    icon: card.icon,
    variant: node.background === 'accent' ? 'filled' : 'outlined',
    ...(exportFill(node.background) ? { fill: exportFill(node.background) } : {}),
    ...(isBottomSheet ? { checked: true } : {}),
    ...(isCard && node.cardNoImage ? { noImage: true } : {}),
    ...(isCard && node.cardImagePosition ? { imagePos: node.cardImagePosition } : {}),
    ...(isCard && node.cardImageSize !== undefined ? { imageSize: node.cardImageSize } : {}),
    ...(isCard && node.cardContentAlignment ? { contentAlign: node.cardContentAlignment } : {}),
    ...(isCard && card.supporting ? { supporting: card.supporting } : {}),
    ...(isCard && card.src ? { src: card.src } : {}),
    note: exportNote(node, node.kind === 'sheet' ? 'SwiftUI sheetとして再構成します。' : undefined),
  };
  return [containerItem, ...children];
}

function frameDimensions(screen: CanvasScreen): { width: number; height: number } {
  const sizes: Record<ScreenDevice, { width: number; height: number }> = {
    'iphone-se': { width: 375, height: 667 },
    'iphone-16': { width: 412, height: 892 },
    'ipad-mini': { width: 744, height: 1133 },
    'ipad-pro-11': { width: 834, height: 1194 },
  };
  const size = sizes[screen.previewDevice ?? 'iphone-16'];
  return screen.previewOrientation === 'landscape'
    ? { width: size.height, height: size.width }
    : size;
}

function exportSwipe(screen: CanvasScreen, frameIds: Map<string, string>): Partial<Record<SwipeDirection, string>> | undefined {
  const swipe = Object.fromEntries(
    Object.entries(screen.swipe ?? {}).flatMap(([direction, destination]) => {
      const resolved = destination ? frameIds.get(destination) : undefined;
      return resolved ? [[direction, resolved]] : [];
    }),
  ) as Partial<Record<SwipeDirection, string>>;
  return Object.keys(swipe).length > 0 ? swipe : undefined;
}

function exportTopBar(screen: CanvasScreen, frameIds: Map<string, string>): M3eExportItem | null {
  const leading = (screen.toolbarItems ?? []).find((item) => item.placement === 'topBarLeading');
  const trailing = (screen.toolbarItems ?? []).find((item) => item.placement === 'topBarTrailing');
  if (!leading && !trailing && !screen.navigationTitle) return null;
  const actions = Object.fromEntries([
    leading ? ['icon', exportToolbarAction(leading, frameIds)] : [],
    trailing ? ['icon2', exportToolbarAction(trailing, frameIds)] : [],
  ].filter((entry): entry is [string, M3eExportAction] => entry[1] !== undefined));
  return {
    id: `${screen.id}-top-app-bar`,
    kind: 'topAppBar',
    label: screen.navigationTitle,
    icon: leading?.systemName ?? null,
    variant: 'filled',
    ...(trailing?.systemName ? { icon2: trailing.systemName } : {}),
    ...(Object.keys(actions).length > 0 ? { actions } : {}),
  };
}

function exportBottomBar(screen: CanvasScreen, frameIds: Map<string, string>): M3eExportItem | null {
  const items = screen.tabBarItems?.length
    ? screen.tabBarItems
    : (screen.toolbarItems ?? []).filter((item) => item.placement === 'bottomBar');
  if (items.length === 0) return null;
  const actions = Object.fromEntries(items.flatMap((item, index) => {
    const action = exportToolbarAction(item, frameIds);
    return action ? [[`tab:${index}`, action]] : [];
  }));
  const selected = items.findIndex((item) => item.selected);
  return {
    id: `${screen.id}-bottom-navigation`,
    kind: 'bottomNav',
    label: 'タブバー',
    icon: null,
    variant: 'filled',
    tabs: items.map((item) => ({ label: item.title, icon: item.systemName ?? null })),
    ...(selected >= 0 ? { selected } : {}),
    ...(Object.keys(actions).length > 0 ? { actions } : {}),
  };
}

function exportGroupsForScreen(screen: CanvasScreen, frameIds: Map<string, string>, size: { width: number; height: number }): M3eExportGroup[] {
  const groups: M3eExportGroup[] = [];
  const topBar = exportTopBar(screen, frameIds);
  if (topBar) groups.push({ id: `${screen.id}-group-top-bar`, x: 0, y: 0, axis: 'x', items: [topBar] });

  let y = 80;
  for (const [index, node] of screen.root.children.entries()) {
    const items = isExportContainer(node)
      ? exportContainerItems(node, frameIds)
      : [exportItem(node, frameIds)].filter((item): item is M3eExportItem => item !== null);
    if (items.length === 0) continue;
    const axis = node.kind === 'hstack' || node.kind === 'lazyhstack' || node.kind === 'lazyhgrid' ? 'x' : 'y';
    groups.push({ id: `${screen.id}-group-${index}`, x: 16, y, axis, items });
    y += Math.max(80, items.length * 72);
  }

  const bottomBar = exportBottomBar(screen, frameIds);
  if (bottomBar) groups.push({ id: `${screen.id}-group-bottom-bar`, x: 0, y: Math.max(y, size.height - 88), axis: 'x', items: [bottomBar] });
  return groups;
}

function exportPaletteKey(appearance: CanvasDocument['appearance']): string {
  if (appearance.accentColor !== 'custom') return appearance.accentColor;
  switch (appearance.accentHex?.toLowerCase()) {
    case '#14b8a6': return 'teal';
    case '#f59e0b': return 'amber';
    case '#ff6b6b': return 'coral';
    case '#6e6e73': return 'mono';
    default: return 'blue';
  }
}

function exportFont(appearance: CanvasDocument['appearance']): string {
  return appearance.fontDesign === 'serif' ? 'robotoSerif' : appearance.fontDesign === 'rounded' ? 'system' : 'system';
}

export function exportM3eDocument(document: CanvasDocument): M3eExportDocument {
  const frameIds = new Map(document.screens.map((screen) => [screen.id, screen.id]));
  const frames = document.screens.map((screen, index) => {
    const size = frameDimensions(screen);
    const swipe = exportSwipe(screen, frameIds);
    return {
      id: screen.id,
      name: screen.name,
      x: index * (size.width + 120),
      y: 0,
      w: size.width,
      h: size.height,
      ...(screen.background ? { bg: screen.background } : {}),
      ...(screen.notes?.trim() ? { note: screen.notes.trim() } : {}),
      ...(screen.contentPlacement ? { place: screen.contentPlacement } : {}),
      ...(swipe ? { swipe } : {}),
    } satisfies M3eExportFrame;
  });
  const groups = document.screens.flatMap((screen) => exportGroupsForScreen(screen, frameIds, frameDimensions(screen)));
  return {
    title: document.name,
    paletteKey: exportPaletteKey(document.appearance),
    theme: {
      dark: document.appearance.colorScheme === 'dark',
      bothModes: document.appearance.colorScheme === 'system',
      font: exportFont(document.appearance),
    },
    platform: 'web',
    frame: document.activeScreenId,
    frames,
    groups,
  };
}

function collectExportCompatibilityKinds(
  node: CanvasNode,
  unsupportedNodeKinds: Set<string>,
  approximatedKinds: Set<string>,
): void {
  if (flattenedOnlyNodeKinds.has(node.kind)) unsupportedNodeKinds.add(node.kind);
  if (approximatedNodeKinds.has(node.kind)) approximatedKinds.add(node.kind);
  if (node.m3eKind && approximatedM3eKinds.has(node.m3eKind)) approximatedKinds.add(node.m3eKind);
  if (Array.isArray(node.children)) {
    for (const child of node.children) collectExportCompatibilityKinds(child, unsupportedNodeKinds, approximatedKinds);
  }
}

export function inspectM3eExportCompatibility(document: CanvasDocument): M3eExportCompatibilityReport {
  const exported = exportM3eDocument(document);
  const frameIds = new Set(document.screens.map((screen) => screen.id));
  const unsupportedNodeKinds = new Set<string>();
  const approximatedKinds = new Set<string>();
  let unresolvedDestinationCount = 0;

  for (const screen of document.screens) {
    collectExportCompatibilityKinds(screen.root, unsupportedNodeKinds, approximatedKinds);
    for (const node of screen.root.children) {
      const visit = (current: CanvasNode): void => {
        if ((current.kind === 'button' || current.kind === 'navigation-link')
          && current.destinationScreenId
          && !frameIds.has(current.destinationScreenId)) {
          unresolvedDestinationCount += 1;
        }
        if (Array.isArray(current.children)) {
          for (const child of current.children) visit(child);
        }
      };
      visit(node);
    }
    for (const item of [...(screen.toolbarItems ?? []), ...(screen.tabBarItems ?? [])]) {
      if (item.destinationScreenId && !frameIds.has(item.destinationScreenId)) unresolvedDestinationCount += 1;
    }
    for (const destination of Object.values(screen.swipe ?? {})) {
      if (destination && !frameIds.has(destination)) unresolvedDestinationCount += 1;
    }
  }

  return {
    flattenedItemCount: exported.groups.reduce(
      (count, group) => count + group.items.filter((item) => item.kind !== 'topAppBar' && item.kind !== 'bottomNav').length,
      0,
    ),
    unsupportedNodeKinds: [...unsupportedNodeKinds].sort(),
    approximatedKinds: [...approximatedKinds].sort(),
    unresolvedDestinationCount,
    normalizedScreenCount: exported.frames.length,
  };
}

export function generateM3eJson(document: CanvasDocument): string {
  return JSON.stringify(exportM3eDocument(document), null, 2);
}
