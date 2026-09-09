import type { CanvasDocument, CanvasNode, CanvasScreen, ContainerNode, M3eItemMetadata, M3eTextColor, ScreenBackground, SwipeDirection, ToolbarItem } from '../types/document';

const indent = (depth: number) => '    '.repeat(depth);
const indentBlock = (value: string, depth: number) => value
  .split('\n')
  .map((line) => line ? `${indent(depth)}${line}` : line)
  .join('\n');

function quoted(value: string): string {
  return JSON.stringify(value)
    .replace(/\\u([0-9a-f]{4})/gi, '\\u{$1}')
    .replace(/\\b/g, '\\u{8}')
    .replace(/\\f/g, '\\u{c}');
}
const swiftKeywords = new Set([
  'associatedtype', 'class', 'deinit', 'enum', 'extension', 'fileprivate', 'func', 'import',
  'init', 'inout', 'internal', 'let', 'open', 'operator', 'private', 'precedencegroup',
  'protocol', 'public', 'rethrows', 'static', 'struct', 'subscript', 'typealias', 'var',
  'break', 'case', 'catch', 'continue', 'default', 'defer', 'do', 'else', 'fallthrough',
  'for', 'guard', 'if', 'in', 'repeat', 'return', 'throw', 'switch', 'where', 'while',
  'as', 'false', 'is', 'nil', 'self', 'Self', 'super', 'throws', 'true', 'try',
  'Any', 'Protocol', 'Type', 'some', 'unowned', 'weak', 'actor', 'async', 'await',
  'borrowing', 'consume', 'convenience', 'distributed', 'dynamic', 'each', 'final',
  'indirect', 'isolated', 'macro', 'mutating', 'nonisolated', 'package', 'required',
  'sending',
]);

interface BindingInfo {
  name: string;
  type: 'Bool' | 'String' | 'Double' | 'Int' | 'Int?' | 'Date' | 'Color';
  initial: string;
}

interface RenderContext {
  bindings: Map<string, BindingInfo>;
  viewNames: Map<string, string>;
  nodeModifiers?: Map<string, string[]>;
}

interface SwipeState {
  direction: SwipeDirection;
  stateName: string;
  viewName: string;
}

type ValueBindingNode = Extract<CanvasNode, { kind: 'toggle' | 'textfield' | 'searchfield' | 'securefield' | 'texteditor' | 'picker' | 'colorpicker' | 'slider' | 'stepper' }>;

function bindingKey(node: ValueBindingNode): string {
  const type = node.kind === 'toggle'
    ? 'Bool'
    : node.kind === 'colorpicker'
      ? 'Color'
      : node.kind === 'slider' || node.kind === 'stepper'
        ? 'Double'
        : 'String';
  return `${type}:${node.binding}`;
}

function dateBindingKey(node: Extract<CanvasNode, { kind: 'datepicker' }>): string {
  return `Date:${node.binding}`;
}

function sheetBindingKey(node: CanvasNode): string {
  return `Sheet:${node.id}`;
}

function alertBindingKey(node: Extract<CanvasNode, { kind: 'alert' }>): string {
  return `Alert:${node.id}`;
}

function confirmationDialogBindingKey(node: Extract<CanvasNode, { kind: 'confirmation-dialog' }>): string {
  return `ConfirmationDialog:${node.id}`;
}

function tabSelectionKey(node: CanvasNode): string {
  return `TabView:${node.id}`;
}

function railSelectionKey(node: CanvasNode): string {
  return `NavigationRail:${node.id}`;
}

function buttonToggleKey(node: Extract<CanvasNode, { kind: 'button' }>): string {
  return `Button:${node.id}`;
}

function swiftIdentifier(value: string, fallback: string): string {
  const sanitized = value.trim().replace(/[^A-Za-z0-9_]/g, '_');
  const normalized = sanitized && !/^_+$/.test(sanitized) ? sanitized : fallback;
  const identifier = /^\d/.test(normalized) ? `_${normalized}` : normalized;
  return swiftKeywords.has(identifier) ? `_${identifier}` : identifier;
}

function swiftColorLiteral(value: string): string {
  const match = /^#([0-9a-f]{6})$/i.exec(value.trim());
  const hex = match?.[1];
  if (!hex) return 'Color.accentColor';
  const red = Number.parseInt(hex.slice(0, 2), 16) / 255;
  const green = Number.parseInt(hex.slice(2, 4), 16) / 255;
  const blue = Number.parseInt(hex.slice(4, 6), 16) / 255;
  return `Color(red: ${red.toFixed(3)}, green: ${green.toFixed(3)}, blue: ${blue.toFixed(3)})`;
}

function accentColorLiteral(appearance: CanvasDocument['appearance']): string {
  return appearance.accentColor === 'custom'
    ? swiftColorLiteral(appearance.accentHex ?? '')
    : `.${appearance.accentColor}`;
}

function renderNode(node: CanvasNode, depth: number, context: RenderContext): string {
  const rendered = renderNodeContent(node, depth, m3eChildIconContext(node, context));
  const pad = indent(depth);
  const transitionNote = node.navigationTransition
    ? `${pad}// iOSCanvas navigation transition: ${node.navigationTransition}. NavigationStack keeps the native transition; use a custom route if this exact motion is required.\n`
    : '';
  const modifiers: string[] = [];
  if (node.padding !== undefined && node.padding > 0) modifiers.push(`${pad}.padding(${node.padding})`);
  if (node.frameWidth === 'max') modifiers.push(`${pad}.frame(maxWidth: .infinity, alignment: .leading)`);
  if (node.background && node.background !== 'none') {
    const background = {
      secondary: 'Color.secondary.opacity(0.12)',
      tertiary: 'Color.secondary.opacity(0.06)',
      accent: 'Color.accentColor.opacity(0.16)',
      material: '.thinMaterial',
    }[node.background];
    modifiers.push(`${pad}.background(${background})`);
  }
  if (node.cornerRadius !== undefined && node.cornerRadius > 0) {
    modifiers.push(`${pad}.clipShape(RoundedRectangle(cornerRadius: ${node.cornerRadius}))`);
  }
  if (node.overlay) {
    const radius = node.cornerRadius ?? 12;
    modifiers.push(`${pad}.overlay { RoundedRectangle(cornerRadius: ${radius}).stroke(Color.secondary.opacity(0.35), lineWidth: 1) }`);
  }
  if (node.shadow && node.shadow !== 'none') {
    const shadow = node.shadow === 'medium' ? 'radius: 10, y: 4' : 'radius: 4, y: 2';
    modifiers.push(`${pad}.shadow(color: .black.opacity(0.14), ${shadow})`);
  }
  modifiers.push(...m3eModifiers(node, depth));
  if (node.glass) modifiers.push(glassModifier(node, depth));
  if (node.kind === 'button' && node.accessibilityLabel?.trim()) {
    modifiers.push(`${pad}.accessibilityLabel(${quoted(node.accessibilityLabel)})`);
  }
  modifiers.push(...(context.nodeModifiers?.get(node.id) ?? []).map((modifier) => `${pad}${modifier}`));
  const output = modifiers.length > 0 ? `${rendered}\n${modifiers.join('\n')}` : rendered;
  return transitionNote + output;
}

function m3eFillLiteral(fill: ScreenBackground): string {
  switch (fill) {
    case 'surface': return 'Color.clear';
    case 'surfaceContainerLow': return 'Color.secondary.opacity(0.06)';
    case 'surfaceContainer': return 'Color.secondary.opacity(0.12)';
    case 'surfaceContainerHigh': return 'Color.secondary.opacity(0.18)';
    case 'surfaceContainerHighest': return 'Color.secondary.opacity(0.24)';
    case 'primaryContainer': return 'Color.accentColor.opacity(0.16)';
    case 'secondaryContainer': return 'Color.accentColor.opacity(0.10)';
    case 'tertiaryContainer': return 'Color.orange.opacity(0.10)';
    case 'primary': return 'Color.accentColor';
    case 'inverseSurface': return 'Color.primary';
  }
}

