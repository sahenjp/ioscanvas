import { isContainerNode } from './nodes';
import type { AccentColor, AppearanceAccentColor, BackgroundStyle, ButtonStyle, ButtonToggle, CanvasDocument, CanvasNode, CanvasScreen, CardContentAlignment, CardImagePosition, ColorScheme, ContentPlacement, FontDesign, FrameWidth, GlassShape, GlassStyle, ImageSource, M3eAction, M3eItemMetadata, M3ePresentationKind, M3eTab, M3eTextColor, M3eToggleAppearance, M3eVariant, NavigationTitleDisplayMode, NavigationTransition, NodeKind, ProgressStyle, ScreenBackground, ScreenDevice, ScreenOrientation, ShadowStyle, StackAlignment, SwipeDirection, TextAlignment, TextStyle, ToolbarItem, ToolbarPlacement } from '../types/document';

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonNegativeNumber(value: unknown): value is number {
  return isNumber(value) && value >= 0;
}

function isHexColor(value: unknown): value is string {
  return isString(value) && /^#[0-9a-f]{6}$/i.test(value);
}

function isOneOf<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === 'string' && values.includes(value as T);
}

function readGlass(value: unknown): GlassStyle | null | undefined {
  if (value === undefined) return undefined;
  return isOneOf(value, ['regular', 'clear', 'prominent']) ? value : null;
}

function readButtonToggle(value: unknown): ButtonToggle | null | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value) || typeof value.isOn !== 'boolean' || !isString(value.onLabel)) return null;
  if (value.onSystemName !== undefined && !isString(value.onSystemName)) return null;
  if (value.onButtonStyle !== undefined && !isOneOf(value.onButtonStyle, ['automatic', 'plain', 'bordered', 'borderedProminent'])) return null;
  return {
    isOn: value.isOn,
    onLabel: value.onLabel,
    ...(value.onSystemName === undefined ? {} : { onSystemName: value.onSystemName }),
    ...(value.onButtonStyle === undefined ? {} : { onButtonStyle: value.onButtonStyle as ButtonStyle }),
  };
}

function readNavigationTransition(value: unknown): NavigationTransition | null | undefined {
  if (value === undefined) return undefined;
  return isOneOf(value, ['slide', 'slideLeft', 'slideUp', 'slideDown', 'fade', 'expand', 'none']) ? value : null;
}

function readM3eKind(value: unknown): M3ePresentationKind | null | undefined {
  if (value === undefined) return undefined;
  return isOneOf(value, [
    'box', 'button', 'iconButton', 'fab', 'extendedFab', 'chip', 'topAppBar', 'bottomNav', 'navRail', 'searchBar',
    'card', 'listItem', 'dialog', 'snackbar', 'textField', 'select', 'switch', 'checkbox', 'slider', 'text', 'image',
    'camera', 'map', 'divider', 'loadingIndicator', 'linearProgress', 'circularProgress', 'splitButton', 'fabMenu',
    'toolbar', 'tabs', 'radio', 'badge',
  ]) ? value : null;
}

function readM3eVariant(value: unknown): M3eVariant | null | undefined {
  if (value === undefined) return undefined;
  return isOneOf(value, ['filled', 'tonal', 'elevated', 'outlined', 'text']) ? value : null;
}

function readM3eAction(value: unknown): M3eAction | null | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value) || !isString(value.to) || !isOneOf(value.transition, ['slide', 'slideLeft', 'slideUp', 'slideDown', 'fade', 'expand', 'none'])) return null;
  return { to: value.to, transition: value.transition as NavigationTransition };
}

