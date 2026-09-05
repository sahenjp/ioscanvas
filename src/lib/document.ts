import { isContainerNode } from './nodes';
import type { CanvasDocument, CanvasNode, CanvasScreen, GlassStyle, NodeKind } from '../types/document';

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

function isOneOf<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === 'string' && values.includes(value as T);
}

function readGlass(value: unknown): GlassStyle | null | undefined {
  if (value === undefined) return undefined;
  return isOneOf(value, ['regular', 'clear']) ? value : null;
}

function readNode(value: unknown, ids: Set<string>): CanvasNode | null {
  if (!isRecord(value) || !isString(value.id) || !isString(value.kind) || ids.has(value.id)) return null;
  ids.add(value.id);
  const glass = readGlass(value.glass);
  if (glass === null) return null;
  const glassProperties = glass === undefined ? {} : { glass };

  switch (value.kind as NodeKind) {
    case 'text':
      return isString(value.text) && isNumber(value.fontSize) && isOneOf(value.weight, ['regular', 'medium', 'semibold', 'bold'])
        ? { id: value.id, kind: 'text', text: value.text, fontSize: value.fontSize, weight: value.weight, ...glassProperties }
        : null;
    case 'button':
      return isString(value.label) && isOneOf(value.role, ['normal', 'destructive', 'cancel']) && isNumber(value.minHeight)
        ? { id: value.id, kind: 'button', label: value.label, role: value.role, minHeight: value.minHeight, ...glassProperties }
        : null;
    case 'toggle':
      return isString(value.label) && isString(value.binding) && isNumber(value.minHeight)
        ? { id: value.id, kind: 'toggle', label: value.label, binding: value.binding, minHeight: value.minHeight, ...glassProperties }
        : null;
    case 'textfield':
      return isString(value.label) && isString(value.binding) && isNumber(value.minHeight)
        ? { id: value.id, kind: 'textfield', label: value.label, binding: value.binding, minHeight: value.minHeight, ...glassProperties }
        : null;
    case 'navigation-link':
      return isString(value.label) && isString(value.destinationScreenId) && isNumber(value.minHeight)
        ? { id: value.id, kind: 'navigation-link', label: value.label, destinationScreenId: value.destinationScreenId, minHeight: value.minHeight, ...glassProperties }
        : null;
    case 'image':
      return isString(value.systemName) && isString(value.accessibilityLabel)
        ? { id: value.id, kind: 'image', systemName: value.systemName, accessibilityLabel: value.accessibilityLabel, ...glassProperties }
        : null;
    case 'divider':
      return { id: value.id, kind: 'divider', ...glassProperties };
    case 'spacer':
      return { id: value.id, kind: 'spacer', ...glassProperties };
    case 'vstack':
    case 'hstack':
    case 'list':
    case 'form':
    case 'section': {
      if (!Array.isArray(value.children)) return null;
      if (value.spacing !== undefined && (!isNumber(value.spacing) || value.spacing < 0)) return null;
      if (value.title !== undefined && !isString(value.title)) return null;
      const children = value.children.map((child) => readNode(child, ids));
      if (children.some((child): child is null => child === null)) return null;
      return {
        id: value.id,
        kind: value.kind,
        ...glassProperties,
        ...(value.spacing === undefined ? {} : { spacing: value.spacing }),
        ...(value.title === undefined ? {} : { title: value.title }),
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
  const root = readNode(value.root, ids);
  return root && isContainerNode(root)
    ? { id: value.id, name: value.name, navigationTitle: value.navigationTitle, root }
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

  const ids = new Set<string>();
  const screens = value.screens.map((screen) => readScreen(screen, ids));
  if (screens.some((screen): screen is null => screen === null)) return null;
  if (!screens.some((screen) => screen?.id === value.activeScreenId)) return null;

  return {
    version: 1,
    name: value.name,
    platform: 'iOS',
    minimumOS: '26.0',
    activeScreenId: value.activeScreenId,
    screens: screens as CanvasScreen[],
  };
}