function m3eTextColorLiteral(color: M3eTextColor): string {
  switch (color) {
    case 'primary': return 'Color.accentColor';
    case 'secondary':
    case 'onSurfaceVariant': return 'Color.secondary';
    case 'onSurface':
    case 'onPrimaryContainer':
    case 'onSecondaryContainer':
    case 'onTertiaryContainer': return 'Color.primary';
    case 'inverseOnSurface': return 'Color.primary';
  }
}

function m3eCornerShape(metadata: M3eItemMetadata): string | undefined {
  if (metadata.corners) {
    const { tl, tr, bl, br } = metadata.corners;
    return `.clipShape(UnevenRoundedRectangle(cornerRadii: .init(topLeading: ${tl}, bottomLeading: ${bl}, bottomTrailing: ${br}, topTrailing: ${tr})))`;
  }
  if (metadata.radiusTop !== undefined || metadata.radiusBottom !== undefined) {
    const top = metadata.radiusTop ?? 0;
    const bottom = metadata.radiusBottom ?? 0;
    return `.clipShape(UnevenRoundedRectangle(cornerRadii: .init(topLeading: ${top}, bottomLeading: ${bottom}, bottomTrailing: ${bottom}, topTrailing: ${top})))`;
  }
  return undefined;
}

function m3eModifiers(node: CanvasNode, depth: number): string[] {
  const metadata = node.m3eMetadata;
  if (!metadata) return [];
  const pad = indent(depth);
  const modifiers: string[] = [];
  const hasBackground = node.background !== undefined && node.background !== 'none';
  if (!hasBackground && metadata.fill && metadata.fill !== 'surface') {
    modifiers.push(`${pad}.background(${m3eFillLiteral(metadata.fill)})`);
  }
  if (metadata.textColor) modifiers.push(`${pad}.foregroundStyle(${m3eTextColorLiteral(metadata.textColor)})`);
  if (metadata.size !== undefined && (node.kind === 'button' || node.kind === 'image' || node.kind === 'groupbox')) {
    modifiers.push(`${pad}.frame(width: ${metadata.size})`);
  }
  if (metadata.size2 !== undefined && (node.kind === 'button' || node.kind === 'image' || node.kind === 'groupbox')) {
    modifiers.push(`${pad}.frame(minHeight: ${metadata.size2})`);
  }
  if (node.cornerRadius === undefined) {
    const cornerShape = m3eCornerShape(metadata);
    if (cornerShape) modifiers.push(`${pad}${cornerShape}`);
  }
  if (metadata.contained && !hasBackground && !node.glass && !metadata.fill) {
    modifiers.push(`${pad}.background(.thinMaterial, in: RoundedRectangle(cornerRadius: 12))`);
  }
  if (metadata.iconFill && node.kind === 'image' && (!node.source || node.source === 'symbol') && metadata.iconFill !== 'none') {
    modifiers.push(`${pad}.padding(6)`);
    modifiers.push(`${pad}.background(${m3eFillLiteral(metadata.iconFill)}, in: RoundedRectangle(cornerRadius: 8))`);
  }
  return modifiers;
}

function m3eButtonLabel(
  node: Extract<CanvasNode, { kind: 'button' }>,
  titleExpression = quoted(node.label),
  symbolExpression = node.systemName?.trim() ? quoted(node.systemName) : undefined,
): string {
  const iconFill = node.m3eMetadata?.iconFill;
  const trailingSymbol = node.m3eIcon2;
  const trailingExpression = trailingSymbol?.trim() ? quoted(trailingSymbol) : undefined;
  const icon = (expression: string): string => {
    const image = `Image(systemName: ${expression})`;
    if (!iconFill || iconFill === 'none') return image;
    return `${image}
    .padding(6)
    .background(${m3eFillLiteral(iconFill)}, in: RoundedRectangle(cornerRadius: 8))`;
  };
  const leading = symbolExpression
    ? !iconFill || iconFill === 'none'
      ? `Label(${titleExpression}, systemImage: ${symbolExpression})`
      : `Label {
    Text(${titleExpression})
} icon: {
${indentBlock(icon(symbolExpression), 1)}
}`
    : `Text(${titleExpression})`;
  if (!trailingExpression) return leading;
  return `HStack(spacing: 8) {
${indentBlock(leading, 1)}
${indentBlock(icon(trailingExpression), 1)}
}`;
}

function m3eChildIconContext(node: CanvasNode, context: RenderContext): RenderContext {
  const fill = node.m3eMetadata?.iconFill;
  if (!fill || fill === 'none' || !node.children) return context;
  const nodeModifiers = new Map(context.nodeModifiers ?? []);
  const addToImages = (current: CanvasNode): void => {
    if (current.kind === 'image' && (!current.source || current.source === 'symbol')) {
      nodeModifiers.set(current.id, [
        ...(nodeModifiers.get(current.id) ?? []),
        '.padding(6)',
        `.background(${m3eFillLiteral(fill)}, in: RoundedRectangle(cornerRadius: 8))`,
      ]);
    }
    current.children?.forEach(addToImages);
  };
  node.children.forEach(addToImages);
  return { ...context, nodeModifiers };
}

function m3eToolbarBackground(metadata: M3eItemMetadata | undefined): string | undefined {
  if (!metadata) return undefined;
  if (metadata.fill && metadata.fill !== 'surface') return m3eFillLiteral(metadata.fill);
  if (metadata.contained && !metadata.fill) return '.thinMaterial';
  return undefined;
}

function m3eToolbarModifiers(screen: CanvasScreen): string {
  const modifiers: string[] = [];
  const topBackground = m3eToolbarBackground(screen.m3eTopAppBar);
  const bottomBackground = m3eToolbarBackground(screen.m3eBottomNav);
  if (topBackground) modifiers.push(`        .toolbarBackground(${topBackground}, for: .navigationBar)`);
  if (bottomBackground) modifiers.push(`        .toolbarBackground(${bottomBackground}, for: .tabBar)`);
  return modifiers.length > 0 ? `\n${modifiers.join('\n')}` : '';
}

function cardRenderContext(
  node: ContainerNode,
  context: RenderContext,
): RenderContext {
  if (node.cardImagePosition === undefined && node.cardImageSize === undefined && node.cardContentAlignment === undefined) return context;

  const wrapper = node.children.find((child) => child.kind === 'hstack' || child.kind === 'zstack');
  const candidates = wrapper?.children ?? node.children;
  const image = candidates.find((child) => child.kind === 'image');
  const content = candidates.find((child) => child.kind === 'vstack');
  const nodeModifiers = new Map(context.nodeModifiers ?? []);
  const add = (target: CanvasNode | undefined, modifier: string) => {
    if (!target) return;
    nodeModifiers.set(target.id, [...(nodeModifiers.get(target.id) ?? []), modifier]);
  };

  if (image && node.cardImageSize !== undefined) {
    if (node.cardImagePosition === 'leading' || node.cardImagePosition === 'trailing') {
      add(image, `.frame(width: ${node.cardImageSize})`);
    } else if (node.cardImagePosition === 'background') {
      add(image, '.frame(maxWidth: .infinity, maxHeight: .infinity).clipped()');
      add(wrapper, `.frame(minHeight: ${node.cardImageSize})`);
    } else {
      add(image, `.frame(maxWidth: .infinity, height: ${node.cardImageSize})`);
    }
  }

  if (content && node.cardContentAlignment !== undefined) {
    const alignment = node.cardContentAlignment === 'center' ? 'center' : node.cardContentAlignment === 'end' ? 'bottom' : 'top';
    add(content, node.cardImagePosition === 'background'
      ? `.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .${alignment})`
      : `.frame(maxWidth: .infinity, alignment: .${alignment})`);
  }

  return { ...context, nodeModifiers };
}

