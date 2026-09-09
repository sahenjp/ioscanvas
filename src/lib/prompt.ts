import { lintDocument } from './hig';
import type { CanvasDocument, CanvasNode, ScreenDevice } from '../types/document';

function promptSource(value: string): string {
  const trimmed = value.trim();
  if (!/^data:/i.test(trimmed)) return trimmed;
  const headerEnd = trimmed.indexOf(',');
  return headerEnd >= 0 ? `${trimmed.slice(0, headerEnd)},…` : 'data:…';
}

function m3eMetadataDetails(metadata: CanvasNode['m3eMetadata']): string {
  if (!metadata) return '';
  const parts = [
    metadata.icon === undefined ? '' : `sourceIcon=${metadata.icon ?? 'none'}`,
    metadata.icon2 === undefined ? '' : `sourceIcon2=${metadata.icon2 ?? 'none'}`,
    metadata.supporting?.trim() ? `supporting=${metadata.supporting.trim()}` : '',
    metadata.size === undefined ? '' : `size=${metadata.size}dp`,
    metadata.size2 === undefined ? '' : `size2=${metadata.size2}dp`,
    metadata.radiusTop === undefined ? '' : `radiusTop=${metadata.radiusTop}dp`,
    metadata.radiusBottom === undefined ? '' : `radiusBottom=${metadata.radiusBottom}dp`,
    metadata.corners ? `corners=${metadata.corners.tl}/${metadata.corners.tr}/${metadata.corners.br}/${metadata.corners.bl}` : '',
    metadata.selected === undefined ? '' : `selected=${metadata.selected}`,
    metadata.imagePos ? `imagePos=${metadata.imagePos}` : '',
    metadata.imageSize === undefined ? '' : `imageSize=${metadata.imageSize}dp`,
    metadata.contentAlign ? `contentAlign=${metadata.contentAlign}` : '',
    metadata.textColor ? `textColor=${metadata.textColor}` : '',
    metadata.fill ? `fill=${metadata.fill}` : '',
    metadata.iconFill ? `iconFill=${metadata.iconFill}` : '',
    metadata.src?.trim() ? `source=${promptSource(metadata.src)}` : '',
    metadata.contained ? 'contained' : '',
    metadata.noCheck ? 'noCheck' : '',
    metadata.noImage ? 'noImage' : '',
    metadata.wavy ? 'wavy' : '',
    metadata.trackThickness === undefined ? '' : `trackThickness=${metadata.trackThickness}pt`,
    metadata.railExpanded ? 'railExpanded' : '',
    metadata.railModal ? 'railModal' : '',
    metadata.railExpansionSide ? `railExpansionSide=${metadata.railExpansionSide}` : '',
  ].filter(Boolean);
  return parts.length > 0 ? ` / M3E ${parts.join(' / ')}` : '';
}

