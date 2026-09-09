import { parseCanvasDocument } from './document';
import { isContainerNode } from './nodes';
import type {
  AlertAction,
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
  M3eAction,
  M3eCorners,
  M3eItemMetadata,
  M3eMenuAction,
  NavigationTransition,
  ScreenBackground,
  ScreenDevice,
  ScreenOrientation,
  SwipeDirection,
  TextStyle,
  ToolbarItem,
  NodeKind,
  M3ePresentationKind,
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
  free?: boolean;
  locked?: boolean;
  positioned?: boolean;
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
  minimum?: number;
  maximum?: number;
  step?: number;
  radiusTop?: number;
  radiusBottom?: number;
  corners?: M3eCorners;
  bold?: boolean;
  checked?: boolean;
  value?: number;
  tabs?: M3eExportTab[];
  selected?: number;
  action?: M3eExportAction;
  actions?: Record<string, M3eExportAction>;
  note?: string;
  noteHistory?: string[];
  wavy?: boolean;
  trackThickness?: number;
  contained?: boolean;
  switch?: boolean;
  noCheck?: boolean;
  fill?: ScreenBackground;
  iconFill?: ScreenBackground | 'none';
  textColor?: 'primary' | 'secondary' | 'onSurface' | 'onSurfaceVariant' | 'onPrimaryContainer' | 'onSecondaryContainer' | 'onTertiaryContainer' | 'inverseOnSurface';
  noImage?: boolean;
  imagePos?: CardImagePosition;
  imageSize?: number;
  contentAlign?: CardContentAlignment;
  src?: string;
  railExpanded?: boolean;
  railModal?: boolean;
  railExpansionSide?: 'left' | 'right';
  toggle?: {
    icon?: string | null;
    variant?: M3eVariant;
    label?: string;
  };
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
  unresolvedActionCount: number;
  unresolvedPaths: string[];
  flattenedLayoutCount: number;
  unsupportedKinds: string[];
  approximatedKinds: string[];
  preservedFields: string[];
  approximatedFields: string[];
  lostFields: string[];
  invalidFields: string[];
  duplicateIdFields: string[];
  unknownFields: string[];
}

export type M3eCompatibilityAnomalyStatus = 'approximated' | 'unresolved' | 'lost';
export type M3eCompatibilityAnomalyCode =
  | 'INVALID_FRAME'
  | 'INVALID_GROUP'
  | 'ORPHANED_GROUP'
  | 'DISCARDED_ITEM'
  | 'FLATTENED_LAYOUT'
  | 'UNSUPPORTED_KIND'
  | 'APPROXIMATED_KIND'
  | 'APPROXIMATED_FIELD'
  | 'UNRESOLVED_NAVIGATION'
  | 'LOST_FIELD'
  | 'INVALID_FIELD'
  | 'DUPLICATE_ID'
  | 'UNKNOWN_FIELD'
  | 'ROUND_TRIP';

export interface M3eCompatibilityAnomaly {
  code: M3eCompatibilityAnomalyCode;
  status: M3eCompatibilityAnomalyStatus;
  label: string;
  detail: string;
}

export interface M3eExportCompatibilityReport {
  flattenedItemCount: number;
  unsupportedNodeKinds: string[];
  flattenedNodeKinds: string[];
  approximatedKinds: string[];
  unresolvedDestinationCount: number;
  unresolvedActionCount: number;
  unresolvedPaths: string[];
  preservedFields: string[];
  approximatedFields: string[];
  lostFields: string[];
  invalidFields: string[];
  duplicateIdFields: string[];
  unknownFields: string[];
  normalizedScreenCount: number;
  roundTripValid: boolean;
}

const m3eApproximationReasons: Record<string, string> = {
  securefield: 'textFieldへ投影するため、伏字入力はSwiftUI側の実装で補います',
  texteditor: 'textFieldへ投影するため、複数行入力はSwiftUI側の実装で補います',
  colorpicker: 'textFieldへ投影するため、色入力はSwiftUI側の実装で補います',
  stepper: 'buttonへ投影するため、値の増減ロジックはSwiftUI側の実装で補います',
  menu: 'buttonへ投影するため、メニュー項目は実装用メモへ残します',
  gauge: 'linearProgressへ投影するため、Gaugeの表示形式は保持しません',
  'content-unavailable': 'boxへ投影するため、空状態の専用表示は保持しません',
  label: 'textへ投影するため、Labelのアイコン構造は保持しません',
  link: 'buttonへ投影するため、外部URLは実装用メモへ残します',
  datepicker: 'textFieldへ投影するため、DatePickerの表示形式は保持しません',
  spacer: 'boxへ投影するため、空間の意味は実装用メモへ残します',
  section: 'boxへ投影するため、SwiftUIのSection構造は保持しません',
  'disclosure-group': 'boxへ投影するため、展開状態は保持しません',
  sheet: 'boxへ投影するため、モーダル表示は実装用メモへ残します',
  groupbox: 'cardまたはboxへ投影するため、GroupBoxの構造は保持しません',
  tabview: 'tabsへ投影するため、SwiftUIのTabView構造は保持しません',
  'navigation-split-view': 'navRailへ投影するため、列構造はM3Eの射影へ正規化します',
  alert: 'dialogへ投影するため、Alert固有のSwiftUI構造は保持しません',
  'confirmation-dialog': 'dialogへ投影するため、選択肢はM3Eのtabsへ正規化します',
};

const m3eFieldApproximationReasons: Record<string, string> = {
  size: 'SwiftUIのframeへ近似',
  size2: 'SwiftUIの最小高さへ近似',
  minimum: 'SwiftUIの値範囲へ近似',
  maximum: 'SwiftUIの値範囲へ近似',
  step: 'SwiftUIの刻みへ近似',
  radiusTop: 'SwiftUIの角丸へ近似',
  radiusBottom: 'SwiftUIの角丸へ近似',
  corners: 'SwiftUIの角丸へ近似',
  textColor: 'SwiftUIのforegroundStyleへ近似',
  iconFill: 'SwiftUIの背景へ近似',
  src: 'SwiftUIのAssetまたはURLへ差し替え',
  noCheck: 'SwiftUI標準部品に直接対応なし',
  contained: 'SwiftUIのMaterial背景へ近似',
  railExpansionSide: 'NavigationSplitViewの標準レイアウトへ近似',
};

export function describeM3eCompatibilityKinds(kinds: string[]): string {
  return kinds.map((kind) => {
    const reason = m3eApproximationReasons[kind];
    return reason ? `${kind}（${reason}）` : kind;
  }).join(', ');
}

export function describeM3eCompatibilityFields(fields: string[]): string {
  return fields.map((field) => {
    const reason = m3eFieldApproximationReasons[field];
    return reason ? `${field}（${reason}）` : field;
  }).join(', ');
}

function compatibilityAnomaly(
  status: M3eCompatibilityAnomalyStatus,
  code: M3eCompatibilityAnomalyCode,
  label: string,
  detail: string,
): M3eCompatibilityAnomaly {
  return { status, code, label, detail };
}

function unresolvedNavigationDetail(
  report: Pick<M3eCompatibilityReport | M3eExportCompatibilityReport, 'unresolvedDestinationCount' | 'unresolvedActionCount' | 'unresolvedPaths'>,
  suffix: string,
): string {
  const summary = `遷移先${report.unresolvedDestinationCount}件、操作${report.unresolvedActionCount}件${suffix}`;
  return report.unresolvedPaths.length > 0 ? `${summary} 対象: ${report.unresolvedPaths.join(', ')}` : summary;
}

function importCompatibilityAnomalies(report: M3eCompatibilityReport): M3eCompatibilityAnomaly[] {
  const anomalies: M3eCompatibilityAnomaly[] = [];
  if (report.invalidFrameCount > 0) anomalies.push(compatibilityAnomaly('lost', 'INVALID_FRAME', '無効な画面', `${report.invalidFrameCount}件を読み込めませんでした。`));
  if (report.invalidGroupCount > 0) anomalies.push(compatibilityAnomaly('lost', 'INVALID_GROUP', '無効なグループ', `${report.invalidGroupCount}件を読み込めませんでした。`));
  if (report.orphanedGroupCount > 0) anomalies.push(compatibilityAnomaly('lost', 'ORPHANED_GROUP', '画面外グループ', `${report.orphanedGroupCount}件を画面へ割り当てられませんでした。`));
  if (report.discardedItemCount > 0) anomalies.push(compatibilityAnomaly('lost', 'DISCARDED_ITEM', '破棄した項目', `${report.discardedItemCount}件が有効な項目として解釈できませんでした。`));
  if (report.flattenedLayoutCount > 0) anomalies.push(compatibilityAnomaly('approximated', 'FLATTENED_LAYOUT', '自由配置の平坦化', `${report.flattenedLayoutCount}件の座標・ロック情報を意味構造へ変換しました。`));
  if (report.unresolvedDestinationCount > 0 || report.unresolvedActionCount > 0) {
    anomalies.push(compatibilityAnomaly(
      'unresolved',
      'UNRESOLVED_NAVIGATION',
      '未解決の遷移',
      unresolvedNavigationDetail(report, 'を確認できませんでした。'),
    ));
  }
  if (report.unsupportedKinds.length > 0) anomalies.push(compatibilityAnomaly('lost', 'UNSUPPORTED_KIND', '未対応パーツ', report.unsupportedKinds.join(', ')));
  if (report.approximatedKinds.length > 0) anomalies.push(compatibilityAnomaly('approximated', 'APPROXIMATED_KIND', '近似変換', describeM3eCompatibilityKinds(report.approximatedKinds)));
  if (report.approximatedFields.length > 0) anomalies.push(compatibilityAnomaly('approximated', 'APPROXIMATED_FIELD', '近似フィールド', describeM3eCompatibilityFields(report.approximatedFields)));
  if (report.lostFields.length > 0) anomalies.push(compatibilityAnomaly('lost', 'LOST_FIELD', '失われたフィールド', report.lostFields.join(', ')));
  if (report.invalidFields.length > 0) anomalies.push(compatibilityAnomaly('lost', 'INVALID_FIELD', '不正な値', report.invalidFields.join(', ')));
  if (report.duplicateIdFields.length > 0) anomalies.push(compatibilityAnomaly('lost', 'DUPLICATE_ID', '重複したID', report.duplicateIdFields.join(', ')));
  if (report.unknownFields.length > 0) anomalies.push(compatibilityAnomaly('lost', 'UNKNOWN_FIELD', '未知のフィールド', report.unknownFields.join(', ')));
  return anomalies;
}

function exportCompatibilityAnomalies(report: M3eExportCompatibilityReport): M3eCompatibilityAnomaly[] {
  const anomalies: M3eCompatibilityAnomaly[] = [];
  if (report.unsupportedNodeKinds.length > 0) anomalies.push(compatibilityAnomaly('lost', 'UNSUPPORTED_KIND', '直接対応のない要素', report.unsupportedNodeKinds.join(', ')));
  if (report.flattenedNodeKinds.length > 0) anomalies.push(compatibilityAnomaly('approximated', 'FLATTENED_LAYOUT', '構造平坦化', report.flattenedNodeKinds.join(', ')));
  if (report.approximatedKinds.length > 0) anomalies.push(compatibilityAnomaly('approximated', 'APPROXIMATED_KIND', '近似変換', describeM3eCompatibilityKinds(report.approximatedKinds)));
  if (report.unresolvedDestinationCount > 0 || report.unresolvedActionCount > 0) {
    anomalies.push(compatibilityAnomaly(
      'unresolved',
      'UNRESOLVED_NAVIGATION',
      '未解決の遷移',
      unresolvedNavigationDetail(report, 'を出力できませんでした。'),
    ));
  }
  if (report.approximatedFields.length > 0) anomalies.push(compatibilityAnomaly('approximated', 'APPROXIMATED_FIELD', '近似フィールド', describeM3eCompatibilityFields(report.approximatedFields)));
  if (report.lostFields.length > 0) anomalies.push(compatibilityAnomaly('lost', 'LOST_FIELD', '出力できないフィールド', report.lostFields.join(', ')));
  if (report.invalidFields.length > 0) anomalies.push(compatibilityAnomaly('lost', 'INVALID_FIELD', '不正な値', report.invalidFields.join(', ')));
  if (report.duplicateIdFields.length > 0) anomalies.push(compatibilityAnomaly('lost', 'DUPLICATE_ID', '重複したID', report.duplicateIdFields.join(', ')));
  if (report.unknownFields.length > 0) anomalies.push(compatibilityAnomaly('lost', 'UNKNOWN_FIELD', '未知のフィールド', report.unknownFields.join(', ')));
  if (!report.roundTripValid) anomalies.push(compatibilityAnomaly('lost', 'ROUND_TRIP', '再読込検証', '書き出したM3E JSONを再読込できませんでした。'));
  return anomalies;
}