function glassModifier(node: CanvasNode, depth: number): string {
  const pad = indent(depth);
  if (node.kind === 'button' && node.glass === 'regular') {
    return [`${pad}.buttonStyle(.glass)`, node.glassTint ? `${pad}.tint(.${node.glassTint})` : ''].filter(Boolean).join('\n');
  }
  if (node.kind === 'button' && node.glass === 'prominent') {
    return [`${pad}.buttonStyle(.glassProminent)`, node.glassTint ? `${pad}.tint(.${node.glassTint})` : ''].filter(Boolean).join('\n');
  }

  const style = node.glass === 'prominent' ? 'regular' : node.glass;
  const glass = `.${style}${node.glassTint ? `.tint(.${node.glassTint})` : ''}${node.glassInteractive ? '.interactive()' : ''}`;
  const shape = node.glassShape && node.glassShape !== 'automatic'
    ? `, in: ${node.glassShape === 'rounded' ? `.rect(cornerRadius: ${node.cornerRadius ?? 18})` : `.${node.glassShape}`}`
    : '';
  return `${pad}.glassEffect(${glass}${shape})`;
}

function fontDesignModifier(node: Extract<CanvasNode, { kind: 'text' }>, depth: number): string {
  return node.fontDesign && node.fontDesign !== 'default'
    ? `\n${indent(depth)}    .fontDesign(.${node.fontDesign})`
    : '';
}

function textLayoutModifiers(node: Extract<CanvasNode, { kind: 'text' }>, depth: number): string {
  const pad = indent(depth);
  const alignment = node.textAlignment && node.textAlignment !== 'leading'
    ? `\n${pad}    .multilineTextAlignment(.${node.textAlignment})`
    : '';
  const lineLimit = node.lineLimit === undefined ? '' : `\n${pad}    .lineLimit(${node.lineLimit})`;
  return `${alignment}${lineLimit}`;
}

function tabTitle(node: CanvasNode): string {
  if (node.tabTitle?.trim()) return node.tabTitle;
  if (node.kind === 'text') return node.text || 'Tab';
  if (node.kind === 'image') return node.accessibilityLabel || 'Tab';
  if ('title' in node && typeof node.title === 'string' && node.title.trim()) return node.title;
  if ('label' in node && typeof node.label === 'string' && node.label.trim()) return node.label;
  return 'Tab';
}

function tabSystemName(node: CanvasNode): string {
  return node.tabSystemName?.trim() || (node.kind === 'image' && node.systemName.trim() ? node.systemName : 'square');
}

function renderToolbarButton(item: ToolbarItem, viewNames: Map<string, string>): string {
  const buttonPad = '                ';
  const contentPad = `${buttonPad}    `;
  const withSelection = (value: string) => item.selected
    ? `${value}\n${buttonPad}.accessibilityAddTraits(.isSelected)`
    : value;
  const transitionNote = item.navigationTransition
    ? `${buttonPad}// iOSCanvas navigation transition: ${item.navigationTransition}. NavigationStack keeps the native transition; use a custom route if this exact motion is required.\n`
    : '';
  const role = item.role && item.role !== 'normal' ? `, role: .${item.role}` : '';
  const destination = item.destinationScreenId ? viewNames.get(item.destinationScreenId) : undefined;
  if (item.navigationAction === 'back') {
    const label = item.systemName?.trim()
      ? `Label(${quoted(item.title)}, systemImage: ${quoted(item.systemName)})`
      : `Text(${quoted(item.title)})`;
    return withSelection(`${transitionNote}${buttonPad}Button {
${contentPad}dismiss()
${buttonPad}} label: {
${contentPad}${label}
${buttonPad}}`);
  }
  if (destination) {
    const label = item.systemName?.trim()
      ? `Label(${quoted(item.title)}, systemImage: ${quoted(item.systemName)})`
      : `Text(${quoted(item.title)})`;
    return withSelection(`${transitionNote}${buttonPad}NavigationLink {
${contentPad}${destination}()
${buttonPad}} label: {
${contentPad}${label}
${buttonPad}}`);
  }
  if (!item.systemName?.trim()) {
    return withSelection(`${buttonPad}Button(${quoted(item.title)}${role}) {
${contentPad}// Action
${buttonPad}}`);
  }
  const label = `Label(${quoted(item.title)}, systemImage: ${quoted(item.systemName)})`;
  if (role) {
    return withSelection(`${buttonPad}Button(role: .${item.role}) {
${contentPad}// Action
${buttonPad}} label: {
${contentPad}${label}
${buttonPad}}`);
  }
  return withSelection(`${buttonPad}Button {
${contentPad}// Action
${buttonPad}} label: {
${contentPad}${label}
${buttonPad}}`);
}

function renderToolbarModifier(screen: CanvasScreen, viewNames: Map<string, string>): string {
  const items = screen.toolbarItems ?? [];
  if (items.length === 0) return '';
  const toolbarItems = items.map((item) => `            ToolbarItem(placement: .${item.placement}) {
${renderToolbarButton(item, viewNames)}
            }`).join('\n');
  return `
        .toolbar {
${toolbarItems}
        }`;
}

function buildSwipeStates(screen: CanvasScreen, context: RenderContext): SwipeState[] {
  const usedNames = new Set([...context.bindings.values()].map((binding) => binding.name));
  const states: SwipeState[] = [];
  for (const direction of ['left', 'right', 'up', 'down'] as SwipeDirection[]) {
    const destination = screen.swipe?.[direction];
    const viewName = destination ? context.viewNames.get(destination) : undefined;
    if (!destination || !viewName) continue;
    const base = swiftIdentifier('show_swipe_' + direction + '_' + screen.id, 'showSwipe' + direction);
    let stateName = base;
    let suffix = 2;
    while (usedNames.has(stateName)) stateName = base + suffix++;
    usedNames.add(stateName);
    states.push({ direction, stateName, viewName });
  }
  return states;
}

function renderSwipeSupport(content: string, states: SwipeState[], depth: number): string {
  if (states.length === 0) return content;
  const pad = indent(depth);
  const innerPad = indent(depth + 1);
  const links = states.map(({ viewName, stateName }) => (
    innerPad + 'NavigationLink(destination: ' + viewName + '(), isActive: $' + stateName + ') {\n'
    + indent(depth + 2) + 'EmptyView()\n'
    + innerPad + '}\n'
    + innerPad + '.accessibilityHidden(true)'
  )).join('\n');
  const horizontal = states.filter(({ direction }) => direction === 'left' || direction === 'right');
  const vertical = states.filter(({ direction }) => direction === 'up' || direction === 'down');
  const horizontalLines = horizontal.length > 0
    ? horizontal.map(({ direction, stateName }) => innerPad + '        if ' + (direction === 'left' ? 'value.translation.width < -60' : 'value.translation.width > 60') + ' { ' + stateName + ' = true }').join('\n')
    : innerPad + '        _ = value.translation.width';
  const verticalLines = vertical.length > 0
    ? vertical.map(({ direction, stateName }) => innerPad + '        if ' + (direction === 'up' ? 'value.translation.height < -60' : 'value.translation.height > 60') + ' { ' + stateName + ' = true }').join('\n')
    : innerPad + '        _ = value.translation.height';
  const gesture = pad + '.simultaneousGesture(\n'
    + innerPad + 'DragGesture(minimumDistance: 30).onEnded { value in\n'
    + innerPad + '    let horizontal = abs(value.translation.width) >= abs(value.translation.height)\n'
    + innerPad + '    if horizontal {\n'
    + horizontalLines + '\n'
    + innerPad + '    } else {\n'
    + verticalLines + '\n'
    + innerPad + '    }\n'
    + innerPad + '}\n'
    + pad + ')';
  return content + '\n'
    + pad + '.overlay {\n'
    + innerPad + 'VStack(spacing: 0) {\n'
    + links + '\n'
    + innerPad + '}\n'
    + innerPad + '.frame(width: 0, height: 0)\n'
    + innerPad + '.accessibilityHidden(true)\n'
    + pad + '}\n'
    + gesture;
}