function readM3eMetadata(value: unknown): M3eItemMetadata | null | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) return null;

  const metadata: M3eItemMetadata = {};
  const copyNumber = (key: 'size' | 'size2' | 'minimum' | 'maximum' | 'step' | 'value' | 'radiusTop' | 'radiusBottom' | 'imageSize'): boolean => {
    if (value[key] === undefined) return true;
    if (!isNonNegativeNumber(value[key])) return false;
    metadata[key] = value[key];
    return true;
  };
  for (const key of ['size', 'size2', 'minimum', 'maximum', 'step', 'value', 'radiusTop', 'radiusBottom', 'imageSize'] as const) {
    if (!copyNumber(key)) return null;
  }

  if (value.supporting !== undefined && !isString(value.supporting)) return null;
  if (value.icon !== undefined && value.icon !== null && !isString(value.icon)) return null;
  if (value.icon2 !== undefined && value.icon2 !== null && !isString(value.icon2)) return null;
  if (value.src !== undefined && !isString(value.src)) return null;
  if (value.bold !== undefined && typeof value.bold !== 'boolean') return null;
  if (value.note !== undefined && !isString(value.note)) return null;
  if (value.noteHistory !== undefined && (!Array.isArray(value.noteHistory) || value.noteHistory.some((entry) => !isString(entry)))) return null;
  if (value.selected !== undefined && (!isNumber(value.selected) || !Number.isInteger(value.selected) || value.selected < 0)) return null;
  if (value.checked !== undefined && typeof value.checked !== 'boolean') return null;
  if (value.switch !== undefined && typeof value.switch !== 'boolean') return null;
  if (value.noCheck !== undefined && typeof value.noCheck !== 'boolean') return null;
  if (value.noImage !== undefined && typeof value.noImage !== 'boolean') return null;
  if (value.wavy !== undefined && typeof value.wavy !== 'boolean') return null;
  if (value.contained !== undefined && typeof value.contained !== 'boolean') return null;
  if (value.railExpanded !== undefined && typeof value.railExpanded !== 'boolean') return null;
  if (value.railModal !== undefined && typeof value.railModal !== 'boolean') return null;
  if (value.railExpansionSide !== undefined && !isOneOf(value.railExpansionSide, ['left', 'right'])) return null;
  if (value.trackThickness !== undefined && (!isNumber(value.trackThickness) || !Number.isInteger(value.trackThickness) || value.trackThickness < 2 || value.trackThickness > 16)) return null;
  if (value.imagePos !== undefined && !isOneOf(value.imagePos, ['top', 'leading', 'trailing', 'background'])) return null;
  if (value.contentAlign !== undefined && !isOneOf(value.contentAlign, ['start', 'center', 'end'])) return null;
  if (value.textColor !== undefined && !isOneOf(value.textColor, ['primary', 'secondary', 'onSurface', 'onSurfaceVariant', 'onPrimaryContainer', 'onSecondaryContainer', 'onTertiaryContainer', 'inverseOnSurface'])) return null;
  if (value.fill !== undefined && !isOneOf(value.fill, ['surface', 'surfaceContainerLow', 'surfaceContainer', 'surfaceContainerHigh', 'surfaceContainerHighest', 'primaryContainer', 'secondaryContainer', 'tertiaryContainer', 'primary', 'inverseSurface'])) return null;
  if (value.iconFill !== undefined && value.iconFill !== 'none' && !isOneOf(value.iconFill, ['surface', 'surfaceContainerLow', 'surfaceContainer', 'surfaceContainerHigh', 'surfaceContainerHighest', 'primaryContainer', 'secondaryContainer', 'tertiaryContainer', 'primary', 'inverseSurface'])) return null;

  if (value.corners !== undefined) {
    const corners = value.corners;
    if (!isRecord(corners) || !['tl', 'tr', 'bl', 'br'].every((key) => isNonNegativeNumber(corners[key]))) return null;
    metadata.corners = {
      tl: corners.tl as number,
      tr: corners.tr as number,
      bl: corners.bl as number,
      br: corners.br as number,
    };
  }

  if (value.tabs !== undefined) {
    if (!Array.isArray(value.tabs)) return null;
    const tabs: M3eTab[] = [];
    for (const tab of value.tabs) {
      if (!isRecord(tab) || !isString(tab.label) || (tab.icon !== undefined && tab.icon !== null && !isString(tab.icon))) return null;
      tabs.push({ label: tab.label, icon: tab.icon === undefined ? null : tab.icon });
    }
    metadata.tabs = tabs;
  }

  const action = readM3eAction(value.action);
  if (action === null) return null;
  if (action !== undefined) metadata.action = action;
  if (value.actions !== undefined) {
    if (!isRecord(value.actions)) return null;
    const actions: Record<string, M3eAction> = {};
    for (const [slot, rawAction] of Object.entries(value.actions)) {
      const parsedAction = readM3eAction(rawAction);
      if (!parsedAction) return null;
      actions[slot] = parsedAction;
    }
    metadata.actions = actions;
  }

  if (value.toggle !== undefined) {
    if (!isRecord(value.toggle)
      || (value.toggle.icon !== undefined && value.toggle.icon !== null && !isString(value.toggle.icon))
      || (value.toggle.variant !== undefined && !isOneOf(value.toggle.variant, ['filled', 'tonal', 'elevated', 'outlined', 'text']))
      || (value.toggle.label !== undefined && !isString(value.toggle.label))) return null;
    const toggle: M3eToggleAppearance = {
      ...(value.toggle.icon === undefined ? {} : { icon: value.toggle.icon as string | null }),
      ...(value.toggle.variant === undefined ? {} : { variant: value.toggle.variant as M3eVariant }),
      ...(value.toggle.label === undefined ? {} : { label: value.toggle.label }),
    };
    metadata.toggle = toggle;
  }

  Object.assign(metadata, {
    ...(value.supporting === undefined ? {} : { supporting: value.supporting }),
    ...(value.icon === undefined ? {} : { icon: value.icon as string | null }),
    ...(value.icon2 === undefined ? {} : { icon2: value.icon2 }),
    ...(value.bold === undefined ? {} : { bold: value.bold }),
    ...(value.note === undefined ? {} : { note: value.note }),
    ...(value.selected === undefined ? {} : { selected: value.selected }),
    ...(value.checked === undefined ? {} : { checked: value.checked }),
    ...(value.switch === undefined ? {} : { switch: value.switch }),
    ...(value.noCheck === undefined ? {} : { noCheck: value.noCheck }),
    ...(value.noImage === undefined ? {} : { noImage: value.noImage }),
    ...(value.imagePos === undefined ? {} : { imagePos: value.imagePos }),
    ...(value.contentAlign === undefined ? {} : { contentAlign: value.contentAlign }),
    ...(value.textColor === undefined ? {} : { textColor: value.textColor as M3eTextColor }),
    ...(value.fill === undefined ? {} : { fill: value.fill as ScreenBackground }),
    ...(value.iconFill === undefined ? {} : { iconFill: value.iconFill as ScreenBackground | 'none' }),
    ...(value.src === undefined ? {} : { src: value.src }),
    ...(value.wavy === undefined ? {} : { wavy: value.wavy }),
    ...(value.trackThickness === undefined ? {} : { trackThickness: value.trackThickness }),
    ...(value.contained === undefined ? {} : { contained: value.contained }),
    ...(value.railExpanded === undefined ? {} : { railExpanded: value.railExpanded }),
    ...(value.railModal === undefined ? {} : { railModal: value.railModal }),
    ...(value.railExpansionSide === undefined ? {} : { railExpansionSide: value.railExpansionSide }),
    ...(value.noteHistory === undefined ? {} : { noteHistory: value.noteHistory }),
  });
  return Object.keys(metadata).length > 0 ? metadata : {};
}