function describe(node: CanvasNode, depth = 0): string[] {
  const pad = '  '.repeat(depth);
  const m3eKind = node.m3eKind ? ` / M3E kind=${node.m3eKind}${node.m3eVariant ? ` / variant=${node.m3eVariant}` : ''}` : '';
  const menuActions = Object.entries(node.m3eMenuActions ?? {})
    .map(([slot, action]) => `${slot}=${action.navigationAction === 'back' ? 'back' : action.destinationScreenId ?? '未設定'}${action.navigationTransition ? ` (${action.navigationTransition})` : ''}`)
    .join(', ');
  const common = `${pad}- ${node.kind}${node.glass ? ` / glass=${node.glass}` : ''}${node.glassInteractive ? ' / interactive' : ''}${node.glassTint ? ` / tint=${node.glassTint}` : ''}${node.glassShape && node.glassShape !== 'automatic' ? ` / glassShape=${node.glassShape}` : ''}${node.padding ? ` / padding=${node.padding}pt` : ''}${node.frameWidth === 'max' ? ' / frame=max' : ''}${node.background && node.background !== 'none' ? ` / background=${node.background}` : ''}${node.cornerRadius ? ` / cornerRadius=${node.cornerRadius}` : ''}${node.overlay ? ' / overlay' : ''}${node.shadow && node.shadow !== 'none' ? ` / shadow=${node.shadow}` : ''}${node.notes?.trim() ? ` / memo=${node.notes.trim()}` : ''}${m3eKind}${menuActions ? ` / menuActions=${menuActions}` : ''}${m3eMetadataDetails(node.m3eMetadata)}`;
  switch (node.kind) {
    case 'text':
      return [`${common}: ${node.text} / ${node.textStyle && node.textStyle !== 'custom' ? node.textStyle : `${node.fontSize}pt`} / ${node.weight}${node.fontDesign && node.fontDesign !== 'default' ? ` / design=${node.fontDesign}` : ''}${node.textAlignment && node.textAlignment !== 'leading' ? ` / alignment=${node.textAlignment}` : ''}${node.lineLimit ? ` / lineLimit=${node.lineLimit}` : ''}`];
    case 'button':
      return [`${common}: ${node.label} / role=${node.role}${node.buttonStyle && node.buttonStyle !== 'automatic' ? ` / style=${node.buttonStyle}` : ''}${node.systemName ? ` / symbol=${node.systemName}` : ''}${node.m3eIcon2 ? ` / trailingSymbol=${node.m3eIcon2}` : ''}${node.accessibilityLabel ? ` / accessibility=${node.accessibilityLabel}` : ''}${node.toggle ? ` / toggle=${node.toggle.isOn ? 'on' : 'off'} / onLabel=${node.toggle.onLabel}${node.toggle.onSystemName ? ` / onSymbol=${node.toggle.onSystemName}` : ''}` : ''}${node.navigationAction === 'back' ? ' / action=back' : ''}${node.destinationScreenId ? ` / destination=${node.destinationScreenId}` : ''}${node.navigationTransition ? ` / transition=${node.navigationTransition}` : ''}`];
    case 'alert':
      return [`${common}: ${node.label} / title=${node.title} / message=${node.message} / primary=${node.primaryButton}${node.secondaryButton ? ` / secondary=${node.secondaryButton}` : ''}`];
    case 'confirmation-dialog':
      return [`${common}: ${node.label} / title=${node.title} / message=${node.message} / options=${node.options.join(', ')}${node.cancelButton ? ` / cancel=${node.cancelButton}` : ''}`];
    case 'toggle':
      return [`${common}: ${node.label} / binding=${node.binding}`];
    case 'textfield':
      return [`${common}: ${node.label} / binding=${node.binding}`];
    case 'searchfield':
      return [`${common}: ${node.label} / binding=${node.binding} / prompt=${node.prompt}`];
    case 'securefield':
      return [`${common}: ${node.label} / binding=${node.binding}`];
    case 'texteditor':
      return [`${common}: ${node.label} / binding=${node.binding}`];
    case 'picker':
      return [`${common}: ${node.label} / binding=${node.binding} / options=${node.options.join(', ')}`];
    case 'colorpicker':
      return [`${common}: ${node.label} / binding=${node.binding} / color=${node.color}`];
    case 'slider':
    case 'stepper':
      return [`${common}: ${node.label} / binding=${node.binding} / value=${node.value} / range=${node.minimum}...${node.maximum} / step=${node.step}`];
    case 'menu':
      return [`${common}: ${node.label} / options=${node.options.join(', ')}`];
    case 'progress':
      return [`${common}: ${node.label} / value=${Math.round(node.value * 100)}%`];
    case 'gauge':
      return [`${common}: ${node.label} / value=${node.value} / range=${node.minimum}...${node.maximum}`];
    case 'content-unavailable':
      return [`${common}: ${node.title} / symbol=${node.systemName}${node.description ? ` / description=${node.description}` : ''}`];
    case 'navigation-link':
      return [`${common}: ${node.label} / destination=${node.destinationScreenId || 'unset'}${node.navigationTransition ? ` / transition=${node.navigationTransition}` : ''}`];
    case 'label':
      return [`${common}: ${node.title} / symbol=${node.systemName} / accessibility=${node.accessibilityLabel || 'decorative'}`];
    case 'link':
      return [`${common}: ${node.label} / url=${node.url}`];
    case 'datepicker':
      return [`${common}: ${node.label} / binding=${node.binding}`];
    case 'image':
      return [`${common}: ${node.systemName} / source=${node.source ?? 'symbol'} / accessibility=${node.accessibilityLabel || 'decorative'}`];
    case 'camera':
      return [`${common}: ${node.label} / ButtonからAVFoundationのカメラ入力へ接続`];
    case 'map':
      return [`${common}: ${node.label || '地図'} / MapKit`];
    case 'section':
      return [`${common}: ${node.title ?? 'Section'}`, ...node.children.flatMap((child) => describe(child, depth + 1))];
    case 'vstack':
    case 'hstack':
    case 'lazyvstack':
    case 'lazyhstack':
    case 'zstack':
    case 'navigation-split-view':
    case 'glass-container':
    case 'group':
    case 'tabview':
    case 'disclosure-group':
    case 'sheet':
    case 'groupbox':
      return [`${common}${node.title ? `: ${node.title}` : ''}`, ...node.children.flatMap((child) => describe(child, depth + 1))];
    case 'lazyvgrid':
    case 'lazyhgrid':
    case 'scrollview':
    case 'list':
    case 'form':
      return [`${common}${node.kind === 'lazyvgrid' ? ` / columns=${node.columns ?? 2}` : node.kind === 'lazyhgrid' ? ` / rows=${node.rows ?? 2}` : ''}`, ...node.children.flatMap((child) => describe(child, depth + 1))];
    default:
      return [common];
  }
}