function renderTabChild(node: CanvasNode, index: number, depth: number, context: RenderContext, selection: boolean): string {
  const pad = indent(depth);
  const tag = selection ? `\n${pad}.tag(${index})` : '';
  return `${renderNode(node, depth, context)}\n${pad}.tabItem {\n${indent(depth + 1)}Label(${quoted(tabTitle(node))}, systemImage: ${quoted(tabSystemName(node))})\n${pad}}${tag}`;
}

function renderNavigationSplitSidebar(node: CanvasNode | undefined, depth: number, context: RenderContext): string {
  const pad = indent(depth);
  if (node?.kind !== 'list') return node ? renderNode(node, depth, context) : `${pad}EmptyView()`;
  const children = node.children.map((child, index) => `${renderNode(child, depth + 1, context)}\n${indent(depth + 1)}.tag(${index})`).join('\n');
  return `${pad}List {\n${children}\n${pad}}`;
}

function buttonStyleModifier(style: string | undefined, depth: number): string {
  return style && style !== 'automatic' ? `\n${indent(depth)}.buttonStyle(.${style})` : '';
}

function renderM3eSplitButton(
  node: Extract<CanvasNode, { kind: 'button' }>,
  depth: number,
  context: RenderContext,
): string {
  const pad = indent(depth);
  const innerPad = indent(depth + 1);
  const contentPad = indent(depth + 2);
  const destination = node.destinationScreenId ? context.viewNames.get(node.destinationScreenId) : undefined;
  const label = m3eButtonLabel(node);
  const labelBlock = indentBlock(label, depth + 2);
  const menuItems = node.m3eMetadata?.tabs?.filter((item) => item.label.trim()) ?? [];
  const menuContent = menuItems.length > 0
    ? menuItems.map((item) => `${contentPad}Button(${quoted(item.label)}) {\n${contentPad}    // M3E SplitButtonのメニュー項目\n${contentPad}}`).join('\n')
    : `${contentPad}Button("メニュー") {\n${contentPad}    // M3E SplitButtonのメニュー項目\n${contentPad}}`;
  const primary = node.navigationAction === 'back'
    ? `${innerPad}Button {\n${contentPad}dismiss()\n${innerPad}} label: {\n${labelBlock}\n${innerPad}}`
    : destination
      ? `${innerPad}NavigationLink {\n${contentPad}${destination}()\n${innerPad}} label: {\n${labelBlock}\n${innerPad}}`
      : `${innerPad}Button {\n${contentPad}// Action\n${innerPad}} label: {\n${labelBlock}\n${innerPad}}`;
  return `${pad}HStack(spacing: 2) {\n${primary}\n${innerPad}Menu {\n${menuContent}\n${innerPad}} label: {\n${contentPad}Image(systemName: "chevron.down")\n${innerPad}}\n${pad}}\n${pad}.frame(minHeight: ${node.minHeight})`;
}

function renderM3eFabMenu(node: ContainerNode, depth: number, context: RenderContext): string {
  const pad = indent(depth);
  const children = node.children.length > 0
    ? node.children.map((child) => renderNode(child, depth + 1, context)).join('\n')
    : `${indent(depth + 1)}Text("メニュー項目を追加")`;
  const label = node.m3eIcon?.trim()
    ? `Label(${quoted(node.label ?? 'FABメニュー')}, systemImage: ${quoted(node.m3eIcon)})`
    : `Text(${quoted(node.label ?? 'FABメニュー')})`;
  return `${pad}Menu {\n${children}\n${pad}} label: {\n${indent(depth + 1)}${label}\n${pad}}`;
}

function renderToggleButtonBody(
  node: Extract<CanvasNode, { kind: 'button' }>,
  depth: number,
  stateName: string,
): string {
  const pad = indent(depth);
  const labelPad = indent(depth + 1);
  const onLabel = node.toggle?.onLabel.trim() || node.label;
  const offSymbol = node.systemName?.trim();
  const onSymbol = node.toggle?.onSystemName?.trim() || offSymbol;
  const symbol = offSymbol || onSymbol;
  const label = m3eButtonLabel(
    node,
    `${stateName} ? ${quoted(onLabel)} : ${quoted(node.label)}`,
    symbol ? `${stateName} ? ${quoted(onSymbol || symbol)} : ${quoted(offSymbol || symbol)}` : undefined,
  );
  const labelBlock = indentBlock(label, depth + 1);
  const role = node.role === 'normal' ? '' : `(role: .${node.role})`;
  return `${pad}Button${role} {\n${labelPad}${stateName}.toggle()\n${pad}} label: {\n${labelBlock}\n${pad}}`;
}

function renderToggleButton(
  node: Extract<CanvasNode, { kind: 'button' }>,
  depth: number,
  stateName: string,
): string {
  const offStyle = node.buttonStyle;
  const onStyle = node.toggle?.onButtonStyle ?? offStyle;
  if (offStyle === onStyle || node.glass) {
    return `${renderToggleButtonBody(node, depth, stateName)}${buttonStyleModifier(offStyle, depth)}`;
  }

  const pad = indent(depth);
  const onBody = `${renderToggleButtonBody(node, depth + 2, stateName)}${buttonStyleModifier(onStyle, depth + 2)}`;
  const offBody = `${renderToggleButtonBody(node, depth + 2, stateName)}${buttonStyleModifier(offStyle, depth + 2)}`;
  return `${pad}Group {\n${indent(depth + 1)}if ${stateName} {\n${onBody}\n${indent(depth + 1)}} else {\n${offBody}\n${indent(depth + 1)}}\n${pad}}`;
}

function renderAlertAction(title: string, role: string | undefined, depth: number): string {
  const roleArgument = role && role !== 'normal' ? `, role: .${role}` : '';
  return `${indent(depth)}Button(${quoted(title)}${roleArgument}) {}`;
}