function readNodeProperties(value: RecordValue): {
  tabTitle?: string;
  tabSystemName?: string;
  notes?: string;
  glass?: GlassStyle;
  glassInteractive?: boolean;
  glassTint?: AccentColor;
  glassShape?: GlassShape;
  padding?: number;
  frameWidth?: FrameWidth;
  background?: BackgroundStyle;
  cornerRadius?: number;
  overlay?: boolean;
  shadow?: ShadowStyle;
  navigationAction?: 'back';
  navigationTransition?: NavigationTransition;
  m3eKind?: M3ePresentationKind;
  m3eVariant?: M3eVariant;
  m3eIcon?: string;
  m3eMetadata?: M3eItemMetadata;
} | null {
  const glass = readGlass(value.glass);
  if (glass === null) return null;
  if (value.tabTitle !== undefined && !isString(value.tabTitle)) return null;
  if (value.tabSystemName !== undefined && !isString(value.tabSystemName)) return null;
  if (value.notes !== undefined && !isString(value.notes)) return null;
  if (value.glassInteractive !== undefined && typeof value.glassInteractive !== 'boolean') return null;
  if (value.glassTint !== undefined && !isOneOf(value.glassTint, ['blue', 'purple', 'pink', 'orange', 'green'])) return null;
  if (value.glassShape !== undefined && !isOneOf(value.glassShape, ['automatic', 'capsule', 'rounded', 'circle'])) return null;
  if (value.padding !== undefined && (!isNumber(value.padding) || value.padding < 0 || value.padding > 128)) return null;
  if (value.frameWidth !== undefined && !isOneOf(value.frameWidth, ['fit', 'max'])) return null;
  if (value.background !== undefined && !isOneOf(value.background, ['none', 'secondary', 'tertiary', 'accent', 'material'])) return null;
  if (value.cornerRadius !== undefined && (!isNumber(value.cornerRadius) || value.cornerRadius < 0 || value.cornerRadius > 64)) return null;
  if (value.overlay !== undefined && typeof value.overlay !== 'boolean') return null;
  if (value.shadow !== undefined && !isOneOf(value.shadow, ['none', 'subtle', 'medium'])) return null;
  if (value.navigationAction !== undefined && value.navigationAction !== 'back') return null;
  const navigationTransition = readNavigationTransition(value.navigationTransition);
  if (navigationTransition === null) return null;
  const m3eKind = readM3eKind(value.m3eKind);
  if (m3eKind === null) return null;
  const m3eVariant = readM3eVariant(value.m3eVariant);
  if (m3eVariant === null) return null;
  if (value.m3eIcon !== undefined && !isString(value.m3eIcon)) return null;
  const m3eMetadata = readM3eMetadata(value.m3eMetadata);
  if (m3eMetadata === null) return null;

  return {
    ...(value.tabTitle === undefined ? {} : { tabTitle: value.tabTitle }),
    ...(value.tabSystemName === undefined ? {} : { tabSystemName: value.tabSystemName }),
    ...(value.notes === undefined ? {} : { notes: value.notes }),
    ...(glass === undefined ? {} : { glass }),
    ...(value.glassInteractive === undefined ? {} : { glassInteractive: value.glassInteractive }),
    ...(value.glassTint === undefined ? {} : { glassTint: value.glassTint as AccentColor }),
    ...(value.glassShape === undefined ? {} : { glassShape: value.glassShape as GlassShape }),
    ...(value.padding === undefined ? {} : { padding: value.padding }),
    ...(value.frameWidth === undefined ? {} : { frameWidth: value.frameWidth as FrameWidth }),
    ...(value.background === undefined ? {} : { background: value.background as BackgroundStyle }),
    ...(value.cornerRadius === undefined ? {} : { cornerRadius: value.cornerRadius }),
    ...(value.overlay === undefined ? {} : { overlay: value.overlay }),
    ...(value.shadow === undefined ? {} : { shadow: value.shadow as ShadowStyle }),
    ...(value.navigationAction === undefined ? {} : { navigationAction: 'back' as const }),
    ...(navigationTransition === undefined ? {} : { navigationTransition }),
    ...(m3eKind === undefined ? {} : { m3eKind }),
    ...(m3eVariant === undefined ? {} : { m3eVariant }),
    ...(value.m3eIcon === undefined ? {} : { m3eIcon: value.m3eIcon }),
    ...(m3eMetadata === undefined ? {} : { m3eMetadata }),
  };
}