export function getM3eCompatibilityAnomalies(report: M3eCompatibilityReport | M3eExportCompatibilityReport): M3eCompatibilityAnomaly[] {
  return 'invalidFrameCount' in report ? importCompatibilityAnomalies(report) : exportCompatibilityAnomalies(report);
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

const m3eButtonKinds = new Set<M3ePresentationKind>(['button', 'iconButton', 'fab', 'extendedFab', 'chip', 'splitButton']);

const m3ePreservableFields = [
  'supporting', 'icon', 'icon2', 'size', 'size2', 'minimum', 'maximum', 'step', 'value', 'bold', 'note', 'radiusTop', 'radiusBottom', 'corners',
  'tabs', 'selected', 'action', 'actions', 'checked', 'switch', 'noCheck', 'noImage', 'imagePos', 'imageSize',
  'contentAlign', 'textColor', 'fill', 'iconFill', 'src', 'wavy', 'trackThickness', 'contained', 'railExpanded',
  'railModal', 'railExpansionSide', 'toggle', 'noteHistory',
] as const;
type M3ePreservableField = typeof m3ePreservableFields[number];

const approximatedM3eFields = new Set<M3ePreservableField>([
  'size', 'size2', 'minimum', 'maximum', 'step', 'radiusTop', 'radiusBottom', 'corners', 'textColor', 'iconFill',
  'src', 'noCheck', 'contained', 'railExpansionSide',
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
  const free = booleanValue(value, 'free');
  const locked = booleanValue(value, 'locked');
  const positioned = value.pos !== undefined || items.some((item) => item.pos !== undefined);
  return items.length > 0
    ? {
        id,
        x,
        y,
        axis,
        items,
        ...(free === undefined ? {} : { free }),
        ...(locked === undefined ? {} : { locked }),
        ...(positioned ? { positioned: true } : {}),
      }
    : null;
}

function groupLayoutNote(group: M3eGroup): string | undefined {
  const details = [
    group.free === true ? '自由配置' : '',
    group.positioned ? '座標指定' : '',
    group.locked === true || group.items.some((item) => item.locked === true) ? 'ロック' : '',
  ].filter(Boolean);
  return details.length > 0
    ? `M3Eの${details.join('・')}をSwiftUIの意味構造へ平坦化しました。`
    : undefined;
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

function rawIconOf(item: JsonObject, key = 'icon'): string | null | undefined {
  const value = item[key];
  return value === null ? null : typeof value === 'string' ? value : undefined;
}

function preferOriginalIcon(raw: string | null | undefined, semantic: string | null | undefined): string | null | undefined {
  if (raw === undefined) return semantic;
  if (raw === null) return semantic ?? null;
  const converted = symbolAliases[raw] ?? raw;
  return semantic === undefined || semantic === converted ? raw : semantic ?? null;
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

function m3eAction(value: unknown): M3eAction | undefined {
  if (!isRecord(value) || !stringValue(value, 'to')) return undefined;
  const transition = value.transition;
  return isOneOf(transition, ['slide', 'slideLeft', 'slideUp', 'slideDown', 'fade', 'expand', 'none'])
    ? { to: value.to as string, transition }
    : transition === undefined
      ? { to: value.to as string, transition: 'slide' }
      : undefined;
}

function resolvedM3eMenuActions(item: JsonObject, context: ConversionContext): Record<string, M3eMenuAction> | undefined {
  const rawActions = recordValue(item, 'actions');
  if (!rawActions) return undefined;
  const actions = Object.fromEntries(Object.entries(rawActions).flatMap(([slot, value]): [string, M3eMenuAction][] => {
    const action = m3eAction(value);
    if (!action) return [];
    if (action.to === 'back') return [[slot, { navigationAction: 'back', navigationTransition: action.transition }]];
    const destinationScreenId = context.frameIds.get(action.to);
    return destinationScreenId
      ? [[slot, { destinationScreenId, navigationTransition: action.transition }]]
      : [];
  }));
  return Object.keys(actions).length > 0 ? actions : undefined;
}

function resolvedM3eAlertAction(value: unknown, context: ConversionContext): Omit<AlertAction, 'label' | 'role'> | undefined {
  const action = m3eAction(value);
  if (!action) return undefined;
  if (action.to === 'back') return { navigationAction: 'back', navigationTransition: action.transition };
  const destinationScreenId = context.frameIds.get(action.to);
  return destinationScreenId ? { destinationScreenId, navigationTransition: action.transition } : undefined;
}

function m3eDialogActions(item: JsonObject, context: ConversionContext): AlertAction[] {
  return tabEntries(item).flatMap((tab, index) => {
    const label = stringValue(tab, 'label')?.trim();
    if (!label) return [];
    const actions = recordValue(item, 'actions');
    const action = resolvedM3eAlertAction(actions && actions[`tab:${index}`], context)
      ?? (index === 0 ? resolvedM3eAlertAction(item.action, context) : undefined);
    return [{ label, role: 'normal' as const, ...(action ?? {}) }];
  });
}

function readM3eMetadata(item: JsonObject): M3eItemMetadata | undefined {
  const metadata: M3eItemMetadata = {};
  const copyNumber = (key: 'size' | 'size2' | 'minimum' | 'maximum' | 'step' | 'value' | 'radiusTop' | 'radiusBottom' | 'imageSize'): void => {
    const value = numberValue(item, key);
    if (value !== undefined && value >= 0) metadata[key] = value;
  };
  for (const key of ['size', 'size2', 'minimum', 'maximum', 'step', 'value', 'radiusTop', 'radiusBottom', 'imageSize'] as const) copyNumber(key);

  const supporting = stringValue(item, 'supporting');
  const icon = item.icon === null ? null : stringValue(item, 'icon');
  const icon2 = item.icon2 === null ? null : stringValue(item, 'icon2');
  const src = stringValue(item, 'src');
  if (supporting !== undefined) metadata.supporting = supporting;
  if (item.icon === null || icon !== undefined) metadata.icon = icon ?? null;
  if (item.icon2 === null || icon2 !== undefined) metadata.icon2 = icon2 ?? null;
  if (src !== undefined) metadata.src = src;
  const bold = booleanValue(item, 'bold');
  if (bold !== undefined) metadata.bold = bold;
  const note = stringValue(item, 'note');
  if (note !== undefined) metadata.note = note;

  const selected = numberValue(item, 'selected');
  if (selected !== undefined && Number.isInteger(selected) && selected >= 0) metadata.selected = selected;
  for (const key of ['checked', 'switch', 'noCheck', 'noImage', 'wavy', 'contained', 'railExpanded', 'railModal'] as const) {
    const value = booleanValue(item, key);
    if (value !== undefined) metadata[key] = value;
  }
  const railExpansionSide = stringValue(item, 'railExpansionSide');
  if (railExpansionSide === 'left' || railExpansionSide === 'right') metadata.railExpansionSide = railExpansionSide;

  const imagePos = stringValue(item, 'imagePos');
  if (isOneOf(imagePos, ['top', 'leading', 'trailing', 'background'])) metadata.imagePos = imagePos;
  const contentAlign = stringValue(item, 'contentAlign');
  if (isOneOf(contentAlign, ['start', 'center', 'end'])) metadata.contentAlign = contentAlign;
  const fill = stringValue(item, 'fill');
  if (isOneOf(fill, ['surface', 'surfaceContainerLow', 'surfaceContainer', 'surfaceContainerHigh', 'surfaceContainerHighest', 'primaryContainer', 'secondaryContainer', 'tertiaryContainer', 'primary', 'inverseSurface'])) metadata.fill = fill;
  const iconFill = item.iconFill === 'none' ? 'none' : stringValue(item, 'iconFill');
  if (iconFill === 'none' || isOneOf(iconFill, ['surface', 'surfaceContainerLow', 'surfaceContainer', 'surfaceContainerHigh', 'surfaceContainerHighest', 'primaryContainer', 'secondaryContainer', 'tertiaryContainer', 'primary', 'inverseSurface'])) metadata.iconFill = iconFill;
  const textColor = stringValue(item, 'textColor');
  if (isOneOf(textColor, ['primary', 'secondary', 'onSurface', 'onSurfaceVariant', 'onPrimaryContainer', 'onSecondaryContainer', 'onTertiaryContainer', 'inverseOnSurface'])) metadata.textColor = textColor;
  const trackThickness = numberValue(item, 'trackThickness');
  if (trackThickness !== undefined && Number.isInteger(trackThickness) && trackThickness >= 2 && trackThickness <= 16) metadata.trackThickness = trackThickness;

  const corners = recordValue(item, 'corners');
  if (corners && ['tl', 'tr', 'bl', 'br'].every((key) => numberValue(corners, key) !== undefined && (numberValue(corners, key) ?? -1) >= 0)) {
    metadata.corners = {
      tl: numberValue(corners, 'tl') as number,
      tr: numberValue(corners, 'tr') as number,
      bl: numberValue(corners, 'bl') as number,
      br: numberValue(corners, 'br') as number,
    };
  }

  if (Array.isArray(item.tabs)) {
    const validTabs = item.tabs.every((tab) => isRecord(tab)
      && typeof tab.label === 'string'
      && (tab.icon === undefined || tab.icon === null || typeof tab.icon === 'string'));
    if (validTabs) {
      metadata.tabs = item.tabs.map((tab) => {
        const entry = tab as JsonObject;
        return { label: stringValue(entry, 'label') as string, icon: entry.icon === null ? null : stringValue(entry, 'icon') ?? null };
      });
    }
  }
  const action = m3eAction(item.action);
  if (action) metadata.action = action;
  const rawActions = recordValue(item, 'actions');
  if (rawActions) {
    const entries = Object.entries(rawActions);
    const actions = Object.fromEntries(entries.flatMap(([slot, value]) => {
      const parsed = m3eAction(value);
      return parsed ? [[slot, parsed]] : [];
    }));
    if (entries.every(([, value]) => m3eAction(value) !== undefined)) metadata.actions = actions;
  }

  const toggle = recordValue(item, 'toggle');
  if (toggle) {
    const parsed: M3eItemMetadata['toggle'] = {
      ...(toggle.icon === null ? { icon: null } : stringValue(toggle, 'icon') === undefined ? {} : { icon: stringValue(toggle, 'icon') }),
      ...(isOneOf(toggle.variant, ['filled', 'tonal', 'elevated', 'outlined', 'text']) ? { variant: toggle.variant } : {}),
      ...(stringValue(toggle, 'label') === undefined ? {} : { label: stringValue(toggle, 'label') }),
    };
    if (Object.keys(parsed).length > 0) metadata.toggle = parsed;
  }

  if (Array.isArray(item.noteHistory) && item.noteHistory.every((entry) => typeof entry === 'string')) {
    metadata.noteHistory = item.noteHistory as string[];
  }
  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

function inspectM3eItemFields(item: JsonObject): { preserved: string[]; approximated: string[]; lost: string[] } {
  const metadata = readM3eMetadata(item);
  const preserved: string[] = [];
  const approximated: string[] = [];
  const lost: string[] = [];
  for (const field of m3ePreservableFields) {
    if (!Object.prototype.hasOwnProperty.call(item, field)) continue;
    if (metadata && Object.prototype.hasOwnProperty.call(metadata, field)) {
      preserved.push(field);
      if (approximatedM3eFields.has(field)) approximated.push(field);
    } else {
      lost.push(field);
    }
  }
  return { preserved, approximated, lost };
}

const m3eDocumentFields = new Set(['title', 'paletteKey', 'theme', 'platform', 'frame', 'frames', 'groups']);
const m3eThemeFields = new Set(['dark', 'bothModes', 'font']);
const m3eFrameFields = new Set(['id', 'name', 'x', 'y', 'w', 'h', 'bg', 'note', 'place', 'swipe']);
const m3eGroupFields = new Set(['id', 'x', 'y', 'axis', 'items', 'free', 'locked', 'pos']);
const m3ePositionFields = new Set(['x', 'y']);
const m3eItemFields = new Set([
  'id', 'kind', 'label', 'icon', 'icon2', 'variant', 'supporting', 'size', 'size2', 'minimum', 'maximum', 'step',
  'radiusTop', 'radiusBottom', 'corners', 'bold', 'checked', 'value', 'tabs', 'selected', 'action', 'actions',
  'note', 'noteHistory', 'wavy', 'trackThickness', 'contained', 'switch', 'noCheck', 'fill', 'iconFill', 'textColor',
  'noImage', 'imagePos', 'imageSize', 'contentAlign', 'src', 'railExpanded', 'railModal', 'railExpansionSide', 'toggle',
  'locked', 'pos',
]);
const m3eTabFields = new Set(['label', 'icon']);
const m3eActionFields = new Set(['to', 'transition']);
const m3eCornersFields = new Set(['tl', 'tr', 'bl', 'br']);
const m3eToggleFields = new Set(['icon', 'variant', 'label']);

function collectUnknownObjectFields(value: unknown, allowed: ReadonlySet<string>, path: string, unknownFields: Set<string>): void {
  if (!isRecord(value)) return;
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) unknownFields.add(`${path}.${key}`);
  }
}

function collectM3eUnknownFields(value: unknown): string[] {
  if (!isRecord(value)) return [];
  const unknownFields = new Set<string>();
  collectUnknownObjectFields(value, m3eDocumentFields, 'document', unknownFields);

  const theme = recordValue(value, 'theme');
  collectUnknownObjectFields(theme, m3eThemeFields, 'theme', unknownFields);

  const frames = Array.isArray(value.frames) ? value.frames : [];
  frames.forEach((frame, frameIndex) => {
    const framePath = `frames[${frameIndex}]`;
    collectUnknownObjectFields(frame, m3eFrameFields, framePath, unknownFields);
    if (!isRecord(frame)) return;
    collectUnknownObjectFields(recordValue(frame, 'swipe'), new Set(['left', 'right', 'up', 'down']), `${framePath}.swipe`, unknownFields);
  });

  const groups = Array.isArray(value.groups) ? value.groups : [];
  groups.forEach((group, groupIndex) => {
    const groupPath = `groups[${groupIndex}]`;
    collectUnknownObjectFields(group, m3eGroupFields, groupPath, unknownFields);
    if (!isRecord(group) || !Array.isArray(group.items)) return;
    collectUnknownObjectFields(recordValue(group, 'pos'), m3ePositionFields, `${groupPath}.pos`, unknownFields);
    group.items.forEach((item, itemIndex) => {
      const itemPath = `${groupPath}.items[${itemIndex}]`;
      collectUnknownObjectFields(item, m3eItemFields, itemPath, unknownFields);
      if (!isRecord(item)) return;
      collectUnknownObjectFields(recordValue(item, 'pos'), m3ePositionFields, `${itemPath}.pos`, unknownFields);
      collectUnknownObjectFields(recordValue(item, 'corners'), m3eCornersFields, `${itemPath}.corners`, unknownFields);
      collectUnknownObjectFields(recordValue(item, 'toggle'), m3eToggleFields, `${itemPath}.toggle`, unknownFields);
      collectUnknownObjectFields(recordValue(item, 'action'), m3eActionFields, `${itemPath}.action`, unknownFields);
      const actions = recordValue(item, 'actions');
      if (actions) {
        Object.entries(actions).forEach(([slot, action]) => {
          collectUnknownObjectFields(action, m3eActionFields, `${itemPath}.actions.${slot}`, unknownFields);
        });
      }
      if (Array.isArray(item.tabs)) {
        item.tabs.forEach((tab, tabIndex) => {
          collectUnknownObjectFields(tab, m3eTabFields, `${itemPath}.tabs[${tabIndex}]`, unknownFields);
        });
      }
    });
  });

  return [...unknownFields].sort();
}

function collectM3eInvalidFields(value: unknown): string[] {
  if (!isRecord(value)) return [];
  const invalidFields = new Set<string>();
  const hasField = (record: JsonObject, key: string): boolean => Object.prototype.hasOwnProperty.call(record, key);
  const numericField = (record: JsonObject, key: string, path: string): number | undefined => {
    if (!hasField(record, key)) return undefined;
    const field = record[key];
    if (typeof field !== 'number' || !Number.isFinite(field)) {
      invalidFields.add(path);
      return undefined;
    }
    return field;
  };
  const positiveDimension = (record: JsonObject, key: 'w' | 'h', path: string): void => {
    const field = numericField(record, key, path);
    if (field !== undefined && field <= 0) invalidFields.add(path);
  };
  const position = (record: JsonObject, path: string): void => {
    if (!hasField(record, 'pos')) return;
    const value = record.pos;
    if (!isRecord(value)) {
      invalidFields.add(path);
      return;
    }
    numericField(value, 'x', `${path}.x`);
    numericField(value, 'y', `${path}.y`);
  };
  const selectionKinds = new Set(['select', 'tabs', 'bottomNav', 'navRail']);
  const validTransitions: readonly NavigationTransition[] = ['slide', 'slideLeft', 'slideUp', 'slideDown', 'fade', 'expand', 'none'];
  const invalidAction = (action: unknown, path: string): void => {
    if (!isRecord(action)) {
      invalidFields.add(path);
      return;
    }
    if (typeof action.to !== 'string' || !action.to.trim()) invalidFields.add(`${path}.to`);
    if (hasField(action, 'transition') && !isOneOf(action.transition, validTransitions)) invalidFields.add(`${path}.transition`);
  };

  const frames = Array.isArray(value.frames) ? value.frames : [];
  const frameIds = new Set(frames.flatMap((frame) => isRecord(frame) && typeof frame.id === 'string' ? [frame.id] : []));
  if (Object.prototype.hasOwnProperty.call(value, 'title') && typeof value.title !== 'string') invalidFields.add('document.title');
  if (Object.prototype.hasOwnProperty.call(value, 'paletteKey') && typeof value.paletteKey !== 'string') invalidFields.add('document.paletteKey');
  if (Object.prototype.hasOwnProperty.call(value, 'platform') && typeof value.platform !== 'string') invalidFields.add('document.platform');
  if (Object.prototype.hasOwnProperty.call(value, 'frame')) {
    if (typeof value.frame !== 'string' || !value.frame.trim() || !frameIds.has(value.frame)) invalidFields.add('document.frame');
  }
  if (Object.prototype.hasOwnProperty.call(value, 'theme')) {
    if (!isRecord(value.theme)) {
      invalidFields.add('theme');
    } else {
      if (Object.prototype.hasOwnProperty.call(value.theme, 'dark') && typeof value.theme.dark !== 'boolean') invalidFields.add('theme.dark');
      if (Object.prototype.hasOwnProperty.call(value.theme, 'bothModes') && typeof value.theme.bothModes !== 'boolean') invalidFields.add('theme.bothModes');
      if (Object.prototype.hasOwnProperty.call(value.theme, 'font') && typeof value.theme.font !== 'string') invalidFields.add('theme.font');
    }
  }
  frames.forEach((frame, frameIndex) => {
    const framePath = `frames[${frameIndex}]`;
    if (!isRecord(frame)) {
      invalidFields.add(framePath);
      return;
    }
    if (typeof frame.id !== 'string' || !frame.id.trim()) invalidFields.add(`${framePath}.id`);
    if (typeof frame.name !== 'string' || !frame.name.trim()) invalidFields.add(`${framePath}.name`);
    numericField(frame, 'x', `${framePath}.x`);
    numericField(frame, 'y', `${framePath}.y`);
    if (Object.prototype.hasOwnProperty.call(frame, 'place') && !isOneOf(frame.place, ['top', 'center', 'bottom', 'spread'])) invalidFields.add(`${framePath}.place`);
    if (Object.prototype.hasOwnProperty.call(frame, 'bg') && !isOneOf(frame.bg, ['surface', 'surfaceContainerLow', 'surfaceContainer', 'surfaceContainerHigh', 'surfaceContainerHighest', 'primaryContainer', 'secondaryContainer', 'tertiaryContainer', 'primary', 'inverseSurface'])) invalidFields.add(`${framePath}.bg`);
    positiveDimension(frame, 'w', `${framePath}.w`);
    positiveDimension(frame, 'h', `${framePath}.h`);
    if (!hasField(frame, 'swipe')) return;
    const swipe = frame.swipe;
    if (!isRecord(swipe)) {
      invalidFields.add(`${framePath}.swipe`);
      return;
    }
    for (const direction of ['left', 'right', 'up', 'down'] as const) {
      if (!hasField(swipe, direction)) continue;
      if (typeof swipe[direction] !== 'string' || !swipe[direction].trim()) invalidFields.add(`${framePath}.swipe.${direction}`);
    }
  });

  const groups = Array.isArray(value.groups) ? value.groups : [];
  groups.forEach((group, groupIndex) => {
    const groupPath = `groups[${groupIndex}]`;
    if (!isRecord(group)) {
      invalidFields.add(groupPath);
      return;
    }
    if (typeof group.id !== 'string' || !group.id.trim()) invalidFields.add(`${groupPath}.id`);
    numericField(group, 'x', `${groupPath}.x`);
    numericField(group, 'y', `${groupPath}.y`);
    position(group, `${groupPath}.pos`);
    if (!isOneOf(group.axis, ['x', 'y'])) invalidFields.add(`${groupPath}.axis`);
    if (!Array.isArray(group.items)) {
      invalidFields.add(`${groupPath}.items`);
      return;
    }
    if (group.items.length === 0) invalidFields.add(`${groupPath}.items`);
    group.items.forEach((item, itemIndex) => {
      const itemPath = `${groupPath}.items[${itemIndex}]`;
      if (!isRecord(item)) {
        invalidFields.add(itemPath);
        return;
      }
      position(item, `${itemPath}.pos`);
      for (const key of ['size', 'size2', 'minimum', 'maximum', 'step', 'value', 'radiusTop', 'radiusBottom', 'imageSize'] as const) {
        const field = numericField(item, key, `${itemPath}.${key}`);
        if (field !== undefined && field < 0) invalidFields.add(`${itemPath}.${key}`);
      }
      if (Object.prototype.hasOwnProperty.call(item, 'trackThickness')) {
        const trackThickness = numericField(item, 'trackThickness', `${itemPath}.trackThickness`);
        if (trackThickness !== undefined && (!Number.isInteger(trackThickness) || trackThickness < 2 || trackThickness > 16)) invalidFields.add(`${itemPath}.trackThickness`);
      }
      for (const key of ['bold', 'checked', 'switch', 'noCheck', 'noImage', 'wavy', 'contained', 'railExpanded', 'railModal'] as const) {
        if (Object.prototype.hasOwnProperty.call(item, key) && typeof item[key] !== 'boolean') invalidFields.add(`${itemPath}.${key}`);
      }
      for (const key of ['supporting', 'note', 'src'] as const) {
        if (Object.prototype.hasOwnProperty.call(item, key) && typeof item[key] !== 'string') invalidFields.add(`${itemPath}.${key}`);
      }
      for (const key of ['icon', 'icon2'] as const) {
        if (Object.prototype.hasOwnProperty.call(item, key) && item[key] !== null && typeof item[key] !== 'string') invalidFields.add(`${itemPath}.${key}`);
      }
      if (Object.prototype.hasOwnProperty.call(item, 'variant') && !isOneOf(item.variant, ['filled', 'tonal', 'elevated', 'outlined', 'text'])) invalidFields.add(`${itemPath}.variant`);
      if (Object.prototype.hasOwnProperty.call(item, 'imagePos') && !isOneOf(item.imagePos, ['top', 'leading', 'trailing', 'background'])) invalidFields.add(`${itemPath}.imagePos`);
      if (Object.prototype.hasOwnProperty.call(item, 'contentAlign') && !isOneOf(item.contentAlign, ['start', 'center', 'end'])) invalidFields.add(`${itemPath}.contentAlign`);
      if (Object.prototype.hasOwnProperty.call(item, 'fill') && !isOneOf(item.fill, ['surface', 'surfaceContainerLow', 'surfaceContainer', 'surfaceContainerHigh', 'surfaceContainerHighest', 'primaryContainer', 'secondaryContainer', 'tertiaryContainer', 'primary', 'inverseSurface'])) invalidFields.add(`${itemPath}.fill`);
      if (Object.prototype.hasOwnProperty.call(item, 'iconFill') && item.iconFill !== 'none' && !isOneOf(item.iconFill, ['surface', 'surfaceContainerLow', 'surfaceContainer', 'surfaceContainerHigh', 'surfaceContainerHighest', 'primaryContainer', 'secondaryContainer', 'tertiaryContainer', 'primary', 'inverseSurface'])) invalidFields.add(`${itemPath}.iconFill`);
      if (Object.prototype.hasOwnProperty.call(item, 'textColor') && !isOneOf(item.textColor, ['primary', 'secondary', 'onSurface', 'onSurfaceVariant', 'onPrimaryContainer', 'onSecondaryContainer', 'onTertiaryContainer', 'inverseOnSurface'])) invalidFields.add(`${itemPath}.textColor`);
      if (Object.prototype.hasOwnProperty.call(item, 'railExpansionSide') && !isOneOf(item.railExpansionSide, ['left', 'right'])) invalidFields.add(`${itemPath}.railExpansionSide`);
      if (Object.prototype.hasOwnProperty.call(item, 'corners')) {
        if (!isRecord(item.corners)) {
          invalidFields.add(`${itemPath}.corners`);
        } else {
          for (const corner of ['tl', 'tr', 'bl', 'br'] as const) {
            const value = numericField(item.corners, corner, `${itemPath}.corners.${corner}`);
            if (value !== undefined && value < 0) invalidFields.add(`${itemPath}.corners.${corner}`);
          }
        }
      }
      if (item.kind === 'slider') {
        const minimum = numericField(item, 'minimum', `${itemPath}.minimum`);
        const maximum = numericField(item, 'maximum', `${itemPath}.maximum`);
        const step = numericField(item, 'step', `${itemPath}.step`);
        const value = numericField(item, 'value', `${itemPath}.value`);
        if (minimum !== undefined && maximum !== undefined && minimum >= maximum) {
          invalidFields.add(`${itemPath}.minimum`);
          invalidFields.add(`${itemPath}.maximum`);
        }
        if (step !== undefined && step <= 0) invalidFields.add(`${itemPath}.step`);
        if (step !== undefined && minimum !== undefined && maximum !== undefined && minimum < maximum && step > maximum - minimum) {
          invalidFields.add(`${itemPath}.step`);
        }
        if (value !== undefined && (value < 0 || value > 100)) invalidFields.add(`${itemPath}.value`);
      }
      if (hasField(item, 'selected')) {
        const selected = numericField(item, 'selected', `${itemPath}.selected`);
        if (selected === undefined || !Number.isInteger(selected) || selected < 0) {
          invalidFields.add(`${itemPath}.selected`);
        } else if (selectionKinds.has(String(item.kind))) {
          const optionCount = Array.isArray(item.tabs) ? item.tabs.filter(isRecord).length : 0;
          if (selected >= optionCount) invalidFields.add(`${itemPath}.selected`);
        }
      }
      if (Object.prototype.hasOwnProperty.call(item, 'tabs')) {
        if (!Array.isArray(item.tabs)) {
          invalidFields.add(`${itemPath}.tabs`);
        } else {
          item.tabs.forEach((tab, tabIndex) => {
            const tabPath = `${itemPath}.tabs[${tabIndex}]`;
            if (!isRecord(tab)) {
              invalidFields.add(tabPath);
              return;
            }
            if (typeof tab.label !== 'string') invalidFields.add(`${tabPath}.label`);
            if (tab.icon !== undefined && tab.icon !== null && typeof tab.icon !== 'string') invalidFields.add(`${tabPath}.icon`);
          });
        }
      }
      if (Object.prototype.hasOwnProperty.call(item, 'action')) invalidAction(item.action, `${itemPath}.action`);
      if (Object.prototype.hasOwnProperty.call(item, 'actions')) {
        if (!isRecord(item.actions)) {
          invalidFields.add(`${itemPath}.actions`);
        } else {
          Object.entries(item.actions).forEach(([slot, action]) => invalidAction(action, `${itemPath}.actions.${slot}`));
        }
      }
      if (Object.prototype.hasOwnProperty.call(item, 'toggle')) {
        const toggle = item.toggle;
        if (!isRecord(toggle)) {
          invalidFields.add(`${itemPath}.toggle`);
        } else {
          if (toggle.icon !== undefined && toggle.icon !== null && typeof toggle.icon !== 'string') invalidFields.add(`${itemPath}.toggle.icon`);
          if (toggle.variant !== undefined && !isOneOf(toggle.variant, ['filled', 'tonal', 'elevated', 'outlined', 'text'])) invalidFields.add(`${itemPath}.toggle.variant`);
          if (toggle.label !== undefined && typeof toggle.label !== 'string') invalidFields.add(`${itemPath}.toggle.label`);
        }
      }
    });
  });

  return [...invalidFields].sort();
}

function collectM3eDuplicateIdFields(value: unknown): string[] {
  if (!isRecord(value)) return [];
  const duplicateFields = new Set<string>();
  const collect = (entries: Array<{ id: unknown; path: string }>): void => {
    const firstPathById = new Map<string, string>();
    for (const entry of entries) {
      if (typeof entry.id !== 'string' || !entry.id.trim()) continue;
      const firstPath = firstPathById.get(entry.id);
      if (firstPath) {
        duplicateFields.add(firstPath);
        duplicateFields.add(entry.path);
      } else {
        firstPathById.set(entry.id, entry.path);
      }
    }
  };

  const frames = Array.isArray(value.frames) ? value.frames : [];
  collect(frames.map((frame, index) => ({ id: isRecord(frame) ? frame.id : undefined, path: `frames[${index}].id` })));

  const groups = Array.isArray(value.groups) ? value.groups : [];
  collect(groups.map((group, index) => ({ id: isRecord(group) ? group.id : undefined, path: `groups[${index}].id` })));
  collect(groups.flatMap((group, groupIndex) => {
    if (!isRecord(group) || !Array.isArray(group.items)) return [];
    return group.items.map((item, itemIndex) => ({
      id: isRecord(item) ? item.id : undefined,
      path: `groups[${groupIndex}].items[${itemIndex}].id`,
    }));
  }));

  return [...duplicateFields].sort();
}

function appendNotes(node: CanvasNode, item: JsonObject, extra: string[] = []): CanvasNode {
  const notes = [
    node.notes?.trim() ?? '',
    stringValue(item, 'supporting')?.trim() ? `補足: ${stringValue(item, 'supporting')}` : '',
    stringValue(item, 'note')?.trim() ?? '',
    ...extra,
  ].filter(Boolean);
  if (notes.length > 0) node.notes = notes.join('\n');
  const m3eKind = isOneOf(item.kind, [
    'box', 'button', 'iconButton', 'fab', 'extendedFab', 'chip', 'topAppBar', 'bottomNav', 'navRail', 'searchBar',
    'card', 'listItem', 'dialog', 'snackbar', 'textField', 'select', 'switch', 'checkbox', 'slider', 'text', 'image',
    'camera', 'map', 'divider', 'loadingIndicator', 'linearProgress', 'circularProgress', 'splitButton', 'fabMenu',
    'toolbar', 'tabs', 'radio', 'badge',
  ] as const) ? item.kind : undefined;
  const variant = isOneOf(item.variant, ['filled', 'tonal', 'elevated', 'outlined', 'text'] as const) ? item.variant : undefined;
  if (m3eKind) node.m3eKind = m3eKind as M3ePresentationKind;
  if (variant) node.m3eVariant = variant as M3eVariant;
  const m3eMetadata = readM3eMetadata(item);
  if (m3eMetadata) node.m3eMetadata = m3eMetadata;
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
      ...(annotated.m3eKind === undefined ? {} : { m3eKind: annotated.m3eKind }),
      ...(annotated.m3eVariant === undefined ? {} : { m3eVariant: annotated.m3eVariant }),
      ...(annotated.m3eMetadata === undefined ? {} : { m3eMetadata: annotated.m3eMetadata }),
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
    ...(annotated.m3eKind === undefined ? {} : { m3eKind: annotated.m3eKind }),
    ...(annotated.m3eVariant === undefined ? {} : { m3eVariant: annotated.m3eVariant }),
    ...(annotated.m3eMetadata === undefined ? {} : { m3eMetadata: annotated.m3eMetadata }),
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

function imageSourceFor(src: string | undefined): ImageSource {
  if (!src) return 'symbol';
  return /^https?:\/\//i.test(src) ? 'remote' : 'asset';
}

function tabViewNode(item: JsonObject, context: ConversionContext): CanvasNode {
  const id = stableId('m3e-tabview', stringValue(item, 'id') ?? 'tabs', context.usedIds);
  const children = tabEntries(item).map((tab, index) => {
    const title = labelOf(tab, `タブ${index + 1}`);
    const tabId = stableId('m3e-tab', `${stringValue(item, 'id') ?? 'tabs'}-${index}`, context.usedIds);
    const tabMetadata = readM3eMetadata(tab);
    const metadataProps = tabMetadata === undefined ? {} : { m3eMetadata: tabMetadata };
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
          ...metadataProps,
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
            ...metadataProps,
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
          ...metadataProps,
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
  const rawIcon2 = rawIconOf(item, 'icon2');
  const icon2 = rawIcon2 === null ? null : iconOf(item, 'icon2');
  const style = buttonStyle(item.variant);
  const imageSource = imageSourceFor(stringValue(item, 'src'));
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
        ...(rawIcon2 === null ? { m3eIcon2: null } : icon2 === undefined ? {} : { m3eIcon2: icon2 }),
        ...(style ? { buttonStyle: style } : {}),
        ...(presentationKind ? { m3eKind: presentationKind, m3eVariant: item.variant as M3eVariant } : {}),
        ...(item.kind === 'splitButton'
          ? (() => {
              const actions = resolvedM3eMenuActions(item, context);
              return actions ? { m3eMenuActions: actions } : {};
            })()
          : {}),
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
      return linkM3eNode({ id, kind: 'searchfield', label: label || '検索', binding: `query_${sourceId}`, prompt: label || '検索', minHeight: 44 }, item, context, '検索');
    case 'textField':
      return linkM3eNode({ id, kind: 'textfield', label: label || '入力', binding: `value_${sourceId}`, minHeight: 44 }, item, context, '入力');
    case 'select': {
      const options = tabEntries(item).map((tab, index) => labelOf(tab, `選択肢${index + 1}`));
      const safeOptions = options.length > 0 ? options : ['選択肢'];
      const selected = numberValue(item, 'selected');
      const initialOption = selected !== undefined && Number.isInteger(selected) && safeOptions[selected] !== undefined ? safeOptions[selected] : undefined;
      return linkM3eNode({ id, kind: 'picker', label: label || '選択', binding: `selection_${sourceId}`, options: safeOptions, ...(initialOption === undefined ? {} : { initialOption }), minHeight: 44 }, item, context, '選択');
    }
    case 'switch':
    case 'checkbox':
    case 'radio': {
      const checked = booleanValue(item, 'checked');
      const controlKind = item.kind === 'checkbox' || item.kind === 'radio' ? item.kind : undefined;
      return linkM3eNode({ id, kind: 'toggle', label: label || '設定', binding: `is_${sourceId}`, ...(checked === undefined ? {} : { isOn: checked }), minHeight: 44, ...(controlKind ? { m3eKind: controlKind } : {}) }, item, context, '設定');
    }
    case 'slider': {
      const minimum = numberValue(item, 'minimum') ?? 0;
      const maximum = Math.max(minimum + 0.01, numberValue(item, 'maximum') ?? 100);
      const step = Math.min(maximum - minimum, Math.max(0.01, numberValue(item, 'step') ?? 1));
      const normalizedValue = Math.max(0, Math.min(1, (numberValue(item, 'value') ?? 50) / 100));
      const value = minimum + (maximum - minimum) * normalizedValue;
      return linkM3eNode({ id, kind: 'slider', label: label || '値', binding: `value_${sourceId}`, value, minimum, maximum, step, minHeight: 44 }, item, context, '値');
    }
    case 'text': {
      const fontSize = Math.max(11, numberValue(item, 'size') ?? 17);
      return linkM3eNode({ id, kind: 'text', text: label || 'テキスト', fontSize, weight: booleanValue(item, 'bold') ? 'bold' : 'regular', textStyle: textStyleForSize(fontSize) }, item, context, 'テキスト');
    }
    case 'image': {
      const src = stringValue(item, 'src');
      const node = imageNode(id, imageSource === 'symbol' ? icon : src, imageSource, label || '画像');
      return linkM3eNode(node, item, context, '画像');
    }
    case 'camera':
      return linkM3eNode({ id, kind: 'camera', label: label || 'カメラ', minHeight: 44 }, item, context, 'カメラ', ['カメラ入力は標準ButtonからAVFoundationの実装へ接続してください。']);
    case 'map':
      return linkM3eNode({ id, kind: 'map', label: label || '地図' }, item, context, '地図', ['M3Eの地図をMapKitのMapへ変換しました。位置情報や注釈は実装側で追加してください。']);
    case 'divider':
      return linkM3eNode({ id, kind: 'divider' }, item, context, '区切り線');
    case 'loadingIndicator':
      return linkM3eNode({ id, kind: 'progress', label: label || '読み込み中', value: 0.5, style: 'circular', indeterminate: true }, item, context, '読み込み中', ['M3Eの不確定ローディング表示です。標準SwiftUIでは円形ProgressViewへ変換しました。']);
    case 'linearProgress':
    case 'circularProgress': {
      const value = numberValue(item, 'value');
      const style = item.kind === 'circularProgress' ? 'circular' : 'linear';
      const trackThickness = numberValue(item, 'trackThickness');
      const extras = [
        ...(value === undefined ? ['M3Eの不確定プログレス表示です。'] : []),
        ...(booleanValue(item, 'wavy') ? ['M3Eの波形プログレス指定を保持しています。SwiftUI生成ではカスタムShapeへ変換します。'] : []),
        ...(trackThickness !== undefined && Number.isInteger(trackThickness) && trackThickness >= 2 && trackThickness <= 16
          ? [`M3Eのトラック太さ ${trackThickness}pt を保持しています。SwiftUI生成へ引き継ぎます。`]
          : []),
      ];
      return linkM3eNode({
        id,
        kind: 'progress',
        label: label || '進捗',
        style,
        value: value === undefined ? 0.5 : Math.max(0, Math.min(1, value > 1 ? value / 100 : value)),
        ...(value === undefined ? { indeterminate: true } : {}),
        ...(booleanValue(item, 'wavy') ? { wavy: true } : {}),
        ...(trackThickness !== undefined && Number.isInteger(trackThickness) && trackThickness >= 2 && trackThickness <= 16 ? { trackThickness } : {}),
      }, item, context, '進捗', extras);
    }
    case 'badge':
      return linkM3eNode({ id, kind: 'text', text: label, fontSize: 13, weight: 'semibold', textStyle: 'caption', m3eKind: 'badge' }, item, context, 'バッジ');
    case 'box':
      return linkM3eNode({
        id,
        kind: 'groupbox',
        title: label || 'ボックス',
        children: [],
        ...(backgroundStyle(item) ? { background: backgroundStyle(item) } : {}),
        ...(booleanValue(item, 'checked') ? { isBottomSheet: true } : {}),
      }, item, context, 'ボックス', booleanValue(item, 'checked') ? ['M3Eのボックスをボトムシートとして読み込みました。SwiftUIではsheetとpresentationDetentsへ変換します。'] : []);
    case 'card': {
      const imagePosition: CardImagePosition = isOneOf(stringValue(item, 'imagePos'), ['top', 'leading', 'trailing', 'background']) ? stringValue(item, 'imagePos') as CardImagePosition : 'top';
      const contentAlignment: CardContentAlignment = isOneOf(stringValue(item, 'contentAlign'), ['start', 'center', 'end']) ? stringValue(item, 'contentAlign') as CardContentAlignment : 'start';
      const noImage = booleanValue(item, 'noImage') === true;
      const imageSize = numberValue(item, 'imageSize');
      const cardImageSource = stringValue(item, 'src');
      const cardImageSourceKind = imageSourceFor(cardImageSource);
      const hasExternalImage = cardImageSourceKind !== 'symbol';
      const cardImage = noImage ? undefined : imageNode(
        stableId('m3e-card-icon', sourceId, context.usedIds),
        hasExternalImage ? cardImageSource : icon ?? 'photo',
        cardImageSourceKind,
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
        ...(cardImageSource && cardImageSourceKind === 'asset' ? ['M3Eカードのローカル画像データはSwiftUIのAssetへ移してから差し替えてください。'] : []),
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
    case 'dialog': {
      const actions = m3eDialogActions(item, context);
      const directAction = actions.length === 0 ? resolvedM3eAlertAction(item.action, context) : undefined;
      const semanticActions = actions.length > 0
        ? actions
        : directAction
          ? [{ label: '続ける', role: 'normal' as const, ...directAction }]
          : undefined;
      const primary = semanticActions?.[0];
      const secondary = semanticActions?.[1];
      return appendNotes({
        id,
        kind: 'alert',
        label: '確認を表示',
        title: label || '確認',
        message: stringValue(item, 'supporting') ?? '',
        primaryButton: primary?.label ?? '続ける',
        primaryRole: primary?.role ?? 'normal',
        ...(secondary ? { secondaryButton: secondary.label, secondaryRole: secondary.role } : {}),
        ...(semanticActions ? { actions: semanticActions } : {}),
        minHeight: 44,
      }, item, [
        ...(semanticActions && semanticActions.length > 2 ? [`M3Eダイアログの${semanticActions.length}個の操作をAlertの意味構造へ保持しました。`] : []),
        ...(semanticActions?.some((action) => action.destinationScreenId || action.navigationAction) ? ['M3Eダイアログの遷移先をAlert actionへ保持しました。'] : []),
      ]);
    }
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
        const actionNode: Extract<CanvasNode, { kind: 'button' }> = {
          id: stableId('m3e-snackbar-action', sourceId, context.usedIds),
          kind: 'button',
          label: actionLabel,
          role: 'normal',
          buttonStyle: 'plain',
          minHeight: 44,
        };
        setButtonAction(actionNode, item, context);
        children.push(actionNode);
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
    ...(rawIconOf(item, suffix === 'icon' ? 'icon' : 'icon2') === undefined ? {} : { m3eIcon: rawIconOf(item, suffix === 'icon' ? 'icon' : 'icon2') }),
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
      ...(rawIconOf(tab) === undefined ? {} : { m3eIcon: rawIconOf(tab) }),
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
  let m3eTopAppBar: M3eItemMetadata | undefined;
  let m3eBottomNav: M3eItemMetadata | undefined;

  for (const group of groupsForScreen(groups, frame, frames)) {
    const groupNodes: CanvasNode[] = [];
    const layoutNote = groupLayoutNote(group);
    for (const item of group.items) {
      if (item.kind === 'topAppBar') {
        navigationTitle = labelOf(item, frame.name);
        m3eTopAppBar = readM3eMetadata(item);
        const leading = toolbarItem(item, iconOf(item), 'topBarLeading', 'icon', context);
        const trailing = toolbarItem(item, iconOf(item, 'icon2'), 'topBarTrailing', 'icon2', context);
        if (leading) toolbarItems.push(leading);
        if (trailing) toolbarItems.push(trailing);
        continue;
      }
      if (item.kind === 'bottomNav') {
        m3eBottomNav = readM3eMetadata(item);
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
      if (node) {
        if (layoutNote) node.notes = [node.notes, layoutNote].filter(Boolean).join('\n');
        bodyNodes.push(node);
      }
    } else if (groupNodes.length > 1) {
      bodyNodes.push({
        id: stableId('m3e-group', group.id, context.usedIds),
        kind: group.axis === 'x' ? 'hstack' : 'vstack',
        spacing: group.axis === 'x' ? 8 : 12,
        alignment: group.axis === 'x' ? 'center' : 'leading',
        ...(layoutNote ? { notes: layoutNote } : {}),
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
    ...(m3eTopAppBar === undefined ? {} : { m3eTopAppBar }),
    ...(m3eBottomNav === undefined ? {} : { m3eBottomNav }),
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
  const preservedFields = new Set<string>();
  const approximatedFields = new Set<string>();
  const lostFields = new Set<string>();
  let invalidGroupCount = 0;
  let orphanedGroupCount = 0;
  let discardedItemCount = 0;
  let unresolvedDestinationCount = 0;
  let unresolvedActionCount = 0;
  const unresolvedPaths = new Set<string>();
  let flattenedLayoutCount = 0;

  for (const [groupIndex, rawGroup] of (value.groups as unknown[]).entries()) {
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
    for (const field of ['free', 'locked', 'pos']) {
      if (Object.prototype.hasOwnProperty.call(rawGroup, field)) flattenedLayoutCount += 1;
    }
    for (const [itemIndex, rawItem] of rawGroup.items.entries()) {
      if (!isRecord(rawItem)) {
        discardedItemCount += 1;
        continue;
      }
      for (const field of ['locked', 'pos']) {
        if (Object.prototype.hasOwnProperty.call(rawItem, field)) flattenedLayoutCount += 1;
      }
      const kind = stringValue(rawItem, 'kind');
      if (!kind || !supportedM3eKinds.has(kind)) unsupportedKinds.add(kind || 'unknown');
      if (kind && approximatedM3eKinds.has(kind)) approximatedKinds.add(kind);
      const fieldSummary = inspectM3eItemFields(rawItem);
      fieldSummary.preserved.forEach((field) => preservedFields.add(field));
      fieldSummary.approximated.forEach((field) => approximatedFields.add(field));
      fieldSummary.lost.forEach((field) => lostFields.add(field));
      const itemPath = `groups[${groupIndex}].items[${itemIndex}]`;
      const actionTargets = [
        { path: `${itemPath}.action`, action: recordValue(rawItem, 'action') },
        ...Object.entries(recordValue(rawItem, 'actions') ?? {}).map(([slot, value]) => ({
          path: `${itemPath}.actions.${slot}`,
          action: isRecord(value) ? value : undefined,
        })),
      ];
      for (const { path, action } of actionTargets) {
        if (!action) continue;
        const target = stringValue(action, 'to');
        if (target && target !== 'back' && !frameIds.has(target)) {
          unresolvedDestinationCount += 1;
          unresolvedActionCount += 1;
          unresolvedPaths.add(`${path}.to`);
        }
      }
    }
  }

  for (const [frameIndex, rawFrame] of rawFrames.entries()) {
    const frame = readFrame(rawFrame);
    if (!frame) continue;
    for (const [direction, destination] of Object.entries(frame.swipe ?? {})) {
      if (destination && !frameIds.has(destination)) {
        unresolvedDestinationCount += 1;
        unresolvedActionCount += 1;
        unresolvedPaths.add(`frames[${frameIndex}].swipe.${direction}`);
      }
    }
  }

  return {
    invalidFrameCount: rawFrames.length - frames.length,
    invalidGroupCount,
    orphanedGroupCount,
    discardedItemCount,
    unresolvedDestinationCount,
    unresolvedActionCount,
    unresolvedPaths: [...unresolvedPaths].sort(),
    flattenedLayoutCount,
    unsupportedKinds: [...unsupportedKinds].sort(),
    approximatedKinds: [...approximatedKinds].sort(),
    preservedFields: [...preservedFields].sort(),
    approximatedFields: [...approximatedFields].sort(),
    lostFields: [...lostFields].sort(),
    invalidFields: collectM3eInvalidFields(value),
    duplicateIdFields: collectM3eDuplicateIdFields(value),
    unknownFields: collectM3eUnknownFields(value),
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

function exportNodeFill(node: CanvasNode): ScreenBackground | undefined {
  const original = node.m3eMetadata?.fill;
  if (original) {
    const importedBackground = backgroundStyle({ fill: original });
    if (node.background === importedBackground) return original;
  }
  return exportFill(node.background);
}

function exportNote(node: CanvasNode, extra?: string): string | undefined {
  const current = node.notes?.trim() ?? '';
  const sourceNote = node.m3eMetadata?.note?.trim();
  const generatedSupporting = node.m3eMetadata?.supporting?.trim() ? `補足: ${node.m3eMetadata.supporting.trim()}` : '';
  const currentNotes = sourceNote && current.includes(sourceNote)
    ? current.split('\n').filter((note) => note !== sourceNote && note !== generatedSupporting)
    : [current];
  const notes = [sourceNote ?? '', ...currentNotes, extra?.trim() ?? ''].filter(Boolean);
  return notes.length > 0 ? notes.join('\n') : undefined;
}

function exportM3eMetadata(metadata: M3eItemMetadata | undefined): Partial<M3eExportItem> {
  if (!metadata) return {};
  return {
    ...(metadata.supporting === undefined ? {} : { supporting: metadata.supporting }),
    ...(metadata.icon === undefined ? {} : { icon: metadata.icon }),
    ...(metadata.icon2 === undefined ? {} : { icon2: metadata.icon2 }),
    ...(metadata.size === undefined ? {} : { size: metadata.size }),
    ...(metadata.size2 === undefined ? {} : { size2: metadata.size2 }),
    ...(metadata.minimum === undefined ? {} : { minimum: metadata.minimum }),
    ...(metadata.maximum === undefined ? {} : { maximum: metadata.maximum }),
    ...(metadata.step === undefined ? {} : { step: metadata.step }),
    ...(metadata.value === undefined ? {} : { value: metadata.value }),
    ...(metadata.bold === undefined ? {} : { bold: metadata.bold }),
    ...(metadata.note === undefined ? {} : { note: metadata.note }),
    ...(metadata.radiusTop === undefined ? {} : { radiusTop: metadata.radiusTop }),
    ...(metadata.radiusBottom === undefined ? {} : { radiusBottom: metadata.radiusBottom }),
    ...(metadata.corners === undefined ? {} : { corners: metadata.corners }),
    ...(metadata.tabs === undefined ? {} : { tabs: metadata.tabs }),
    ...(metadata.selected === undefined ? {} : { selected: metadata.selected }),
    ...(metadata.action === undefined ? {} : { action: metadata.action }),
    ...(metadata.actions === undefined ? {} : { actions: metadata.actions }),
    ...(metadata.checked === undefined ? {} : { checked: metadata.checked }),
    ...(metadata.switch === undefined ? {} : { switch: metadata.switch }),
    ...(metadata.noCheck === undefined ? {} : { noCheck: metadata.noCheck }),
    ...(metadata.noImage === undefined ? {} : { noImage: metadata.noImage }),
    ...(metadata.imagePos === undefined ? {} : { imagePos: metadata.imagePos }),
    ...(metadata.imageSize === undefined ? {} : { imageSize: metadata.imageSize }),
    ...(metadata.contentAlign === undefined ? {} : { contentAlign: metadata.contentAlign }),
    ...(metadata.textColor === undefined ? {} : { textColor: metadata.textColor }),
    ...(metadata.fill === undefined ? {} : { fill: metadata.fill }),
    ...(metadata.iconFill === undefined ? {} : { iconFill: metadata.iconFill }),
    ...(metadata.src === undefined ? {} : { src: metadata.src }),
    ...(metadata.wavy === undefined ? {} : { wavy: metadata.wavy }),
    ...(metadata.trackThickness === undefined ? {} : { trackThickness: metadata.trackThickness }),
    ...(metadata.contained === undefined ? {} : { contained: metadata.contained }),
    ...(metadata.railExpanded === undefined ? {} : { railExpanded: metadata.railExpanded }),
    ...(metadata.railModal === undefined ? {} : { railModal: metadata.railModal }),
    ...(metadata.railExpansionSide === undefined ? {} : { railExpansionSide: metadata.railExpansionSide }),
    ...(metadata.toggle === undefined ? {} : { toggle: metadata.toggle }),
    ...(metadata.noteHistory === undefined ? {} : { noteHistory: metadata.noteHistory }),
  };
}

function withM3eMetadata(item: M3eExportItem, metadata: M3eItemMetadata | undefined): M3eExportItem {
  const exportedMetadata = exportM3eMetadata(metadata);
  return {
    ...exportedMetadata,
    ...item,
    ...(exportedMetadata.icon === undefined ? {} : { icon: preferOriginalIcon(exportedMetadata.icon, item.icon) }),
    ...(exportedMetadata.icon2 === undefined ? {} : { icon2: preferOriginalIcon(exportedMetadata.icon2, item.icon2) }),
  };
}

function exportAction(node: CanvasNode, frameIds: Map<string, string>): M3eExportAction | undefined {
  if (node.kind !== 'button' && node.kind !== 'navigation-link' && node.navigationAction !== 'back') return undefined;
  const target = node.navigationAction === 'back'
    ? 'back'
    : (node.kind === 'button' || node.kind === 'navigation-link') && node.destinationScreenId && frameIds.has(node.destinationScreenId)
      ? frameIds.get(node.destinationScreenId)
      : undefined;
  if (!target) return undefined;
  return {
    to: target,
    transition: node.navigationTransition ?? (target === 'back' ? 'slideLeft' : 'slide'),
  };
}

function exportAlertAction(action: AlertAction, frameIds: Map<string, string>): M3eExportAction | undefined {
  const target = action.navigationAction === 'back'
    ? 'back'
    : action.destinationScreenId && frameIds.has(action.destinationScreenId)
      ? frameIds.get(action.destinationScreenId)
      : undefined;
  return target ? { to: target, transition: action.navigationTransition ?? (target === 'back' ? 'slideLeft' : 'slide') } : undefined;
}

function exportM3eMenuActions(node: Extract<CanvasNode, { kind: 'button' }>, frameIds: Map<string, string>): Record<string, M3eExportAction> | undefined {
  const resolved = Object.fromEntries(Object.entries(node.m3eMenuActions ?? {}).flatMap(([slot, action]) => {
    const target = action.navigationAction === 'back'
      ? 'back'
      : action.destinationScreenId ? frameIds.get(action.destinationScreenId) : undefined;
    return target ? [[slot, { to: target, transition: action.navigationTransition ?? (target === 'back' ? 'slideLeft' : 'slide') }]] : [];
  }));
  const actions = { ...(node.m3eMetadata?.actions ?? {}), ...resolved };
  return Object.keys(actions).length > 0 ? actions : undefined;
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

function exportToolbarIcon(item: ToolbarItem | undefined): string | null {
  if (!item) return null;
  return preferOriginalIcon(item.m3eIcon, item.systemName) ?? null;
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
  const nodeFill = exportNodeFill(node);
  const base = (kind: string, label: string, icon: string | null = null, extra: Partial<M3eExportItem> = {}): M3eExportItem => {
    const metadata = exportM3eMetadata(node.m3eMetadata);
    const extraNote = typeof extra.note === 'string' ? extra.note : '';
    const note = exportNote(node, [inheritedNote, extraNote].filter(Boolean).join('\n'));
    return {
      id: node.id,
      kind,
      label,
      icon,
      variant: exportVariant(node),
      ...metadata,
      ...(nodeFill ? { fill: nodeFill } : {}),
      ...extra,
      ...(metadata.icon === undefined ? {} : { icon: preferOriginalIcon(metadata.icon, extra.icon === undefined ? icon : extra.icon) }),
      ...(metadata.icon2 === undefined ? {} : { icon2: preferOriginalIcon(metadata.icon2, extra.icon2) }),
      ...(note ? { note } : {}),
    };
  };

  switch (node.kind) {
    case 'text':
      return base(node.m3eKind === 'badge' ? 'badge' : 'text', node.text, null, {
        size: node.fontSize,
        ...(node.m3eMetadata?.bold === undefined
          ? (node.weight === 'bold' || node.weight === 'semibold' ? { bold: true } : {})
          : { bold: node.weight === 'bold' || node.weight === 'semibold' }),
      });
    case 'button': {
      const action = exportAction(node, frameIds);
      if (node.m3eKind && !m3eButtonKinds.has(node.m3eKind)) {
        return base(node.m3eKind, node.label, node.m3eKind === 'searchBar' ? 'magnifyingglass' : node.systemName || null, action ? { action } : {});
      }
      const buttonKind = node.m3eKind === 'button' || node.m3eKind === 'iconButton' || node.m3eKind === 'fab' || node.m3eKind === 'extendedFab' || node.m3eKind === 'chip' || node.m3eKind === 'splitButton'
        ? node.m3eKind
        : node.label.trim() ? 'button' : node.systemName ? 'iconButton' : 'button';
      const menuActions = node.m3eKind === 'splitButton' ? exportM3eMenuActions(node, frameIds) : undefined;
      return base(buttonKind, node.label, node.systemName ?? null, {
        ...(node.m3eIcon2 === undefined ? {} : { icon2: node.m3eIcon2 }),
        ...(node.toggle ? { checked: node.toggle.isOn } : {}),
        ...(action ? { action } : {}),
        ...(menuActions ? { actions: menuActions } : {}),
        ...(node.toggle ? {
          toggle: {
            ...(node.toggle.onSystemName === undefined ? {} : { icon: node.toggle.onSystemName }),
            ...(node.toggle.onButtonStyle === undefined ? {} : { variant: exportVariant({ ...node, buttonStyle: node.toggle.onButtonStyle }) }),
            ...(node.toggle.onLabel ? { label: node.toggle.onLabel } : {}),
          },
        } : {}),
      });
    }
    case 'navigation-link': {
      const linkedBox = node.children?.find((child): child is ContainerNode => child.kind === 'groupbox');
      if (node.m3eKind === 'box' && linkedBox) {
        const action = exportAction(node, frameIds);
        return base('box', linkedBox.title || node.label, null, action ? { action } : {});
      }
      const linkedSearch = node.children?.find((child): child is Extract<CanvasNode, { kind: 'searchfield' }> => child.kind === 'searchfield');
      if (node.m3eKind === 'searchBar' && linkedSearch) {
        const action = exportAction(node, frameIds);
        return base('searchBar', linkedSearch.prompt || linkedSearch.label, 'magnifyingglass', action ? { action } : {});
      }
      const linkedTextField = node.children?.find((child): child is Extract<CanvasNode, { kind: 'textfield' }> => child.kind === 'textfield');
      if (node.m3eKind === 'textField' && linkedTextField) {
        const action = exportAction(node, frameIds);
        return base('textField', linkedTextField.label, null, action ? { action } : {});
      }
      const linkedPicker = node.children?.find((child): child is Extract<CanvasNode, { kind: 'picker' }> => child.kind === 'picker');
      if (node.m3eKind === 'select' && linkedPicker) {
        const action = exportAction(node, frameIds);
        const selected = linkedPicker.initialOption !== undefined ? linkedPicker.options.indexOf(linkedPicker.initialOption) : -1;
        return base('select', linkedPicker.label, null, {
          tabs: linkedPicker.options.map((label, index) => ({ label, icon: node.m3eMetadata?.tabs?.[index]?.icon ?? null })),
          ...(selected < 0 ? {} : { selected }),
          ...(action ? { action } : {}),
        });
      }
      const linkedToggle = node.children?.find((child): child is Extract<CanvasNode, { kind: 'toggle' }> => child.kind === 'toggle');
      if ((node.m3eKind === 'switch' || node.m3eKind === 'checkbox' || node.m3eKind === 'radio') && linkedToggle) {
        const action = exportAction(node, frameIds);
        return base(node.m3eKind, linkedToggle.label, null, { checked: linkedToggle.isOn ?? false, ...(action ? { action } : {}) });
      }
      const linkedSlider = node.children?.find((child): child is Extract<CanvasNode, { kind: 'slider' }> => child.kind === 'slider');
      if (node.m3eKind === 'slider' && linkedSlider) {
        const action = exportAction(node, frameIds);
        return base('slider', linkedSlider.label, null, {
          value: linkedSlider.maximum > linkedSlider.minimum ? ((linkedSlider.value - linkedSlider.minimum) / (linkedSlider.maximum - linkedSlider.minimum)) * 100 : 0,
          minimum: linkedSlider.minimum,
          maximum: linkedSlider.maximum,
          step: linkedSlider.step,
          ...(action ? { action } : {}),
        });
      }
      const linkedDivider = node.children?.find((child): child is Extract<CanvasNode, { kind: 'divider' }> => child.kind === 'divider');
      if (node.m3eKind === 'divider' && linkedDivider) {
        const action = exportAction(node, frameIds);
        return base('divider', '区切り線', null, action ? { action } : {});
      }
      const linkedCamera = node.children?.find((child): child is Extract<CanvasNode, { kind: 'camera' }> => child.kind === 'camera');
      if (node.m3eKind === 'camera' && linkedCamera) {
        const action = exportAction(node, frameIds);
        return base('camera', linkedCamera.label, null, action ? { action } : {});
      }
      const linkedMap = node.children?.find((child): child is Extract<CanvasNode, { kind: 'map' }> => child.kind === 'map');
      if (node.m3eKind === 'map' && linkedMap) {
        const action = exportAction(node, frameIds);
        return base('map', linkedMap.label, 'map', action ? { action } : {});
      }
      const linkedProgress = node.children?.find((child): child is Extract<CanvasNode, { kind: 'progress' }> => child.kind === 'progress');
      if (linkedProgress && (node.m3eKind === 'loadingIndicator' || node.m3eKind === 'linearProgress' || node.m3eKind === 'circularProgress')) {
        const action = exportAction(node, frameIds);
        const kind = node.m3eKind;
        return base(kind, linkedProgress.label, null, {
          ...(linkedProgress.indeterminate ? {} : { value: Math.round(linkedProgress.value * 100) }),
          ...(linkedProgress.wavy ? { wavy: true } : {}),
          ...(linkedProgress.trackThickness === undefined ? {} : { trackThickness: linkedProgress.trackThickness }),
          ...(action ? { action } : {}),
        });
      }
      const linkedText = node.children?.find((child): child is Extract<CanvasNode, { kind: 'text' }> => child.kind === 'text');
      if ((node.m3eKind === 'text' || node.m3eKind === 'badge') && linkedText) {
        const action = exportAction(node, frameIds);
        return base(node.m3eKind === 'badge' ? 'badge' : 'text', linkedText.text, null, {
          size: linkedText.fontSize,
          ...(linkedText.weight === 'bold' || linkedText.weight === 'semibold' ? { bold: true } : {}),
          ...(action ? { action } : {}),
        });
      }
      const linkedImage = node.children?.find((child): child is Extract<CanvasNode, { kind: 'image' }> => child.kind === 'image');
      if (node.m3eKind === 'image' && linkedImage) {
        const external = linkedImage.source !== 'symbol' && linkedImage.source !== undefined && linkedImage.systemName.trim() !== '';
        const action = exportAction(node, frameIds);
        return base('image', linkedImage.accessibilityLabel || node.label, external ? null : linkedImage.systemName || null, {
          ...(external ? { src: linkedImage.systemName } : {}),
          ...(action ? { action } : {}),
        });
      }
      const cardNode = node.children?.find((child): child is ContainerNode => child.kind === 'groupbox' && child.m3eKind === 'card');
      if (node.m3eKind === 'card' && cardNode) {
        const presentation = exportCardPresentation(cardNode);
        const action = exportAction(node, frameIds);
        return base('card', node.label || cardNode.title || 'カード', presentation.icon, {
          ...(cardNode.cardNoImage ? { noImage: true } : {}),
          ...(cardNode.cardImagePosition ? { imagePos: cardNode.cardImagePosition } : {}),
          ...(cardNode.cardImageSize === undefined ? {} : { imageSize: cardNode.cardImageSize }),
          ...(cardNode.cardContentAlignment ? { contentAlign: cardNode.cardContentAlignment } : {}),
          ...(presentation.supporting ? { supporting: presentation.supporting } : {}),
          ...(presentation.src ? { src: presentation.src } : {}),
          ...(action ? { action } : {}),
        });
      }
      const presentation = exportListItemPresentation(node);
      const action = exportAction(node, frameIds);
      return base('listItem', node.label, presentation.icon, {
        ...(presentation.icon2 ? { icon2: presentation.icon2 } : {}),
        ...(presentation.supporting ? { supporting: presentation.supporting } : {}),
        ...(action ? { action } : {}),
      });
    }
    case 'toggle':
      return base(node.m3eKind === 'switch' || node.m3eKind === 'checkbox' || node.m3eKind === 'radio' ? node.m3eKind : 'switch', node.label, null, { checked: node.isOn ?? false });
    case 'textfield':
      return base('textField', node.label, null);
    case 'searchfield':
      return base('searchBar', node.prompt || node.label, 'magnifyingglass');
    case 'securefield':
      return base('textField', node.label, null, { note: 'SwiftUIではSecureFieldとして再構成します。' });
    case 'texteditor':
      return base('textField', node.label, null, { note: 'SwiftUIではTextEditorとして再構成します。' });
    case 'picker': {
      const selected = node.initialOption !== undefined ? Math.max(0, node.options.indexOf(node.initialOption)) : undefined;
      return base('select', node.label, null, {
        tabs: node.options.map((label, index) => ({ label, icon: node.m3eMetadata?.tabs?.[index]?.icon ?? null })),
        ...(selected === undefined || selected < 0 ? {} : { selected }),
      });
    }
    case 'colorpicker':
      return base('textField', node.label, null, { note: `SwiftUI ColorPickerの色バインディング: ${node.binding}` });
    case 'slider':
      return base('slider', node.label, null, {
        value: node.maximum > node.minimum ? ((node.value - node.minimum) / (node.maximum - node.minimum)) * 100 : 0,
        minimum: node.minimum,
        maximum: node.maximum,
        step: node.step,
        note: `値の範囲: ${node.minimum}〜${node.maximum} / 刻み: ${node.step}`,
      });
    case 'stepper':
      return base('button', node.label, null, {
        value: node.value,
        minimum: node.minimum,
        maximum: node.maximum,
        step: node.step,
        note: `SwiftUI Stepperとして再構成します。初期値 ${node.value} / 範囲 ${node.minimum}〜${node.maximum} / 刻み ${node.step}`,
      });
    case 'menu':
      return base('button', node.label, null, {
        tabs: node.options.map((option) => ({ label: option, icon: null })),
        note: `メニュー項目: ${node.options.join('、')}`,
      });
    case 'progress':
      return base(node.m3eKind === 'loadingIndicator' || node.m3eKind === 'linearProgress' || node.m3eKind === 'circularProgress'
        ? node.m3eKind
        : node.indeterminate && node.style === 'circular' ? 'loadingIndicator' : node.style === 'circular' ? 'circularProgress' : 'linearProgress', node.label, null, {
        ...(node.indeterminate ? {} : { value: Math.round(node.value * 100) }),
        ...(node.wavy ? { wavy: true } : {}),
        ...(node.trackThickness === undefined ? {} : { trackThickness: node.trackThickness }),
      });
    case 'gauge':
      return base('linearProgress', node.label, null, {
        value: node.maximum > node.minimum ? ((node.value - node.minimum) / (node.maximum - node.minimum)) * 100 : 0,
        minimum: node.minimum,
        maximum: node.maximum,
        note: `SwiftUI Gaugeとして再構成します。範囲 ${node.minimum}〜${node.maximum}`,
      });
    case 'content-unavailable':
      return base('box', node.title, node.systemName || null, { supporting: node.description });
    case 'label':
      return base('text', node.title, node.systemName || null);
    case 'link':
      return base('button', node.label, null, { note: `外部リンク: ${node.url}` });
    case 'datepicker':
      return base('textField', node.label, 'calendar_month', { note: 'SwiftUIではDatePickerとして再構成します。' });
    case 'image': {
      const external = node.source !== 'symbol' && node.source !== undefined && node.systemName.trim() !== '';
      return base('image', node.accessibilityLabel || '画像', external ? null : node.systemName || null, external ? { src: node.systemName } : {});
    }
    case 'camera':
      return base('camera', node.label, null);
    case 'map':
      return base('map', node.label, 'map');
    case 'divider':
      return base('divider', '区切り線');
    case 'spacer':
      return base('box', 'スペーサー', null, { note: 'SwiftUI Spacerとして再構成します。' });
    case 'alert': {
      const actions = node.actions?.filter((action) => action.label.trim()) ?? [];
      const exportedActions = Object.fromEntries(actions.flatMap((action, index) => {
        const exported = exportAlertAction(action, frameIds);
        return exported ? [[`tab:${index}`, exported]] : [];
      }));
      const tabs = actions.length > 0
        ? actions.map((action, index) => ({ label: action.label, icon: node.m3eMetadata?.tabs?.[index]?.icon ?? null }))
        : undefined;
      const exportedPrimaryAction = node.m3eMetadata?.action && actions[0]
        ? exportAlertAction(actions[0], frameIds)
        : undefined;
      return base('dialog', node.title || node.label, null, {
        supporting: node.message,
        ...(tabs ? { tabs } : {}),
        ...(Object.keys(exportedActions).length > 0 ? { actions: exportedActions } : {}),
        ...(exportedPrimaryAction ? { action: exportedPrimaryAction } : {}),
        note: `主ボタン: ${node.primaryButton}${node.secondaryButton ? ` / 副ボタン: ${node.secondaryButton}` : ''}`,
      });
    }
    case 'confirmation-dialog':
      return base('dialog', node.title || node.label, null, { supporting: node.message, note: `選択肢: ${node.options.join('、')}${node.cancelButton ? ` / キャンセル: ${node.cancelButton}` : ''}` });
    default:
      return null;
  }
}

function exportTabItem(node: CanvasNode): M3eExportTab {
  const label = node.tabTitle
    || (node.kind === 'text' ? node.text : node.kind === 'button' || node.kind === 'navigation-link' ? node.label : '')
    || 'タブ';
  const semanticIcon = node.tabSystemName
    || (node.kind === 'button' ? node.systemName : null)
    || (node.kind === 'image' ? node.systemName : null);
  const icon = preferOriginalIcon(node.m3eMetadata?.icon, semanticIcon);
  return { label, icon: icon || null };
}

function exportTabsNode(node: ContainerNode, frameIds: Map<string, string>, inheritedNote: string): M3eExportItem {
  const tabs = node.children.map((child) => exportTabItem(child));
  const actions = Object.fromEntries(node.children.flatMap((child, index) => {
    const action = exportAction(child, frameIds);
    return action ? [[`tab:${index}`, action]] : [];
  }));
  return withM3eMetadata({
    id: node.id,
    kind: node.m3eKind === 'topAppBar' || node.m3eKind === 'bottomNav' || node.m3eKind === 'tabs' ? node.m3eKind : 'tabs',
    label: node.title || 'タブ',
    icon: null,
    variant: exportVariant(node),
    tabs,
    ...(node.selectedIndex === undefined ? {} : { selected: node.selectedIndex }),
    ...(Object.keys(actions).length > 0 ? { actions } : {}),
    ...(exportNote(node, inheritedNote) ? { note: exportNote(node, inheritedNote) } : {}),
  }, node.m3eMetadata);
}

function exportNavigationSplitNode(node: ContainerNode, frameIds: Map<string, string>, inheritedNote: string): M3eExportItem {
  const sidebar = node.children[0];
  const entries = sidebar && Array.isArray(sidebar.children) ? sidebar.children : [];
  const tabs = entries.map((child) => exportTabItem(child));
  const actions = Object.fromEntries(entries.flatMap((child, index) => {
    const action = exportAction(child, frameIds);
    return action ? [[`tab:${index}`, action]] : [];
  }));
  return withM3eMetadata({
    id: node.id,
    kind: 'navRail',
    label: 'ナビゲーションレール',
    icon: null,
    variant: exportVariant(node),
    tabs,
    ...(node.selectedIndex === undefined ? {} : { selected: node.selectedIndex }),
    ...(node.railExpanded === undefined ? {} : { railExpanded: node.railExpanded }),
    ...(node.railModal === undefined ? {} : { railModal: node.railModal }),
    ...(Object.keys(actions).length > 0 ? { actions } : {}),
    ...(exportNote(node, inheritedNote) ? { note: exportNote(node, inheritedNote) } : {}),
  }, node.m3eMetadata);
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
  const external = image?.source !== 'symbol' && image?.source !== undefined && Boolean(image.systemName.trim());
  return {
    icon: external ? null : image?.systemName ?? null,
    ...(external && image ? { src: image.systemName } : {}),
    ...(supporting ? { supporting } : {}),
  };
}

function exportListItemNode(node: ContainerNode, frameIds: Map<string, string>, inheritedNote: string): M3eExportItem {
  const descendants: CanvasNode[] = [];
  const visit = (current: CanvasNode): void => {
    descendants.push(current);
    if (Array.isArray(current.children)) current.children.forEach(visit);
  };
  node.children.forEach(visit);
  const images = descendants.filter((child): child is Extract<CanvasNode, { kind: 'image' }> => child.kind === 'image');
  const texts = descendants.filter((child): child is Extract<CanvasNode, { kind: 'text' }> => child.kind === 'text' && child.m3eKind !== 'badge');
  const toggle = descendants.find((child): child is Extract<CanvasNode, { kind: 'toggle' }> => child.kind === 'toggle');
  const label = node.label?.trim() || texts[0]?.text.trim() || '項目';
  const supporting = texts.find((child) => child.text.trim() && child.text.trim() !== label)?.text.trim();
  const leading = images[0];
  const trailing = images[1];
  const action = exportAction(node, frameIds);
  return withM3eMetadata({
    id: node.id,
    kind: 'listItem',
    label,
    icon: leading?.source === 'remote' ? null : leading?.systemName ?? null,
    variant: exportVariant(node),
    ...(trailing?.source === 'remote' ? {} : trailing?.systemName ? { icon2: trailing.systemName } : {}),
    ...(supporting ? { supporting } : {}),
    ...(toggle ? { switch: true, checked: toggle.isOn ?? false } : {}),
    ...(action ? { action } : {}),
    ...(exportNote(node, inheritedNote) ? { note: exportNote(node, inheritedNote) } : {}),
  }, node.m3eMetadata);
}

function exportFabMenuNode(node: ContainerNode, frameIds: Map<string, string>, inheritedNote: string): M3eExportItem {
  const buttons = node.children.filter((child): child is Extract<CanvasNode, { kind: 'button' }> => child.kind === 'button');
  const actions = Object.fromEntries(buttons.flatMap((button, index) => {
    const action = exportAction(button, frameIds);
    return action ? [[`tab:${index}`, action]] : [];
  }));
  return withM3eMetadata({
    id: node.id,
    kind: 'fabMenu',
    label: node.label ?? 'FABメニュー',
    icon: node.m3eIcon ?? null,
    variant: exportVariant(node),
    tabs: buttons.map((button) => exportTabItem(button)),
    ...(Object.keys(actions).length > 0 ? { actions } : {}),
    ...(exportNote(node, inheritedNote) ? { note: exportNote(node, inheritedNote) } : {}),
  }, node.m3eMetadata);
}

function exportToolbarNode(node: ContainerNode, frameIds: Map<string, string>, inheritedNote: string): M3eExportItem | null {
  if (node.kind !== 'hstack' || node.children.length === 0 || node.children.some((child) => child.kind !== 'button')) return null;
  const buttons = node.children.filter((child): child is Extract<CanvasNode, { kind: 'button' }> => child.kind === 'button');
  if (buttons.some((button) => button.toggle)) return null;
  const actions = Object.fromEntries(buttons.flatMap((button, index) => {
    const action = exportAction(button, frameIds);
    return action ? [[`tab:${index}`, action]] : [];
  }));
  return withM3eMetadata({
    id: node.id,
    kind: 'toolbar',
    label: 'ツールバー',
    icon: null,
    variant: 'filled',
    tabs: buttons.map((button) => exportTabItem(button)),
    ...(Object.keys(actions).length > 0 ? { actions } : {}),
    ...(exportNote(node, inheritedNote) ? { note: exportNote(node, inheritedNote) } : {}),
  }, node.m3eMetadata);
}

function exportSnackbarNode(node: ContainerNode, frameIds: Map<string, string>, inheritedNote: string): M3eExportItem | null {
  if (node.kind !== 'hstack' || (node.m3eKind !== 'snackbar' && (node.background !== 'material' || node.cornerRadius !== 12)) || node.children.length < 1 || node.children.length > 2) return null;
  const message = node.children.find((child): child is Extract<CanvasNode, { kind: 'text' }> => child.kind === 'text');
  const action = node.children.find((child): child is Extract<CanvasNode, { kind: 'button' }> => child.kind === 'button');
  if (!message || node.children.some((child) => child !== message && child !== action)) return null;
  const exportedAction = action ? exportAction(action, frameIds) : undefined;
  return withM3eMetadata({
    id: node.id,
    kind: 'snackbar',
    label: message.text,
    icon: null,
    variant: exportVariant(node),
    ...(action ? { supporting: action.label } : {}),
    ...(exportedAction ? { action: exportedAction } : {}),
    ...(exportNote(node, inheritedNote) ? { note: exportNote(node, inheritedNote) } : {}),
  }, node.m3eMetadata);
}

function isExportContainer(node: CanvasNode): node is ContainerNode {
  return isContainerNode(node);
}

function exportContainerItems(node: ContainerNode, frameIds: Map<string, string>, inheritedNote = ''): M3eExportItem[] {
  if (node.m3eKind === 'fabMenu') return [exportFabMenuNode(node, frameIds, inheritedNote)];
  if (node.m3eKind === 'listItem') return [exportListItemNode(node, frameIds, inheritedNote)];
  if (node.kind === 'tabview') return [exportTabsNode(node, frameIds, inheritedNote)];
  if (node.kind === 'navigation-split-view') {
    const detail = node.children[1];
    const detailItems = detail && isExportContainer(detail) ? exportContainerItems(detail, frameIds, inheritedNote) : [];
    return [exportNavigationSplitNode(node, frameIds, inheritedNote), ...detailItems];
  }

  const snackbar = exportSnackbarNode(node, frameIds, inheritedNote);
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
  const isCard = node.kind === 'groupbox' && !isBottomSheet && node.m3eKind !== 'box';
  const card = isCard ? exportCardPresentation(node) : { icon: null };
  const containerItem = withM3eMetadata({
    id: `${node.id}-container`,
    kind: isCard ? 'card' : 'box',
    label: title,
    icon: card.icon,
    variant: node.background === 'accent' ? 'filled' : 'outlined',
    ...(exportNodeFill(node) ? { fill: exportNodeFill(node) } : {}),
    ...(isBottomSheet ? { checked: true } : {}),
    ...(isCard && node.cardNoImage ? { noImage: true } : {}),
    ...(isCard && node.cardImagePosition ? { imagePos: node.cardImagePosition } : {}),
    ...(isCard && node.cardImageSize !== undefined ? { imageSize: node.cardImageSize } : {}),
    ...(isCard && node.cardContentAlignment ? { contentAlign: node.cardContentAlignment } : {}),
    ...(isCard && card.supporting ? { supporting: card.supporting } : {}),
    ...(isCard && card.src ? { src: card.src } : {}),
    note: exportNote(node, node.kind === 'sheet' ? 'SwiftUI sheetとして再構成します。' : undefined),
  }, node.m3eMetadata);
  return node.m3eKind === 'card' ? [containerItem] : [containerItem, ...children];
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

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function exportMeaningfulSignatures(document: M3eExportDocument): string[] {
  const frameReferences = new Map(document.frames.map((frame, index) => [frame.id, `frame-${index}`]));
  const frameReference = (id: string): string => frameReferences.get(id) ?? id;
  const normalizeAction = (action: M3eExportAction): M3eExportAction => ({ ...action, to: frameReference(action.to) });
  const normalizeItem = (item: M3eExportItem): M3eExportItem => ({
    ...item,
    ...(item.action ? { action: normalizeAction(item.action) } : {}),
    ...(item.actions ? { actions: Object.fromEntries(Object.entries(item.actions).map(([slot, action]) => [slot, normalizeAction(action)])) } : {}),
  });
  const documentSignature = canonicalJson({
    title: document.title,
    paletteKey: document.paletteKey,
    theme: document.theme,
    platform: document.platform,
    frame: frameReference(document.frame),
  });
  const frameSignatures = document.frames.map((frame) => {
    const swipe = frame.swipe;
    const frameWithoutId = Object.fromEntries(Object.entries(frame).filter(([key]) => key !== 'id' && key !== 'swipe'));
    return `frame:${canonicalJson({
      ...frameWithoutId,
      ...(swipe ? { swipe: Object.fromEntries(Object.entries(swipe).map(([direction, destination]) => [direction, frameReference(destination)])) } : {}),
    })}`;
  });
  const itemSignatures = document.groups
    .flatMap((group) => group.items)
    .map((item) => `item:${canonicalJson(Object.fromEntries(
      Object.entries(normalizeItem(item)).filter(([key]) => key !== 'id' && key !== 'note' && key !== 'noteHistory'),
    ))}`);
  return [`document:${documentSignature}`, ...frameSignatures, ...itemSignatures].sort();
}

function exportTopBar(screen: CanvasScreen, frameIds: Map<string, string>): M3eExportItem | null {
  const leading = (screen.toolbarItems ?? []).find((item) => item.placement === 'topBarLeading');
  const trailing = (screen.toolbarItems ?? []).find((item) => item.placement === 'topBarTrailing');
  if (!leading && !trailing && !screen.navigationTitle) return null;
  const leadingIcon = exportToolbarIcon(leading);
  const trailingIcon = exportToolbarIcon(trailing);
  const actions = Object.fromEntries([
    leading ? ['icon', exportToolbarAction(leading, frameIds)] : [],
    trailing ? ['icon2', exportToolbarAction(trailing, frameIds)] : [],
  ].filter((entry): entry is [string, M3eExportAction] => entry[1] !== undefined));
  return withM3eMetadata({
    id: `${screen.id}-top-app-bar`,
    kind: 'topAppBar',
    label: screen.navigationTitle,
    icon: leadingIcon,
    variant: 'filled',
    ...(trailingIcon ? { icon2: trailingIcon } : {}),
    ...(Object.keys(actions).length > 0 ? { actions } : {}),
  }, screen.m3eTopAppBar);
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
  return withM3eMetadata({
    id: `${screen.id}-bottom-navigation`,
    kind: 'bottomNav',
    label: 'タブバー',
    icon: null,
    variant: 'filled',
    tabs: items.map((item) => ({ label: item.title, icon: exportToolbarIcon(item) })),
    ...(selected >= 0 ? { selected } : {}),
    ...(Object.keys(actions).length > 0 ? { actions } : {}),
  }, screen.m3eBottomNav);
}

function exportGroupsForScreen(screen: CanvasScreen, frameIds: Map<string, string>, size: { width: number; height: number }, originX: number): M3eExportGroup[] {
  const groups: M3eExportGroup[] = [];
  const topBar = exportTopBar(screen, frameIds);
  if (topBar) groups.push({ id: `${screen.id}-group-top-bar`, x: originX, y: 0, axis: 'x', items: [topBar] });

  let y = 80;
  for (const [index, node] of screen.root.children.entries()) {
    const items = isExportContainer(node)
      ? exportContainerItems(node, frameIds)
      : [exportItem(node, frameIds)].filter((item): item is M3eExportItem => item !== null);
    if (items.length === 0) continue;
    const axis = node.kind === 'hstack' || node.kind === 'lazyhstack' || node.kind === 'lazyhgrid' ? 'x' : 'y';
    groups.push({ id: `${screen.id}-group-${index}`, x: originX + 16, y, axis, items });
    y += Math.max(80, items.length * 72);
  }

  const bottomBar = exportBottomBar(screen, frameIds);
  if (bottomBar) groups.push({ id: `${screen.id}-group-bottom-bar`, x: originX, y: Math.max(0, size.height - 88), axis: 'x', items: [bottomBar] });
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
  let frameX = 0;
  const frames = document.screens.map((screen) => {
    const size = frameDimensions(screen);
    const swipe = exportSwipe(screen, frameIds);
    const frame = {
      id: screen.id,
      name: screen.name,
      x: frameX,
      y: 0,
      w: size.width,
      h: size.height,
      ...(screen.background ? { bg: screen.background } : {}),
      ...(screen.notes?.trim() ? { note: screen.notes.trim() } : {}),
      ...(screen.contentPlacement ? { place: screen.contentPlacement } : {}),
      ...(swipe ? { swipe } : {}),
    } satisfies M3eExportFrame;
    frameX += size.width + 120;
    return frame;
  });
  const groups = document.screens.flatMap((screen, index) => exportGroupsForScreen(screen, frameIds, frameDimensions(screen), frames[index]?.x ?? 0));
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
  flattenedNodeKinds: Set<string>,
  approximatedKinds: Set<string>,
  unsupportedNodeKinds: Set<string>,
  frameIds: Map<string, string>,
): void {
  if (flattenedOnlyNodeKinds.has(node.kind)) flattenedNodeKinds.add(node.kind);
  if (approximatedNodeKinds.has(node.kind)) approximatedKinds.add(node.kind);
  if (node.m3eKind) {
    if (approximatedM3eKinds.has(node.m3eKind)) approximatedKinds.add(node.m3eKind);
    if (!supportedM3eKinds.has(node.m3eKind)) unsupportedNodeKinds.add(node.m3eKind);
  }
  if (!isContainerNode(node) && exportItem(node, frameIds) === null) unsupportedNodeKinds.add(node.kind);
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      collectExportCompatibilityKinds(child, flattenedNodeKinds, approximatedKinds, unsupportedNodeKinds, frameIds);
    }
  }
}

export function inspectM3eExportCompatibility(document: CanvasDocument): M3eExportCompatibilityReport {
  const exported = exportM3eDocument(document);
  const roundTripped = convertM3eDocument(exported);
  const roundTripExport = roundTripped ? exportM3eDocument(roundTripped) : null;
  const frameIds = new Map(document.screens.map((screen) => [screen.id, screen.id]));
  const unsupportedNodeKinds = new Set<string>();
  const flattenedNodeKinds = new Set<string>();
  const approximatedKinds = new Set<string>();
  const sourceFields = new Set<string>();
  const exportedFields = new Set<string>();
  let unresolvedDestinationCount = 0;
  let unresolvedActionCount = 0;
  const unresolvedPaths = new Set<string>();

  const collectMetadataFields = (node: CanvasNode): void => {
    Object.keys(node.m3eMetadata ?? {}).forEach((field) => sourceFields.add(field));
    if (Array.isArray(node.children)) node.children.forEach(collectMetadataFields);
  };
  const collectExportedFields = (item: M3eExportItem): void => {
    Object.keys(item).forEach((field) => exportedFields.add(field));
  };
  const collectUnresolvedMetadataActions = (
    metadata: M3eItemMetadata | undefined,
    path: string,
    exportedItem?: Pick<M3eExportItem, 'action' | 'actions'>,
  ): void => {
    if (!metadata) return;
    const actions = [
      ...(metadata.action && (exportedItem?.action === undefined || exportedItem.action === metadata.action)
        ? [{ path: `${path}.action.to`, action: metadata.action }]
        : []),
      ...Object.entries(metadata.actions ?? {}).flatMap(([slot, action]) => {
        const exportedAction = exportedItem?.actions?.[slot];
        return exportedAction === undefined || exportedAction === action
          ? [{ path: `${path}.actions.${slot}.to`, action }]
          : [];
      }),
    ];
    for (const { path: actionPath, action } of actions) {
      if (action.to !== 'back' && !frameIds.has(action.to)) {
        unresolvedDestinationCount += 1;
        unresolvedActionCount += 1;
        unresolvedPaths.add(actionPath);
      }
    }
  };
  exported.groups.forEach((group) => group.items.forEach(collectExportedFields));

  for (const screen of document.screens) {
    collectExportCompatibilityKinds(screen.root, flattenedNodeKinds, approximatedKinds, unsupportedNodeKinds, frameIds);
    collectMetadataFields(screen.root);
    collectUnresolvedMetadataActions(screen.m3eTopAppBar, `screens[${screen.id}].m3eTopAppBar`, exportTopBar(screen, frameIds) ?? undefined);
    collectUnresolvedMetadataActions(screen.m3eBottomNav, `screens[${screen.id}].m3eBottomNav`, exportBottomBar(screen, frameIds) ?? undefined);
    Object.keys(screen.m3eTopAppBar ?? {}).forEach((field) => sourceFields.add(field));
    Object.keys(screen.m3eBottomNav ?? {}).forEach((field) => sourceFields.add(field));
    for (const [index, node] of screen.root.children.entries()) {
      const visit = (current: CanvasNode, path: string): void => {
        if ((current.kind === 'button' || current.kind === 'navigation-link')
          && current.navigationAction !== 'back'
          && current.destinationScreenId
          && !frameIds.has(current.destinationScreenId)) {
          unresolvedDestinationCount += 1;
          unresolvedActionCount += 1;
          unresolvedPaths.add(`${path}.destinationScreenId`);
        }
        if (current.kind === 'alert') {
          for (const [actionIndex, action] of (current.actions ?? []).entries()) {
            if (action.destinationScreenId && action.navigationAction !== 'back' && !frameIds.has(action.destinationScreenId)) {
              unresolvedDestinationCount += 1;
              unresolvedActionCount += 1;
              unresolvedPaths.add(`${path}.actions[${actionIndex}].destinationScreenId`);
            }
          }
        }
        for (const [slot, action] of Object.entries(current.m3eMenuActions ?? {})) {
          if (action.navigationAction !== 'back' && action.destinationScreenId && !frameIds.has(action.destinationScreenId)) {
            unresolvedDestinationCount += 1;
            unresolvedActionCount += 1;
            unresolvedPaths.add(`${path}.m3eMenuActions.${slot}.destinationScreenId`);
          }
        }
        collectUnresolvedMetadataActions(current.m3eMetadata, `${path}.m3eMetadata`, exportItem(current, frameIds) ?? undefined);
        if (Array.isArray(current.children)) {
          for (const [childIndex, child] of current.children.entries()) visit(child, `${path}.children[${childIndex}]`);
        }
      };
      visit(node, `screens[${screen.id}].root.children[${index}]`);
    }
    const toolbarItems = [
      ...(screen.toolbarItems ?? []).map((item, index) => ({ item, path: `screens[${screen.id}].toolbarItems[${index}]` })),
      ...(screen.tabBarItems ?? []).map((item, index) => ({ item, path: `screens[${screen.id}].tabBarItems[${index}]` })),
    ];
    for (const { item, path } of toolbarItems) {
      if (item.navigationAction !== 'back' && item.destinationScreenId && !frameIds.has(item.destinationScreenId)) {
        unresolvedDestinationCount += 1;
        unresolvedActionCount += 1;
        unresolvedPaths.add(`${path}.destinationScreenId`);
      }
    }
    for (const [direction, destination] of Object.entries(screen.swipe ?? {})) {
      if (destination && !frameIds.has(destination)) {
        unresolvedDestinationCount += 1;
        unresolvedActionCount += 1;
        unresolvedPaths.add(`screens[${screen.id}].swipe.${direction}`);
      }
    }
  }

  const preservedFields = [...sourceFields].filter((field) => exportedFields.has(field)).sort();
  const lostFields = [...sourceFields].filter((field) => !exportedFields.has(field)).sort();
  const approximatedFields = [...sourceFields].filter((field): field is M3ePreservableField => approximatedM3eFields.has(field as M3ePreservableField)).sort();

  return {
    flattenedItemCount: exported.groups.reduce(
      (count, group) => count + group.items.filter((item) => item.kind !== 'topAppBar' && item.kind !== 'bottomNav').length,
      0,
    ),
    unsupportedNodeKinds: [...unsupportedNodeKinds].sort(),
    flattenedNodeKinds: [...flattenedNodeKinds].sort(),
    approximatedKinds: [...approximatedKinds].sort(),
    unresolvedDestinationCount,
    unresolvedActionCount,
    unresolvedPaths: [...unresolvedPaths].sort(),
    preservedFields,
    approximatedFields,
    lostFields,
    invalidFields: collectM3eInvalidFields(exported),
    duplicateIdFields: collectM3eDuplicateIdFields(exported),
    unknownFields: collectM3eUnknownFields(exported),
    normalizedScreenCount: exported.frames.length,
    roundTripValid: roundTripped !== null
      && roundTripped.screens.length === exported.frames.length
      && roundTripExport !== null
      && JSON.stringify(exportMeaningfulSignatures(exported)) === JSON.stringify(exportMeaningfulSignatures(roundTripExport)),
  };
}

export function generateM3eJson(document: CanvasDocument): string {
  return JSON.stringify(exportM3eDocument(document), null, 2);
}