function renderNodeContent(node: CanvasNode, depth: number, context: RenderContext): string {
  const pad = indent(depth);

  switch (node.kind) {
    case 'text': {
      if (node.m3eKind === 'badge') {
        return node.text.trim()
          ? `${pad}Text(${quoted(node.text)})\n${pad}    .font(.caption2)\n${pad}    .fontWeight(.semibold)\n${pad}    .padding(.horizontal, 4)\n${pad}    .padding(.vertical, 2)\n${pad}    .background(.red, in: Capsule())`
          : `${pad}Circle()\n${pad}    .fill(.red)\n${pad}    .frame(width: 6, height: 6)\n${pad}    .accessibilityHidden(true)`;
      }
      if (node.textStyle && node.textStyle !== 'custom') {
        const weight = node.weight === 'regular' ? '' : `\n${pad}    .fontWeight(.${node.weight})`;
        return `${pad}Text(${quoted(node.text)})\n${pad}    .font(.${node.textStyle})${weight}${fontDesignModifier(node, depth)}${textLayoutModifiers(node, depth)}`;
      }
      const weight = node.weight === 'regular' ? '' : `, weight: .${node.weight}`;
      const design = node.fontDesign && node.fontDesign !== 'default' ? `, design: .${node.fontDesign}` : '';
      return `${pad}Text(${quoted(node.text)})\n${pad}    .font(.system(size: ${node.fontSize}${weight}${design}))${textLayoutModifiers(node, depth)}`;
    }
    case 'button': {
      if (node.m3eKind === 'splitButton') return renderM3eSplitButton(node, depth, context);
      const destination = node.destinationScreenId ? context.viewNames.get(node.destinationScreenId) : undefined;
      if (node.navigationAction === 'back') {
        const label = m3eButtonLabel(node);
        const labelBlock = indentBlock(label, depth + 1);
        const style = !node.glass && node.buttonStyle && node.buttonStyle !== 'automatic'
          ? `\n${pad}.buttonStyle(.${node.buttonStyle})`
          : '';
        return `${pad}Button {\n${pad}    dismiss()\n${pad}} label: {\n${labelBlock}\n${pad}}\n${pad}.frame(minHeight: ${node.minHeight})${style}`;
      }
      if (destination) {
        const label = m3eButtonLabel(node);
        const labelBlock = indentBlock(label, depth + 1);
        const style = !node.glass && node.buttonStyle && node.buttonStyle !== 'automatic'
          ? `\n${pad}.buttonStyle(.${node.buttonStyle})`
          : '';
        return `${pad}NavigationLink {\n${pad}    ${destination}()\n${pad}} label: {\n${labelBlock}\n${pad}}\n${pad}.frame(minHeight: ${node.minHeight})${style}`;
      }
      if (node.toggle) {
        const stateName = context.bindings.get(buttonToggleKey(node))?.name ?? swiftIdentifier(`is_${node.id}`, 'isOn');
        return `${renderToggleButton(node, depth, stateName)}\n${pad}.frame(minHeight: ${node.minHeight})`;
      }
      const role = node.role === 'normal' ? '' : `, role: .${node.role}`;
      const body = node.systemName?.trim()
        ? `${node.role === 'normal' ? `${pad}Button` : `${pad}Button(role: .${node.role})`} {\n${pad}    // Action\n${pad}} label: {\n${indentBlock(m3eButtonLabel(node), depth + 1)}\n${pad}}`
        : `${pad}Button(${quoted(node.label)}${role}) {\n${pad}    // Action\n${pad}}`;
      const style = !node.glass && node.buttonStyle && node.buttonStyle !== 'automatic'
        ? `\n${pad}.buttonStyle(.${node.buttonStyle})`
        : '';
      return `${body}\n${pad}.frame(minHeight: ${node.minHeight})${style}`;
    }
    case 'alert': {
      const binding = context.bindings.get(alertBindingKey(node))?.name ?? swiftIdentifier(`show_${node.id}`, 'showAlert');
      const actions = [
        node.secondaryButton ? renderAlertAction(node.secondaryButton, node.secondaryRole, depth + 1) : '',
        renderAlertAction(node.primaryButton, node.primaryRole, depth + 1),
      ].filter(Boolean).join('\n');
      return `${pad}Button(${quoted(node.label)}) {\n${pad}    ${binding} = true\n${pad}}\n${pad}.frame(minHeight: ${node.minHeight})\n${pad}.alert(${quoted(node.title)}, isPresented: $${binding}) {\n${actions}\n${pad}} message: {\n${pad}    Text(${quoted(node.message)})\n${pad}}`;
    }
    case 'confirmation-dialog': {
      const binding = context.bindings.get(confirmationDialogBindingKey(node))?.name ?? swiftIdentifier(`show_${node.id}`, 'showConfirmationDialog');
      const actions = [
        ...node.options.map((option) => renderAlertAction(option, undefined, depth + 1)),
        ...(node.cancelButton ? [renderAlertAction(node.cancelButton, 'cancel', depth + 1)] : []),
      ].join('\n');
      return `${pad}Button(${quoted(node.label)}) {\n${pad}    ${binding} = true\n${pad}}\n${pad}.frame(minHeight: ${node.minHeight})\n${pad}.confirmationDialog(${quoted(node.title)}, isPresented: $${binding}, titleVisibility: .visible) {\n${actions}\n${pad}} message: {\n${pad}    Text(${quoted(node.message)})\n${pad}}`;
    }
    case 'toggle': {
      const note = node.m3eKind === 'checkbox'
        ? `${pad}// M3E checkboxをSwiftUI Toggleへ変換しています。必要ならToggleStyleを実装してください。\n`
        : node.m3eKind === 'radio'
          ? `${pad}// M3E radioをSwiftUI Toggleへ変換しています。グループ選択は実装側で束ねてください。\n`
          : '';
      return `${note}${pad}Toggle(${quoted(node.label)}, isOn: $${context.bindings.get(bindingKey(node))?.name ?? swiftIdentifier(node.binding, 'isEnabled')})\n${pad}    .frame(minHeight: ${node.minHeight})`;
    }
    case 'textfield':
      return `${pad}TextField(${quoted(node.label)}, text: $${context.bindings.get(bindingKey(node))?.name ?? swiftIdentifier(node.binding, 'value')})\n${pad}    .textFieldStyle(.roundedBorder)\n${pad}    .frame(minHeight: ${node.minHeight})`;
    case 'searchfield': {
      const binding = context.bindings.get(bindingKey(node))?.name ?? swiftIdentifier(node.binding, 'query');
      const prompt = node.prompt.trim() ? `, prompt: Text(${quoted(node.prompt)})` : '';
      return `${pad}TextField(${quoted(node.label)}, text: $${binding}${prompt})\n${pad}    .textFieldStyle(.roundedBorder)\n${pad}    .frame(minHeight: ${node.minHeight})\n${pad}    .accessibilityLabel(${quoted(node.label)})`;
    }
    case 'securefield':
      return `${pad}SecureField(${quoted(node.label)}, text: $${context.bindings.get(bindingKey(node))?.name ?? swiftIdentifier(node.binding, 'password')})\n${pad}    .textFieldStyle(.roundedBorder)\n${pad}    .frame(minHeight: ${node.minHeight})`;
    case 'texteditor':
      return `${pad}TextEditor(text: $${context.bindings.get(bindingKey(node))?.name ?? swiftIdentifier(node.binding, 'notes')})\n${pad}    .frame(minHeight: ${node.minHeight})\n${pad}    .accessibilityLabel(${quoted(node.label)})`;
    case 'picker': {
      const binding = context.bindings.get(bindingKey(node))?.name ?? swiftIdentifier(node.binding, 'selection');
      const options = node.options.map((option) => `${pad}        Text(${quoted(option)}).tag(${quoted(option)})`).join('\n');
      return `${pad}Picker(${quoted(node.label)}, selection: $${binding}) {\n${options}\n${pad}}\n${pad}.frame(minHeight: ${node.minHeight})`;
    }
    case 'colorpicker': {
      const binding = context.bindings.get(bindingKey(node))?.name ?? swiftIdentifier(node.binding, 'tintColor');
      return `${pad}ColorPicker(${quoted(node.label)}, selection: $${binding})\n${pad}    .frame(minHeight: ${node.minHeight})`;
    }
    case 'slider': {
      const binding = context.bindings.get(bindingKey(node))?.name ?? swiftIdentifier(node.binding, 'value');
      return `${pad}Slider(${quoted(node.label)}, value: $${binding}, in: ${node.minimum}...${node.maximum}, step: ${node.step})\n${pad}    .frame(minHeight: ${node.minHeight})`;
    }
    case 'stepper': {
      const binding = context.bindings.get(bindingKey(node))?.name ?? swiftIdentifier(node.binding, 'quantity');
      return `${pad}Stepper(${quoted(node.label)}, value: $${binding}, in: ${node.minimum}...${node.maximum}, step: ${node.step})\n${pad}    .frame(minHeight: ${node.minHeight})`;
    }
    case 'menu': {
      const options = node.options.map((option) => `${pad}    Button(${quoted(option)}) {\n${pad}        // Action\n${pad}    }`).join('\n');
      return `${pad}Menu(${quoted(node.label)}) {\n${options}\n${pad}}\n${pad}.frame(minHeight: ${node.minHeight})`;
    }
    case 'progress': {
      const progress = node.indeterminate
        ? `${pad}ProgressView {\n${pad}    Text(${quoted(node.label)})\n${pad}}`
        : `${pad}ProgressView(value: ${node.value}) {\n${pad}    Text(${quoted(node.label)})\n${pad}}`;
      const style = node.style === 'circular' ? `\n${pad}.progressViewStyle(.circular)` : '';
      const notes = [
        node.wavy ? `${pad}// M3Eの波形指定。標準ProgressViewでは直接表現できないため、必要ならカスタムShapeへ置き換える。` : '',
        node.trackThickness !== undefined ? `${pad}// M3Eのトラック太さ: ${node.trackThickness}pt。標準ProgressViewでは直接指定できない。` : '',
      ].filter(Boolean);
      return `${notes.length > 0 ? `${notes.join('\n')}\n` : ''}${progress}${style}`;
    }
    case 'gauge':
      return `${pad}Gauge(value: ${node.value}, in: ${node.minimum}...${node.maximum}) {\n${pad}    Text(${quoted(node.label)})\n${pad}}\n${pad}.frame(minHeight: ${node.minHeight})`;
    case 'content-unavailable':
      return node.description.trim().length > 0
        ? `${pad}ContentUnavailableView(${quoted(node.title)}, systemImage: ${quoted(node.systemName)}, description: {\n${pad}    Text(${quoted(node.description)})\n${pad}})`
        : `${pad}ContentUnavailableView(${quoted(node.title)}, systemImage: ${quoted(node.systemName)})`;
    case 'navigation-link': {
      const destination = context.viewNames.get(node.destinationScreenId) ?? 'EmptyView';
      if (node.children && node.children.length > 0) {
        const children = node.children.map((child) => renderNode(child, depth + 2, context)).join('\n');
        return `${pad}NavigationLink {\n${pad}    ${destination}()\n${pad}} label: {\n${children}\n${pad}}\n${pad}.frame(minHeight: ${node.minHeight})`;
      }
      return `${pad}NavigationLink(${quoted(node.label)}) {\n${pad}    ${destination}()\n${pad}}\n${pad}.frame(minHeight: ${node.minHeight})`;
    }
    case 'image': {
      const accessibility = node.accessibilityLabel.trim().length > 0
        ? `.accessibilityLabel(${quoted(node.accessibilityLabel)})`
        : '.accessibilityHidden(true)';
      if (node.source === 'remote') {
        return `${pad}AsyncImage(url: URL(string: ${quoted(node.systemName)})) { phase in\n${pad}    switch phase {\n${pad}    case .empty:\n${pad}        ProgressView()\n${pad}    case .success(let image):\n${pad}        image.resizable().scaledToFit()\n${pad}    case .failure:\n${pad}        Image(systemName: "photo")\n${pad}    @unknown default:\n${pad}        EmptyView()\n${pad}    }\n${pad}}\n${pad}    ${accessibility}`;
      }
      const image = node.source === 'asset'
        ? `Image(${quoted(node.systemName)})`
        : `Image(systemName: ${quoted(node.systemName)})`;
      return `${pad}${image}\n${pad}    ${accessibility}`;
    }
    case 'camera':
      return `${pad}Button {\n${pad}    // AVFoundation: AVCaptureSessionをカメラプレビューへ接続する\n${pad}} label: {\n${pad}    Label(${quoted(node.label || 'カメラ')}, systemImage: "camera.fill")\n${pad}}\n${pad}.frame(minHeight: ${node.minHeight})\n${pad}.accessibilityLabel(${quoted(node.label || 'カメラ')})`;
    case 'map':
      return `${pad}Map()\n${pad}    .frame(minHeight: 220)\n${pad}    .accessibilityLabel(${quoted(node.label || '地図')})`;
    case 'label': {
      const accessibility = node.accessibilityLabel.trim().length > 0
        ? `\n${pad}    .accessibilityLabel(${quoted(node.accessibilityLabel)})`
        : '';
      return `${pad}Label(${quoted(node.title)}, systemImage: ${quoted(node.systemName)})${accessibility}`;
    }
    case 'link':
      return `${pad}Link(${quoted(node.label)}, destination: URL(string: ${quoted(node.url)}) ?? URL(fileURLWithPath: "/"))\n${pad}    .frame(minHeight: ${node.minHeight})`;
    case 'datepicker': {
      const binding = context.bindings.get(dateBindingKey(node))?.name ?? swiftIdentifier(node.binding, 'selectedDate');
      return `${pad}DatePicker(${quoted(node.label)}, selection: $${binding}, displayedComponents: .date)\n${pad}    .frame(minHeight: ${node.minHeight})`;
    }
    case 'divider':
      return `${pad}Divider()`;
    case 'spacer':
      return `${pad}Spacer()`;
    case 'navigation-split-view': {
      const selection = node.selectedIndex !== undefined;
      const binding = selection ? context.bindings.get(railSelectionKey(node))?.name : undefined;
      const sidebar = binding
        ? `${indent(depth + 1)}List(selection: $${binding}) {\n${node.children[0]?.kind === 'list'
          ? node.children[0].children.map((child, index) => `${renderNode(child, depth + 2, context)}\n${indent(depth + 2)}.tag(${index})`).join('\n')
          : `${indent(depth + 2)}EmptyView()`}\n${indent(depth + 1)}}`
        : renderNavigationSplitSidebar(node.children[0], depth + 1, context);
      const detailNodes = node.children.slice(1);
      let detail: string;
      if (detailNodes.length === 0) {
        detail = `${indent(depth + 1)}EmptyView()`;
      } else if (detailNodes.length === 1 && detailNodes[0]) {
        detail = renderNode(detailNodes[0], depth + 1, context);
      } else {
        const detailChildren = detailNodes.map((child) => renderNode(child, depth + 2, context)).join('\n');
        detail = `${indent(depth + 1)}VStack {\n${detailChildren}\n${indent(depth + 1)}}`;
      }
      const railNote = node.railExpanded !== undefined || node.railModal !== undefined
        ? `${pad}// Navigation Rail: expanded=${node.railExpanded ?? false}, modal=${node.railModal ?? false}. NavigationSplitViewの適応レイアウトを使用します。\n`
        : '';
      return `${railNote}${pad}NavigationSplitView {\n${sidebar}\n${pad}} detail: {\n${detail}\n${pad}}`;
    }
    case 'vstack':
    case 'hstack':
    case 'lazyvstack':
    case 'lazyhstack':
    case 'zstack':
    case 'glass-container':
    case 'group':
    case 'tabview':
    case 'disclosure-group':
    case 'groupbox':
    case 'lazyvgrid':
    case 'lazyhgrid':
    case 'scrollview':
    case 'list':
    case 'form': {
      const children = node.children.map((child) => renderNode(child, depth + 1, context)).join('\n');
      if (node.kind === 'scrollview') return `${pad}ScrollView {\n${children}\n${pad}}`;
      if (node.kind === 'list') return `${pad}List {\n${children}\n${pad}}`;
      if (node.kind === 'form') return `${pad}Form {\n${children}\n${pad}}`;
      if (node.kind === 'zstack') return `${pad}ZStack {\n${children}\n${pad}}`;
      if (node.kind === 'glass-container') return `${pad}GlassEffectContainer(spacing: ${node.spacing ?? 12}) {\n${children}\n${pad}}`;
      if (node.kind === 'group') return `${pad}Group {\n${children}\n${pad}}`;
      if (node.kind === 'groupbox') {
        const cardContext = cardRenderContext(node, context);
        const cardChildren = node.children.map((child) => renderNode(child, depth + 1, cardContext)).join('\n');
        const groupBox = node.title?.trim()
          ? `${pad}GroupBox(${quoted(node.title)}) {\n${cardChildren}\n${pad}}`
          : `${pad}GroupBox {\n${cardChildren}\n${pad}}`;
        if (!node.isBottomSheet) return groupBox;
        return `${pad}// M3Eのボトムシート表現。画面遷移時は .sheet と presentationDetents を追加する。\n${pad}VStack(spacing: 8) {\n${pad}    Capsule()\n${pad}        .fill(.secondary)\n${pad}        .frame(width: 36, height: 5)\n${pad}        .accessibilityHidden(true)\n${indentBlock(groupBox, 1)}\n${pad}}`;
      }
      if (node.kind === 'lazyvgrid') return `${pad}LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: ${node.columns ?? 2}), spacing: ${node.spacing ?? 12}) {\n${children}\n${pad}}`;
      if (node.kind === 'lazyhgrid') return `${pad}LazyHGrid(rows: Array(repeating: GridItem(.flexible()), count: ${node.rows ?? 2}), spacing: ${node.spacing ?? 12}) {\n${children}\n${pad}}`;
      if (node.kind === 'tabview') {
        const selection = node.selectedIndex !== undefined;
        const tabs = node.children.map((child, index) => renderTabChild(child, index, depth + 1, context, selection)).join('\n');
        const binding = selection ? context.bindings.get(tabSelectionKey(node))?.name : undefined;
        return `${pad}TabView${binding ? `(selection: $${binding})` : ''} {\n${tabs}\n${pad}}`;
      }
      if (node.kind === 'disclosure-group') return `${pad}DisclosureGroup(${quoted(node.title ?? 'Details')}) {\n${children}\n${pad}}`;
      const type = node.kind === 'vstack' ? 'VStack' : node.kind === 'hstack' ? 'HStack' : node.kind === 'lazyvstack' ? 'LazyVStack' : 'LazyHStack';
      const alignment = node.alignment ? `alignment: .${node.alignment}, ` : '';
      return `${pad}${type}(${alignment}spacing: ${node.spacing ?? 0}) {\n${children}\n${pad}}`;
    }
    case 'sheet': {
      const binding = context.bindings.get(sheetBindingKey(node))?.name ?? swiftIdentifier(`show_${node.id}`, 'showSheet');
      const sheetChildren = node.children.length > 0
        ? node.children.map((child) => renderNode(child, depth + 2, context)).join('\n')
        : `${indent(depth + 2)}EmptyView()`;
      return `${pad}Button(${quoted(node.label ?? 'Open sheet')}) {\n${pad}    ${binding} = true\n${pad}}\n${pad}.sheet(isPresented: $${binding}) {\n${sheetChildren}\n${pad}}`;
    }
    case 'section': {
      if (node.m3eKind === 'fabMenu') return renderM3eFabMenu(node, depth, context);
      const children = node.children.map((child) => renderNode(child, depth + 1, context)).join('\n');
      return `${pad}Section(${quoted(node.title ?? 'Section')}) {\n${children}\n${pad}}`;
    }
  }
}

