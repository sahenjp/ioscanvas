import type { CanvasDocument, CanvasNode, CanvasScreen } from '../types/document';

const indent = (depth: number) => '    '.repeat(depth);
const quoted = (value: string) => JSON.stringify(value);
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
  type: 'Bool' | 'String';
}

interface RenderContext {
  bindings: Map<string, BindingInfo>;
  viewNames: Map<string, string>;
}

function bindingKey(node: Extract<CanvasNode, { kind: 'toggle' | 'textfield' }>): string {
  return `${node.kind === 'toggle' ? 'Bool' : 'String'}:${node.binding}`;
}

function swiftIdentifier(value: string, fallback: string): string {
  const normalized = value.trim().replace(/[^A-Za-z0-9_]/g, '_') || fallback;
  const identifier = /^\d/.test(normalized) ? `_${normalized}` : normalized;
  return swiftKeywords.has(identifier) ? `_${identifier}` : identifier;
}

function renderNode(node: CanvasNode, depth: number, context: RenderContext): string {
  const rendered = renderNodeContent(node, depth, context);
  if (!node.glass) return rendered;

  const pad = indent(depth);
  const modifier = node.kind === 'button' && node.glass === 'regular'
    ? '.buttonStyle(.glass)'
    : `.glassEffect(.${node.glass})`;
  return `${rendered}\n${pad}${modifier}`;
}

function renderNodeContent(node: CanvasNode, depth: number, context: RenderContext): string {
  const pad = indent(depth);

  switch (node.kind) {
    case 'text': {
      const weight = node.weight === 'regular' ? '' : `, weight: .${node.weight}`;
      return `${pad}Text(${quoted(node.text)})\n${pad}    .font(.system(size: ${node.fontSize}${weight}))`;
    }
    case 'button': {
      const role = node.role === 'normal' ? '' : `, role: .${node.role}`;
      return `${pad}Button(${quoted(node.label)}${role}) {\n${pad}    // Action\n${pad}}\n${pad}.frame(minHeight: ${node.minHeight})`;
    }
    case 'toggle':
      return `${pad}Toggle(${quoted(node.label)}, isOn: $${context.bindings.get(bindingKey(node))?.name ?? swiftIdentifier(node.binding, 'isEnabled')})\n${pad}    .frame(minHeight: ${node.minHeight})`;
    case 'textfield':
      return `${pad}TextField(${quoted(node.label)}, text: $${context.bindings.get(bindingKey(node))?.name ?? swiftIdentifier(node.binding, 'value')})\n${pad}    .textFieldStyle(.roundedBorder)\n${pad}    .frame(minHeight: ${node.minHeight})`;
    case 'navigation-link': {
      const destination = context.viewNames.get(node.destinationScreenId) ?? 'EmptyView';
      return `${pad}NavigationLink(${quoted(node.label)}) {\n${pad}    ${destination}()\n${pad}}\n${pad}.frame(minHeight: ${node.minHeight})`;
    }
    case 'image': {
      const accessibility = node.accessibilityLabel.trim().length > 0
        ? `.accessibilityLabel(${quoted(node.accessibilityLabel)})`
        : '.accessibilityHidden(true)';
      return `${pad}Image(systemName: ${quoted(node.systemName)})\n${pad}    ${accessibility}`;
    }
    case 'divider':
      return `${pad}Divider()`;
    case 'spacer':
      return `${pad}Spacer()`;
    case 'vstack':
    case 'hstack':
    case 'list':
    case 'form': {
      const children = node.children.map((child) => renderNode(child, depth + 1, context)).join('\n');
      if (node.kind === 'list') return `${pad}List {\n${children}\n${pad}}`;
      if (node.kind === 'form') return `${pad}Form {\n${children}\n${pad}}`;
      const type = node.kind === 'vstack' ? 'VStack' : 'HStack';
      return `${pad}${type}(spacing: ${node.spacing ?? 0}) {\n${children}\n${pad}}`;
    }
    case 'section': {
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
    if (node.kind === 'toggle' || node.kind === 'textfield') {
      const key = bindingKey(node);
      if (!result.has(key)) {
        const type = node.kind === 'toggle' ? 'Bool' : 'String';
        const base = swiftIdentifier(node.binding, `value_${swiftIdentifier(node.id, 'node')}`);
        let name = base;
        let suffix = 2;
        while (usedNames.has(name)) name = `${base}${suffix++}`;
        usedNames.add(name);
        result.set(key, { name, type });
      }
    }
    if (node.children) collectBindings(node.children, result, usedNames);
  }
  return result;
}

function buildViewNames(screens: CanvasScreen[]): Map<string, string> {
  const viewNames = new Map<string, string>();
  const usedNames = new Set<string>();

  for (const screen of screens) {
    const base = swiftIdentifier(`${screen.name}View`, 'ContentView');
    let name = base;
    let suffix = 2;
    while (usedNames.has(name)) name = `${base}${suffix++}`;
    usedNames.add(name);
    viewNames.set(screen.id, name);
  }

  return viewNames;
}

function renderScreen(screen: CanvasScreen, context: RenderContext, isRoot: boolean, viewName: string): string {
  const stateLines = [...context.bindings.values()]
    .map(({ name, type }) => `    @State private var ${name}: ${type} = ${type === 'Bool' ? 'false' : '""'}`)
    .join('\n');
  const firstChild = screen.root.children[0];
  const directScrollContainer = screen.root.children.length === 1
    && firstChild !== undefined
    && (firstChild.kind === 'list' || firstChild.kind === 'form');
  let content: string;
  if (directScrollContainer && firstChild) {
    content = `${renderNode(firstChild, 2, context)}\n        .navigationTitle(${quoted(screen.navigationTitle)})`;
  } else {
    const body = screen.root.children.map((node) => renderNode(node, 3, context)).join('\n');
    content = `        ScrollView {\n            VStack(alignment: .leading, spacing: ${screen.root.spacing ?? 16}) {\n${body}\n            }\n            .padding()\n        }\n        .navigationTitle(${quoted(screen.navigationTitle)})`;
  }
  const rootBody = isRoot ? `        NavigationStack {\n${content}\n        }` : content;

  return `struct ${viewName}: View {\n${stateLines ? `${stateLines}\n\n` : ''}    var body: some View {\n${rootBody}\n    }\n}`;
}

export function generateSwiftUI(document: CanvasDocument): string {
  const screen = document.screens.find((candidate) => candidate.id === document.activeScreenId) ?? document.screens[0];
  if (!screen) return '';

  const viewNames = buildViewNames(document.screens);
  const views = document.screens.map((candidate) => {
    const bindings = collectBindings(candidate.root.children);
    const viewName = viewNames.get(candidate.id) ?? 'ContentView';
    return renderScreen(candidate, { bindings, viewNames }, candidate.id === screen.id, viewName);
  }).join('\n\n');

  return `import SwiftUI\n\n${views}\n`;
}