function readToolbarItems(value: unknown, ids: Set<string>): ToolbarItem[] | null | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return null;

  const items: ToolbarItem[] = [];
  for (const item of value) {
    if (!isRecord(item) || !isString(item.id) || !isString(item.title) || !isOneOf(item.placement, ['topBarLeading', 'topBarTrailing', 'bottomBar'])) return null;
    if (ids.has(item.id)) return null;
    if (item.systemName !== undefined && !isString(item.systemName)) return null;
    if (item.m3eIcon !== undefined && item.m3eIcon !== null && !isString(item.m3eIcon)) return null;
    if (item.role !== undefined && !isOneOf(item.role, ['normal', 'destructive', 'cancel'])) return null;
    if (item.selected !== undefined && typeof item.selected !== 'boolean') return null;
    if (item.destinationScreenId !== undefined && !isString(item.destinationScreenId)) return null;
    if (item.navigationAction !== undefined && item.navigationAction !== 'back') return null;
    const navigationTransition = readNavigationTransition(item.navigationTransition);
    if (navigationTransition === null) return null;
    ids.add(item.id);
    items.push({
      id: item.id,
      title: item.title,
      placement: item.placement as ToolbarPlacement,
      ...(item.systemName === undefined ? {} : { systemName: item.systemName }),
      ...(item.m3eIcon === undefined ? {} : { m3eIcon: item.m3eIcon as string | null }),
      ...(item.role === undefined ? {} : { role: item.role }),
      ...(item.selected === undefined ? {} : { selected: item.selected }),
      ...(item.destinationScreenId === undefined ? {} : { destinationScreenId: item.destinationScreenId }),
      ...(item.navigationAction === undefined ? {} : { navigationAction: 'back' as const }),
      ...(navigationTransition === undefined ? {} : { navigationTransition }),
    });
  }
  return items;
}

function readSwipe(value: unknown): Partial<Record<SwipeDirection, string>> | null | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) return null;
  const swipe: Partial<Record<SwipeDirection, string>> = {};
  for (const direction of ['left', 'right', 'up', 'down'] as SwipeDirection[]) {
    const destination = value[direction];
    if (destination !== undefined && !isString(destination)) return null;
    if (destination !== undefined) swipe[direction] = destination;
  }
  return swipe;
}

