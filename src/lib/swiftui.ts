import type { CanvasDocument, CanvasNode } from '../types/document';

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

function bindingKey(node: Extract<CanvasNode, { kind: 'toggle' | 'textfield' }>): string {
  return `${node.kind === 'toggle' ? 'Bool' : 'String'}:${node.binding}`;
}

function swiftIdentifier(value: string, fallback: string): string {
  const normalized = value.trim().replace(/[^A-Za-z0-9_]/g, '_') || fallback;
  const identifier = /^\d/.test(normalized) ? `_${normalized}` : normalized;
  return swiftKeywords.has(identifier) ? `_${identifier}` : identifier;
}

function renderNode(node: CanvasNode, depth: number, bindings: Map<string, BindingInfo>): string {
  const rendered = renderNodeContent(node, depth, bindings);
  if (!node.glass) return rendered;

  const pad = indent(depth);
  const modifier = node.kind === 'button' && node.glass === 'regular'
    ? '.buttonStyle(.glass)'
    : `.glassEffect(.${node.glass})`;
  return `${rendered}\n${pad}${modifier}`;
}

function renderNodeContent(node: CanvasNode, depth: number, bindings: Map<string, BindingInfo>): string {
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
      return `${pad}Toggle(${quoted(node.label)}, isOn: $${bindings.get(bindingKey(node))?.name ?? swiftIdentifier(node.binding, 'isEnabled')})\n${pad}    .frame(minHeight: ${node.minHeight})`;
    case 'textfield':
      return `${pad}TextField(${quoted(node.label)}, text: $${bindings.get(bindingKey(node))?.name ?? swiftIdentifier(node.binding, 'value')})\n${pad}    .textFieldStyle(.roundedBorder)\n${pad}    .frame(minHeight: ${node.minHeight})`;
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
    case 'hstack': {
      const type = node.kind === 'vstack' ? 'VStack' : 'HStack';
      const children = node.children.map((child) => renderNode(child, depth + 1, bindings)).join('\n');
      return `${pad}${type}(spacing: ${node.spacing ?? 0}) {\n${children}\n${pad}}`;
    }
    case 'section': {
      const children = node.children.map((child) => renderNode(child, depth + 1, bindings)).join('\n');
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

export function generateSwiftUI(document: CanvasDocument): string {
  const screen = document.screens.find((candidate) => candidate.id === document.activeScreenId) ?? document.screens[0];
  if (!screen) return '';

  const bindings = collectBindings(screen.root.children);
  const stateLines = [...bindings.values()]
    .map(({ name, type }) => `    @State private var ${name}: ${type} = ${type === 'Bool' ? 'false' : '""'}`)
    .join('\n');
  const body = screen.root.children.map((node) => renderNode(node, 4, bindings)).join('\n');
  const viewName = swiftIdentifier(`${screen.name}View`, 'ContentView');

  return `import SwiftUI\n\nstruct ${viewName}: View {\n${stateLines ? `${stateLines}\n\n` : ''}    var body: some View {\n        NavigationStack {\n            ScrollView {\n                VStack(alignment: .leading, spacing: ${screen.root.spacing ?? 16}) {\n${body}\n                }\n                .padding()\n            }\n            .navigationTitle(${quoted(screen.navigationTitle)})\n        }\n    }\n}\n`;
}