export type PromptScope = 'active' | 'all';

const screenDeviceNames: Record<ScreenDevice, string> = {
  'iphone-se': 'iPhone SE',
  'iphone-16': 'iPhone 16',
  'ipad-mini': 'iPad mini',
  'ipad-pro-11': 'iPad Pro 11インチ',
};

function screenDetails(screen: CanvasDocument['screens'][number], document: CanvasDocument): string[] {
  const actionDetails = (item: { navigationAction?: 'back'; navigationTransition?: string; destinationScreenId?: string }) => `${item.navigationAction === 'back' ? ' / action=back' : ''}${item.destinationScreenId ? ` / destination=${document.screens.find((candidate) => candidate.id === item.destinationScreenId)?.name ?? '未設定'}` : ''}${item.navigationTransition ? ` / transition=${item.navigationTransition}` : ''}`;
  const toolbar = (screen.toolbarItems ?? []).map((item) => `${item.placement}: ${item.title}${item.systemName ? ` / symbol=${item.systemName}` : ''}${item.selected ? ' / selected' : ''}${actionDetails(item)}`).join(', ') || 'なし';
  const tabBar = (screen.tabBarItems ?? []).map((item) => `${item.title}${item.systemName ? ` / symbol=${item.systemName}` : ''}${item.selected ? ' / selected' : ''}${actionDetails(item)}`).join(', ') || 'なし';
  const navigation = navigationLinks(screen.root.children)
    .map((node) => `${node.label}=${node.navigationAction === 'back' ? '前の画面' : document.screens.find((candidate) => candidate.id === node.destinationScreenId)?.name ?? '未設定'}${node.navigationTransition ? ` (${node.navigationTransition})` : ''}`)
    .join(', ') || 'なし';
  const swipe = Object.entries(screen.swipe ?? {}).map(([direction, destination]) => `${direction}=${document.screens.find((candidate) => candidate.id === destination)?.name ?? destination}`).join(', ') || 'なし';

  return [
    `画面: ${screen.name}`,
    `ナビゲーションタイトル: ${screen.navigationTitle}`,
    ...(screen.notes?.trim() ? [`画面メモ: ${screen.notes.trim()}`] : []),
    `タイトル表示: ${screen.navigationTitleDisplayMode ?? 'automatic'}`,
    `本文の配置: ${screen.contentPlacement ?? 'top'}`,
    `画面背景: ${screen.background ?? 'surface'}`,
    `プレビュー端末: ${screenDeviceNames[screen.previewDevice ?? 'iphone-16']}`,
    `画面方向: ${screen.previewOrientation === 'landscape' ? '横向き' : '縦向き'}`,
    ...(screen.m3eTopAppBar ? [`M3E Top App Bar:${m3eMetadataDetails(screen.m3eTopAppBar)}`] : []),
    ...(screen.m3eBottomNav ? [`M3E Bottom Navigation:${m3eMetadataDetails(screen.m3eBottomNav)}`] : []),
    `ツールバー: ${toolbar}`,
    `タブバー: ${tabBar}`,
    `NavigationLink遷移: ${navigation}`,
    `スワイプ遷移: ${swipe}`,
    '構造:',
    ...screen.root.children.flatMap((node) => describe(node)),
  ];
}

function navigationLinks(nodes: CanvasNode[]): Extract<CanvasNode, { kind: 'navigation-link' | 'button' }>[] {
  return nodes.flatMap((node) => [
    ...(node.kind === 'navigation-link' || node.kind === 'button' ? (node.destinationScreenId || node.navigationAction === 'back' ? [node] : []) : []),
    ...(node.children ? navigationLinks(node.children) : []),
  ]);
}

export function generateImplementationPrompt(document: CanvasDocument, scope: PromptScope = 'active'): string {
  const screen = document.screens.find((candidate) => candidate.id === document.activeScreenId) ?? document.screens[0];
  if (!screen) return '';
  const screens = scope === 'all' ? document.screens : [screen];
  const issues = lintDocument(document);

  return [
    `SwiftUIで${scope === 'all' ? 'この設計全体' : 'この画面'}を実装してください。`,
    '',
    `プロジェクト: ${document.name}`,
    `対象: iOS ${document.minimumOS}以降 / SwiftUI`,
    `外観: ${document.appearance.colorScheme} / tint=${document.appearance.accentColor === 'custom' ? document.appearance.accentHex ?? '#007AFF' : document.appearance.accentColor} / fontDesign=${document.appearance.fontDesign ?? 'default'}`,
    '',
    ...screens.flatMap((candidate, index) => [
      ...(scope === 'all' && index > 0 ? [''] : []),
      ...screenDetails(candidate, document),
    ]),
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