function readNode(value: unknown, ids: Set<string>): CanvasNode | null {
  if (!isRecord(value) || !isString(value.id) || !isString(value.kind) || ids.has(value.id)) return null;
  ids.add(value.id);
  const nodeProperties = readNodeProperties(value);
  if (!nodeProperties) return null;

  switch (value.kind as NodeKind) {
    case 'text':
      return isString(value.text)
        && isNumber(value.fontSize)
        && value.fontSize > 0
        && isOneOf(value.weight, ['regular', 'medium', 'semibold', 'bold'])
        && (value.textStyle === undefined || isOneOf(value.textStyle, ['custom', 'largeTitle', 'title', 'title2', 'title3', 'headline', 'body', 'callout', 'subheadline', 'footnote', 'caption', 'caption2']))
        && (value.fontDesign === undefined || isOneOf(value.fontDesign, ['default', 'rounded', 'serif', 'monospaced']))
        && (value.textAlignment === undefined || isOneOf(value.textAlignment, ['leading', 'center', 'trailing']))
        && (value.lineLimit === undefined || (isNumber(value.lineLimit) && Number.isInteger(value.lineLimit) && value.lineLimit >= 1 && value.lineLimit <= 20))
        ? { id: value.id, kind: 'text', text: value.text, fontSize: value.fontSize, weight: value.weight, ...(value.textStyle === undefined ? {} : { textStyle: value.textStyle as TextStyle }), ...(value.fontDesign === undefined ? {} : { fontDesign: value.fontDesign as FontDesign }), ...(value.textAlignment === undefined ? {} : { textAlignment: value.textAlignment as TextAlignment }), ...(value.lineLimit === undefined ? {} : { lineLimit: value.lineLimit }), ...nodeProperties }
        : null;
    case 'button': {
      const toggle = readButtonToggle(value.toggle);
      const hasDestination = isString(value.destinationScreenId) && value.destinationScreenId.trim().length > 0;
      return isString(value.label)
        && (value.accessibilityLabel === undefined || isString(value.accessibilityLabel))
        && (value.systemName === undefined || isString(value.systemName))
        && (value.destinationScreenId === undefined || isString(value.destinationScreenId))
        && isOneOf(value.role, ['normal', 'destructive', 'cancel'])
        && (value.buttonStyle === undefined || isOneOf(value.buttonStyle, ['automatic', 'plain', 'bordered', 'borderedProminent']))
        && toggle !== null
        && !(hasDestination && toggle !== undefined)
        && isNonNegativeNumber(value.minHeight)
        ? { id: value.id, kind: 'button', label: value.label, role: value.role, minHeight: value.minHeight, ...(value.accessibilityLabel === undefined ? {} : { accessibilityLabel: value.accessibilityLabel }), ...(value.systemName === undefined ? {} : { systemName: value.systemName }), ...(value.destinationScreenId === undefined ? {} : { destinationScreenId: value.destinationScreenId }), ...(value.buttonStyle === undefined ? {} : { buttonStyle: value.buttonStyle as ButtonStyle }), ...(toggle === undefined ? {} : { toggle }), ...nodeProperties }
        : null;
    }
    case 'alert':
      return isString(value.label)
        && isString(value.title)
        && isString(value.message)
        && isString(value.primaryButton)
        && isOneOf(value.primaryRole, ['normal', 'destructive', 'cancel'])
        && (value.secondaryButton === undefined || isString(value.secondaryButton))
        && (value.secondaryRole === undefined || isOneOf(value.secondaryRole, ['normal', 'destructive', 'cancel']))
        && (value.secondaryButton !== undefined || value.secondaryRole === undefined)
        && isNonNegativeNumber(value.minHeight)
        ? {
            id: value.id,
            kind: 'alert',
            label: value.label,
            title: value.title,
            message: value.message,
            primaryButton: value.primaryButton,
            primaryRole: value.primaryRole,
            minHeight: value.minHeight,
            ...(value.secondaryButton === undefined ? {} : { secondaryButton: value.secondaryButton }),
            ...(value.secondaryRole === undefined ? {} : { secondaryRole: value.secondaryRole }),
            ...nodeProperties,
          }
        : null;
    case 'confirmation-dialog':
      return isString(value.label)
        && isString(value.title)
        && isString(value.message)
        && Array.isArray(value.options)
        && value.options.length > 0
        && value.options.every(isString)
        && (value.cancelButton === undefined || isString(value.cancelButton))
        && isNonNegativeNumber(value.minHeight)
        ? {
            id: value.id,
            kind: 'confirmation-dialog',
            label: value.label,
            title: value.title,
            message: value.message,
            options: value.options,
            ...(value.cancelButton === undefined ? {} : { cancelButton: value.cancelButton }),
            minHeight: value.minHeight,
            ...nodeProperties,
          }
        : null;
    case 'toggle':
      return isString(value.label) && isString(value.binding) && (value.isOn === undefined || typeof value.isOn === 'boolean') && isNonNegativeNumber(value.minHeight)
        ? { id: value.id, kind: 'toggle', label: value.label, binding: value.binding, ...(value.isOn === undefined ? {} : { isOn: value.isOn }), minHeight: value.minHeight, ...nodeProperties }
        : null;
    case 'textfield':
      return isString(value.label) && isString(value.binding) && isNonNegativeNumber(value.minHeight)
        ? { id: value.id, kind: 'textfield', label: value.label, binding: value.binding, minHeight: value.minHeight, ...nodeProperties }
        : null;
    case 'searchfield':
      return isString(value.label) && isString(value.binding) && isString(value.prompt) && isNonNegativeNumber(value.minHeight)
        ? { id: value.id, kind: 'searchfield', label: value.label, binding: value.binding, prompt: value.prompt, minHeight: value.minHeight, ...nodeProperties }
        : null;
    case 'securefield':
      return isString(value.label) && isString(value.binding) && isNonNegativeNumber(value.minHeight)
        ? { id: value.id, kind: 'securefield', label: value.label, binding: value.binding, minHeight: value.minHeight, ...nodeProperties }
        : null;
    case 'texteditor':
      return isString(value.label) && isString(value.binding) && isNonNegativeNumber(value.minHeight)
        ? { id: value.id, kind: 'texteditor', label: value.label, binding: value.binding, minHeight: value.minHeight, ...nodeProperties }
        : null;
    case 'picker':
      return isString(value.label)
        && isString(value.binding)
        && Array.isArray(value.options)
        && value.options.length > 0
        && value.options.every(isString)
        && (value.initialOption === undefined || (isString(value.initialOption) && value.options.includes(value.initialOption)))
        && isNonNegativeNumber(value.minHeight)
        ? { id: value.id, kind: 'picker', label: value.label, binding: value.binding, options: value.options, ...(value.initialOption === undefined ? {} : { initialOption: value.initialOption }), minHeight: value.minHeight, ...nodeProperties }
        : null;
    case 'colorpicker':
      return isString(value.label)
        && isString(value.binding)
        && isString(value.color)
        && /^#[0-9a-f]{6}$/i.test(value.color)
        && isNonNegativeNumber(value.minHeight)
        ? { id: value.id, kind: 'colorpicker', label: value.label, binding: value.binding, color: value.color, minHeight: value.minHeight, ...nodeProperties }
        : null;
    case 'slider':
    case 'stepper':
      return isString(value.label)
        && isString(value.binding)
        && isNumber(value.value)
        && isNumber(value.minimum)
        && isNumber(value.maximum)
        && isNumber(value.step)
        && value.minimum < value.maximum
        && value.step > 0
        && value.step <= value.maximum - value.minimum
        && value.value >= value.minimum
        && value.value <= value.maximum
        && isNonNegativeNumber(value.minHeight)
        ? { id: value.id, kind: value.kind, label: value.label, binding: value.binding, value: value.value, minimum: value.minimum, maximum: value.maximum, step: value.step, minHeight: value.minHeight, ...nodeProperties } as CanvasNode
        : null;
    case 'menu':
      return isString(value.label)
        && Array.isArray(value.options)
        && value.options.length > 0
        && value.options.every(isString)
        && isNonNegativeNumber(value.minHeight)
        ? { id: value.id, kind: 'menu', label: value.label, options: value.options, minHeight: value.minHeight, ...nodeProperties }
        : null;
    case 'progress':
      return isString(value.label) && isNumber(value.value) && value.value >= 0 && value.value <= 1
        && (value.style === undefined || isOneOf(value.style, ['linear', 'circular']))
        && (value.indeterminate === undefined || typeof value.indeterminate === 'boolean')
        && (value.wavy === undefined || typeof value.wavy === 'boolean')
        && (value.trackThickness === undefined || (isNumber(value.trackThickness) && Number.isInteger(value.trackThickness) && value.trackThickness >= 2 && value.trackThickness <= 16))
        ? { id: value.id, kind: 'progress', label: value.label, value: value.value, ...(value.style === undefined ? {} : { style: value.style as ProgressStyle }), ...(value.indeterminate === undefined ? {} : { indeterminate: value.indeterminate }), ...(value.wavy === undefined ? {} : { wavy: value.wavy }), ...(value.trackThickness === undefined ? {} : { trackThickness: value.trackThickness }), ...nodeProperties }
        : null;
    case 'gauge':
      return isString(value.label)
        && isNumber(value.value)
        && isNumber(value.minimum)
        && isNumber(value.maximum)
        && value.minimum < value.maximum
        && value.value >= value.minimum
        && value.value <= value.maximum
        && isNonNegativeNumber(value.minHeight)
        ? { id: value.id, kind: 'gauge', label: value.label, value: value.value, minimum: value.minimum, maximum: value.maximum, minHeight: value.minHeight, ...nodeProperties }
        : null;
    case 'content-unavailable':
      return isString(value.title) && isString(value.systemName) && isString(value.description)
        ? { id: value.id, kind: 'content-unavailable', title: value.title, systemName: value.systemName, description: value.description, ...nodeProperties }
        : null;
    case 'navigation-link': {
      if (!isString(value.label) || !isString(value.destinationScreenId) || !isNonNegativeNumber(value.minHeight)) return null;
      if (value.children !== undefined && !Array.isArray(value.children)) return null;
      const children = value.children === undefined ? undefined : value.children.map((child) => readNode(child, ids));
      if (children?.some((child): child is null => child === null)) return null;
      return {
        id: value.id,
        kind: 'navigation-link',
        label: value.label,
        destinationScreenId: value.destinationScreenId,
        minHeight: value.minHeight,
        ...(children === undefined ? {} : { children: children as CanvasNode[] }),
        ...nodeProperties,
      };
    }
    case 'label':
      return isString(value.title) && isString(value.systemName) && isString(value.accessibilityLabel)
        ? { id: value.id, kind: 'label', title: value.title, systemName: value.systemName, accessibilityLabel: value.accessibilityLabel, ...nodeProperties }
        : null;
    case 'link':
      return isString(value.label) && isString(value.url) && isNonNegativeNumber(value.minHeight)
        ? { id: value.id, kind: 'link', label: value.label, url: value.url, minHeight: value.minHeight, ...nodeProperties }
        : null;
    case 'datepicker':
      return isString(value.label) && isString(value.binding) && isNonNegativeNumber(value.minHeight)
        ? { id: value.id, kind: 'datepicker', label: value.label, binding: value.binding, minHeight: value.minHeight, ...nodeProperties }
        : null;
    case 'image':
      return isString(value.systemName)
        && isString(value.accessibilityLabel)
        && (value.source === undefined || isOneOf(value.source, ['symbol', 'asset', 'remote']))
        ? { id: value.id, kind: 'image', systemName: value.systemName, accessibilityLabel: value.accessibilityLabel, ...(value.source === undefined ? {} : { source: value.source as ImageSource }), ...nodeProperties }
        : null;
    case 'camera':
      return isString(value.label) && isNonNegativeNumber(value.minHeight)
        ? { id: value.id, kind: 'camera', label: value.label, minHeight: value.minHeight, ...nodeProperties }
        : null;
    case 'map':
      return isString(value.label)
        ? { id: value.id, kind: 'map', label: value.label, ...nodeProperties }
        : null;
    case 'divider':
      return { id: value.id, kind: 'divider', ...nodeProperties };
    case 'spacer':
      return { id: value.id, kind: 'spacer', ...nodeProperties };
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
    case 'lazyvgrid':
    case 'lazyhgrid':
    case 'scrollview':
    case 'list':
    case 'form':
    case 'section': {
      if (!Array.isArray(value.children)) return null;
      if (value.spacing !== undefined && (!isNumber(value.spacing) || value.spacing < 0)) return null;
      if (value.title !== undefined && !isString(value.title)) return null;
      if (value.label !== undefined && !isString(value.label)) return null;
      if (value.columns !== undefined && (!isNumber(value.columns) || !Number.isInteger(value.columns) || value.columns < 1 || value.columns > 8)) return null;
      if (value.kind === 'lazyvgrid' && value.columns === undefined) return null;
      if (value.rows !== undefined && (!isNumber(value.rows) || !Number.isInteger(value.rows) || value.rows < 1 || value.rows > 8)) return null;
      if (value.kind === 'lazyhgrid' && value.rows === undefined) return null;
      const selectionLength = value.kind === 'navigation-split-view'
        && isRecord(value.children[0])
        && Array.isArray(value.children[0].children)
        ? value.children[0].children.length
        : value.children.length;
      if (value.selectedIndex !== undefined && (!isNumber(value.selectedIndex) || !Number.isInteger(value.selectedIndex) || value.selectedIndex < 0 || value.selectedIndex >= selectionLength)) return null;
      if (value.railExpanded !== undefined && typeof value.railExpanded !== 'boolean') return null;
      if (value.railModal !== undefined && typeof value.railModal !== 'boolean') return null;
      if (value.isBottomSheet !== undefined && typeof value.isBottomSheet !== 'boolean') return null;
      if (value.cardImagePosition !== undefined && !isOneOf(value.cardImagePosition, ['top', 'leading', 'trailing', 'background'])) return null;
      if (value.cardImageSize !== undefined && (!isNumber(value.cardImageSize) || value.cardImageSize < 1 || value.cardImageSize > 1024)) return null;
      if (value.cardContentAlignment !== undefined && !isOneOf(value.cardContentAlignment, ['start', 'center', 'end'])) return null;
      if (value.cardNoImage !== undefined && typeof value.cardNoImage !== 'boolean') return null;
      if (value.alignment !== undefined && !isString(value.alignment)) return null;
      const validAlignment = value.kind === 'vstack' || value.kind === 'lazyvstack'
        ? value.alignment === undefined || isOneOf(value.alignment, ['leading', 'center', 'trailing'])
        : value.kind === 'hstack' || value.kind === 'lazyhstack'
          ? value.alignment === undefined || isOneOf(value.alignment, ['top', 'center', 'bottom'])
          : value.alignment === undefined;
      if (!validAlignment) return null;
      const children = value.children.map((child) => readNode(child, ids));
      if (children.some((child): child is null => child === null)) return null;
      return {
        id: value.id,
        kind: value.kind,
        ...nodeProperties,
        ...(value.label === undefined ? {} : { label: value.label }),
        ...(value.spacing === undefined ? {} : { spacing: value.spacing }),
        ...(value.alignment === undefined ? {} : { alignment: value.alignment as StackAlignment }),
        ...(value.title === undefined ? {} : { title: value.title }),
        ...(value.columns === undefined ? {} : { columns: value.columns }),
        ...(value.rows === undefined ? {} : { rows: value.rows }),
        ...(value.selectedIndex === undefined ? {} : { selectedIndex: value.selectedIndex }),
        ...(value.railExpanded === undefined ? {} : { railExpanded: value.railExpanded }),
        ...(value.railModal === undefined ? {} : { railModal: value.railModal }),
        ...(value.isBottomSheet === undefined ? {} : { isBottomSheet: value.isBottomSheet }),
        ...(value.cardImagePosition === undefined ? {} : { cardImagePosition: value.cardImagePosition as CardImagePosition }),
        ...(value.cardImageSize === undefined ? {} : { cardImageSize: value.cardImageSize }),
        ...(value.cardContentAlignment === undefined ? {} : { cardContentAlignment: value.cardContentAlignment as CardContentAlignment }),
        ...(value.cardNoImage === undefined ? {} : { cardNoImage: value.cardNoImage }),
        children: children as CanvasNode[],
      } as CanvasNode;
    }
    default:
      return null;
  }
}