function collectBindings(
  nodes: CanvasNode[],
  result = new Map<string, BindingInfo>(),
  usedNames = new Set<string>(),
): Map<string, BindingInfo> {
  for (const node of nodes) {
    if (node.kind === 'button' && node.toggle && !node.destinationScreenId) {
      const key = buttonToggleKey(node);
      if (!result.has(key)) {
        const base = swiftIdentifier(`is_${node.id}`, 'isOn');
        let name = base;
        let suffix = 2;
        while (usedNames.has(name)) name = `${base}${suffix++}`;
        usedNames.add(name);
        result.set(key, { name, type: 'Bool', initial: String(node.toggle.isOn) });
      }
    }
    if (node.kind === 'alert') {
      const key = alertBindingKey(node);
      if (!result.has(key)) {
        const base = swiftIdentifier(`show_${node.id}`, 'showAlert');
        let name = base;
        let suffix = 2;
        while (usedNames.has(name)) name = `${base}${suffix++}`;
        usedNames.add(name);
        result.set(key, { name, type: 'Bool', initial: 'false' });
      }
    }
    if (node.kind === 'confirmation-dialog') {
      const key = confirmationDialogBindingKey(node);
      if (!result.has(key)) {
        const base = swiftIdentifier(`show_${node.id}`, 'showConfirmationDialog');
        let name = base;
        let suffix = 2;
        while (usedNames.has(name)) name = `${base}${suffix++}`;
        usedNames.add(name);
        result.set(key, { name, type: 'Bool', initial: 'false' });
      }
    }
    if (node.kind === 'toggle' || node.kind === 'textfield' || node.kind === 'searchfield' || node.kind === 'securefield' || node.kind === 'texteditor' || node.kind === 'picker' || node.kind === 'colorpicker' || node.kind === 'slider' || node.kind === 'stepper' || node.kind === 'datepicker') {
      const key = node.kind === 'datepicker' ? dateBindingKey(node) : bindingKey(node);
      if (!result.has(key)) {
        const type = node.kind === 'toggle' ? 'Bool' : node.kind === 'datepicker' ? 'Date' : node.kind === 'colorpicker' ? 'Color' : node.kind === 'slider' || node.kind === 'stepper' ? 'Double' : 'String';
        const initial = node.kind === 'toggle' ? String(node.isOn ?? false) : node.kind === 'datepicker' ? 'Date()' : node.kind === 'colorpicker' ? swiftColorLiteral(node.color) : node.kind === 'picker' ? quoted(node.initialOption ?? node.options[0] ?? '') : node.kind === 'slider' || node.kind === 'stepper' ? String(node.value) : '""';
        const base = swiftIdentifier(node.binding, `value_${swiftIdentifier(node.id, 'node')}`);
        let name = base;
        let suffix = 2;
        while (usedNames.has(name)) name = `${base}${suffix++}`;
        usedNames.add(name);
        result.set(key, { name, type, initial });
      }
    }
    if (node.kind === 'sheet') {
      const key = sheetBindingKey(node);
      if (!result.has(key)) {
        const base = swiftIdentifier(`show_${node.id}`, 'showSheet');
        let name = base;
        let suffix = 2;
        while (usedNames.has(name)) name = `${base}${suffix++}`;
        usedNames.add(name);
        result.set(key, { name, type: 'Bool', initial: 'false' });
      }
    }
    if (node.kind === 'tabview' && node.selectedIndex !== undefined) {
      const key = tabSelectionKey(node);
      if (!result.has(key)) {
        const base = swiftIdentifier(`selected_${node.id}`, 'selectedTab');
        let name = base;
        let suffix = 2;
        while (usedNames.has(name)) name = `${base}${suffix++}`;
        usedNames.add(name);
        result.set(key, { name, type: 'Int', initial: String(node.selectedIndex) });
      }
    }
    if (node.kind === 'navigation-split-view' && node.selectedIndex !== undefined) {
      const key = railSelectionKey(node);
      if (!result.has(key)) {
        const base = swiftIdentifier(`selected_${node.id}`, 'selectedRail');
        let name = base;
        let suffix = 2;
        while (usedNames.has(name)) name = `${base}${suffix++}`;
        usedNames.add(name);
        result.set(key, { name, type: 'Int?', initial: String(node.selectedIndex) });
      }
    }
    if (node.children) collectBindings(node.children, result, usedNames);
  }
  return result;
}