function readScreen(value: unknown, ids: Set<string>): CanvasScreen | null {
  if (!isRecord(value) || !isString(value.id) || !isString(value.name) || !isString(value.navigationTitle)) return null;
  if (ids.has(value.id)) return null;
  ids.add(value.id);
  if (value.notes !== undefined && !isString(value.notes)) return null;
  if (value.navigationTitleDisplayMode !== undefined && !isOneOf(value.navigationTitleDisplayMode, ['automatic', 'inline', 'large'])) return null;
  if (value.contentPlacement !== undefined && !isOneOf(value.contentPlacement, ['top', 'center', 'bottom', 'spread'])) return null;
  if (value.background !== undefined && !isOneOf(value.background, ['surface', 'surfaceContainerLow', 'surfaceContainer', 'surfaceContainerHigh', 'surfaceContainerHighest', 'primaryContainer', 'secondaryContainer', 'tertiaryContainer', 'primary', 'inverseSurface'])) return null;
  if (value.previewDevice !== undefined && !isOneOf(value.previewDevice, ['iphone-se', 'iphone-16', 'ipad-mini', 'ipad-pro-11'])) return null;
  if (value.previewOrientation !== undefined && !isOneOf(value.previewOrientation, ['portrait', 'landscape'])) return null;
  const toolbarItems = readToolbarItems(value.toolbarItems, ids);
  if (toolbarItems === null) return null;
  const tabBarItems = readToolbarItems(value.tabBarItems, ids);
  if (tabBarItems === null || tabBarItems?.some((item) => item.placement !== 'bottomBar')) return null;
  const m3eTopAppBar = readM3eMetadata(value.m3eTopAppBar);
  if (m3eTopAppBar === null) return null;
  const m3eBottomNav = readM3eMetadata(value.m3eBottomNav);
  if (m3eBottomNav === null) return null;
  const swipe = readSwipe(value.swipe);
  if (swipe === null) return null;
  const root = readNode(value.root, ids);
  return root && isContainerNode(root)
    ? {
        id: value.id,
        name: value.name,
        navigationTitle: value.navigationTitle,
        ...(value.notes === undefined ? {} : { notes: value.notes }),
        ...(value.navigationTitleDisplayMode === undefined ? {} : { navigationTitleDisplayMode: value.navigationTitleDisplayMode as NavigationTitleDisplayMode }),
        ...(value.contentPlacement === undefined ? {} : { contentPlacement: value.contentPlacement as ContentPlacement }),
        ...(value.background === undefined ? {} : { background: value.background as ScreenBackground }),
        ...(value.previewDevice === undefined ? {} : { previewDevice: value.previewDevice as ScreenDevice }),
        ...(value.previewOrientation === undefined ? {} : { previewOrientation: value.previewOrientation as ScreenOrientation }),
        ...(toolbarItems === undefined ? {} : { toolbarItems }),
        ...(tabBarItems === undefined ? {} : { tabBarItems }),
        ...(m3eTopAppBar === undefined ? {} : { m3eTopAppBar }),
        ...(m3eBottomNav === undefined ? {} : { m3eBottomNav }),
        ...(swipe === undefined ? {} : { swipe }),
        root,
      }
    : null;
}

export function parseCanvasDocument(value: unknown): CanvasDocument | null {
  if (!isRecord(value)
    || value.version !== 1
    || value.platform !== 'iOS'
    || !isString(value.name)
    || value.minimumOS !== '26.0'
    || !isString(value.activeScreenId)
    || !Array.isArray(value.screens)
    || value.screens.length === 0) {
    return null;
  }

  const appearance = value.appearance;
  if (appearance !== undefined && (!isRecord(appearance)
    || !isOneOf(appearance.colorScheme, ['system', 'light', 'dark'])
    || !isOneOf(appearance.accentColor, ['blue', 'purple', 'pink', 'orange', 'green', 'custom'])
    || (appearance.accentHex !== undefined && !isHexColor(appearance.accentHex))
    || (appearance.accentColor === 'custom' && !isHexColor(appearance.accentHex))
    || (appearance.fontDesign !== undefined && !isOneOf(appearance.fontDesign, ['default', 'rounded', 'serif', 'monospaced'])))) {
    return null;
  }

  const ids = new Set<string>();
  const screens = value.screens.map((screen) => readScreen(screen, ids));
  if (screens.some((screen): screen is null => screen === null)) return null;
  const parsedScreens = screens as CanvasScreen[];
  const screenIds = new Set(parsedScreens.map((screen) => screen.id));
  if (parsedScreens.some((screen) => Object.values(screen.swipe ?? {}).some((destination) => !screenIds.has(destination)))) return null;
  if (!parsedScreens.some((screen) => screen.id === value.activeScreenId)) return null;

  return {
    version: 1,
    name: value.name,
    platform: 'iOS',
    minimumOS: '26.0',
    appearance: appearance === undefined
      ? { colorScheme: 'system', accentColor: 'blue' }
      : {
          colorScheme: appearance.colorScheme as ColorScheme,
          accentColor: appearance.accentColor as AppearanceAccentColor,
          ...(appearance.accentHex === undefined ? {} : { accentHex: appearance.accentHex as string }),
          ...(appearance.fontDesign === undefined ? {} : { fontDesign: appearance.fontDesign as FontDesign }),
        },
    activeScreenId: value.activeScreenId,
    screens: parsedScreens,
  };
}