function buildViewNames(screens: CanvasScreen[]): Map<string, string> {
  const viewNames = new Map<string, string>();
  const usedNames = new Set<string>();

  for (const [index, screen] of screens.entries()) {
    const sourceName = /[A-Za-z]/.test(screen.name) ? screen.name : `Screen${index + 1}`;
    const base = swiftIdentifier(`${sourceName}View`, `Screen${index + 1}View`);
    let name = base;
    let suffix = 2;
    while (usedNames.has(name)) name = `${base}${suffix++}`;
    usedNames.add(name);
    viewNames.set(screen.id, name);
  }

  return viewNames;
}

function tabBarSelectionName(screenId: string): string {
  return swiftIdentifier(`selected_tab_${screenId}`, 'selectedTab');
}

function tabBarSelectedIndex(items: ToolbarItem[]): number {
  const selected = items.findIndex((item) => item.selected);
  return selected < 0 ? 0 : selected;
}

function screenBackgroundModifier(background: ScreenBackground | undefined, depth: number): string {
  if (!background || background === 'surface') return '';
  const style = {
    surfaceContainerLow: 'Color(uiColor: .secondarySystemBackground)',
    surfaceContainer: 'Color(uiColor: .tertiarySystemBackground)',
    surfaceContainerHigh: 'Color(uiColor: .tertiarySystemBackground)',
    surfaceContainerHighest: 'Color(uiColor: .secondarySystemBackground)',
    primaryContainer: 'Color.accentColor.opacity(0.16)',
    secondaryContainer: 'Color.accentColor.opacity(0.10)',
    tertiaryContainer: 'Color.orange.opacity(0.10)',
    primary: 'Color.accentColor',
    inverseSurface: 'Color(uiColor: .label)',
  }[background];
  return `\n${indent(depth)}.background(${style}, ignoresSafeAreaEdges: .all)`;
}

function hasBackAction(nodes: CanvasNode[]): boolean {
  return nodes.some((node) => node.navigationAction === 'back' || (node.children ? hasBackAction(node.children) : false));
}

function renderScreen(
  screen: CanvasScreen,
  context: RenderContext,
  isRoot: boolean,
  viewName: string,
  appearance: CanvasDocument['appearance'],
): string {
  const swipeStates = buildSwipeStates(screen, context);
  const tabBarItems = isRoot ? screen.tabBarItems ?? [] : [];
  const tabSelectionName = tabBarItems.length > 0 ? tabBarSelectionName(screen.id) : undefined;
  const stateLines = [
    ...(hasBackAction(screen.root.children) || (screen.toolbarItems ?? []).some((item) => item.navigationAction === 'back')
      ? ['    @Environment(\\.dismiss) private var dismiss']
      : []),
    ...[...context.bindings.values()].map(({ name, type, initial }) => `    @State private var ${name}: ${type} = ${initial}`),
    ...swipeStates.map(({ stateName }) => `    @State private var ${stateName} = false`),
    ...(tabSelectionName ? [`    @State private var ${tabSelectionName}: Int = ${tabBarSelectedIndex(tabBarItems)}`] : []),
  ].join('\n');
  const firstChild = screen.root.children[0];
  const directScrollContainer = screen.root.children.length === 1
    && firstChild !== undefined
    && (firstChild.kind === 'list' || firstChild.kind === 'form' || firstChild.kind === 'scrollview');
  const directSplitContainer = screen.root.children.length === 1
    && firstChild?.kind === 'navigation-split-view';
  const navigationTitle = `        .navigationTitle(${quoted(screen.navigationTitle)})`;
  const titleDisplayMode = screen.navigationTitleDisplayMode && screen.navigationTitleDisplayMode !== 'automatic'
    ? `\n        .navigationBarTitleDisplayMode(.${screen.navigationTitleDisplayMode})`
    : '';
  const toolbar = renderToolbarModifier(screen, context.viewNames);
  let content: string;
  if ((directScrollContainer || directSplitContainer) && firstChild) {
    content = `${renderNode(firstChild, 2, context)}\n${navigationTitle}${titleDisplayMode}${toolbar}`;
  } else {
    const placement = screen.contentPlacement ?? 'top';
    const body = screen.root.children
      .map((node) => renderNode(node, 4, context))
      .join(placement === 'spread' ? `\n${indent(4)}Spacer(minLength: 0)\n` : '\n');
    const placementModifier = placement === 'top'
      ? ''
      : `\n            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .${placement === 'center' ? 'center' : placement === 'bottom' ? 'bottom' : 'top'})`;
    content = `        ScrollView {\n            VStack(alignment: .leading, spacing: ${screen.root.spacing ?? 16}) {\n${body}\n            }${placementModifier}\n            .padding()\n        }\n${navigationTitle}${titleDisplayMode}${toolbar}`;
  }
  const colorScheme = appearance.colorScheme === 'system'
    ? ''
    : `\n        .preferredColorScheme(.${appearance.colorScheme})`;
  const fontDesign = appearance.fontDesign && appearance.fontDesign !== 'default'
    ? `\n        .fontDesign(.${appearance.fontDesign})`
    : '';
  const contentWithSwipe = renderSwipeSupport(content, swipeStates, 2);
  const tabView = tabSelectionName
    ? `${indent(2)}TabView(selection: $${tabSelectionName}) {\n${tabBarItems.map((item, index) => {
        const destination = item.destinationScreenId ? context.viewNames.get(item.destinationScreenId) : viewName;
        const body = destination && destination !== viewName
          ? `${indent(4)}${destination}()`
          : indentBlock(contentWithSwipe, 4);
        const label = item.systemName?.trim()
          ? `Label(${quoted(item.title)}, systemImage: ${quoted(item.systemName)})`
          : `Text(${quoted(item.title)})`;
        return `${indent(3)}NavigationStack {\n${body}\n${indent(3)}}\n${indent(3)}.tabItem {\n${indent(4)}${label}\n${indent(3)}}\n${indent(3)}.tag(${index})`;
      }).join('\n')}\n${indent(2)}}`
    : '';
  const rootBody = isRoot
    ? tabView
      ? `${tabView}\n        .tint(${accentColorLiteral(appearance)})${colorScheme}${fontDesign}${m3eToolbarModifiers(screen)}`
      : directSplitContainer
      ? `${contentWithSwipe}\n        .tint(${accentColorLiteral(appearance)})${colorScheme}${fontDesign}${m3eToolbarModifiers(screen)}`
      : `        NavigationStack {\n${indentBlock(contentWithSwipe, 1)}\n        }\n        .tint(${accentColorLiteral(appearance)})${colorScheme}${fontDesign}${m3eToolbarModifiers(screen)}`
    : contentWithSwipe;
  const background = screenBackgroundModifier(screen.background, 2);

  return `struct ${viewName}: View {\n${stateLines ? `${stateLines}\n\n` : ''}    var body: some View {\n${rootBody}${background}\n    }\n}`;
}

function hasNodeKind(nodes: CanvasNode[], kind: CanvasNode['kind']): boolean {
  return nodes.some((node) => node.kind === kind || (node.children ? hasNodeKind(node.children, kind) : false));
}

export function generateSwiftUI(document: CanvasDocument): string {
  const screen = document.screens.find((candidate) => candidate.id === document.activeScreenId) ?? document.screens[0];
  if (!screen) return '';

  const viewNames = buildViewNames(document.screens);
  const views = document.screens.map((candidate) => {
    const bindings = collectBindings(candidate.root.children);
    const viewName = viewNames.get(candidate.id) ?? 'ContentView';
    return renderScreen(candidate, { bindings, viewNames }, candidate.id === screen.id, viewName, document.appearance);
  }).join('\n\n');

  const imports = [
    'import Foundation',
    'import SwiftUI',
    ...(hasNodeKind(document.screens.flatMap((candidate) => candidate.root.children), 'map') ? ['import MapKit'] : []),
    ...(document.screens.some((candidate) => candidate.background && candidate.background !== 'surface') ? ['import UIKit'] : []),
  ].join('\n');
  return `${imports}\n\n${views}\n`;
}
