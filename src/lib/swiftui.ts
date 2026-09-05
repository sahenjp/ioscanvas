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
]);

function swiftIdentifier(value: string, fallback: string): string {
  let identifier = value.trim().replace(/[^A-Za-z0-9_]/g, '');
  if (!identifier) identifier = fallback;
  if (!/^[A-Za-z_]/.test(identifier) || swiftKeywords.has(identifier)) {
    identifier = `_${identifier}`;
  }
  return identifier;
}

function bindingIdentifier(node: Extract<CanvasNode, { kind: 'toggle' | 'textfield' }>): string {
  const fallback = `value_${swiftIdentifier(node.id, 'node')}`;
  return swiftIdentifier(node.binding, fallback);
}

function renderNode(node: CanvasNode, depth: number): string {
  const pad = indent(depth);

  switch (node.kind) {
    case 'text': {
      const weight = node.weight === 'regular' ? '' : `\n${pad}    .fontWeight(.${node.weight})`;
      return `${pad}Text(${quoted(node.text)})\n${pad}    .font(.system(size: ${node.fontSize}))${weight}`;
    }
    case 'button': {
      const role = node.role === 'normal' ? '' : `, role: .${node.role}`;
      return `${pad}Button(${quoted(node.label)}${role}) {\n${pad}    // Action\n${pad}}\n${pad}.frame(minHeight: ${node.minHeight})`;
    }
    case 'toggle':
      return `${pad}Toggle(${quoted(node.label)}, isOn: $${bindingIdentifier(node)})\n${pad}    .frame(minHeight: ${node.minHeight})`;
    case 'textfield':
      return `${pad}TextField(${quoted(node.label)}, text: $${bindingIdentifier(node)})\n${pad}    .textFieldStyle(.roundedBorder)\n${pad}    .frame(minHeight: ${node.minHeight})`;
    case 'divider':
      return `${pad}Divider()`;
    case 'spacer':
      return `${pad}Spacer()`;
    case 'vstack':
    case 'hstack': {
      const type = node.kind === 'vstack' ? 'VStack' : 'HStack';
      const children = node.children.map((child) => renderNode(child, depth + 1)).join('\n');
      return `${pad}${type}(spacing: ${node.spacing ?? 0}) {\n${children}\n${pad}}`;
    }
    case 'section': {
      const children = node.children.map((child) => renderNode(child, depth + 1)).join('\n');
      return `${pad}Section(${quoted(node.title ?? 'Section')}) {\n${children}\n${pad}}`;
    }
  }
}

function collectBindings(nodes: CanvasNode[], result = new Map<string, 'Bool' | 'String'>()): Map<string, 'Bool' | 'String'> {
  for (const node of nodes) {
    if (node.kind === 'toggle') result.set(bindingIdentifier(node), 'Bool');
    if (node.kind === 'textfield') result.set(bindingIdentifier(node), 'String');
    if (node.children) collectBindings(node.children, result);
  }
  return result;
}

export function generateSwiftUI(document: CanvasDocument): string {
  const screen = document.screens.find((candidate) => candidate.id === document.activeScreenId) ?? document.screens[0];
  if (!screen) return '';

  const bindings = collectBindings(screen.root.children);
  const stateLines = [...bindings.entries()]
    .map(([name, type]) => `    @State private var ${name}: ${type} = ${type === 'Bool' ? 'false' : '\"\"'}`)
    .join('\n');
  const body = screen.root.children.map((node) => renderNode(node, 4)).join('\n');
  const viewName = swiftIdentifier(`${screen.name}View`, 'ContentView');

  return `import SwiftUI\n\nstruct ${viewName}: View {\n${stateLines ? `${stateLines}\n\n` : ''}    var body: some View {\n        NavigationStack {\n            ScrollView {\n                VStack(alignment: .leading, spacing: ${screen.root.spacing ?? 16}) {\n${body}\n                }\n                .padding()\n            }\n            .navigationTitle(${quoted(screen.navigationTitle)})\n        }\n    }\n}\n`;
}
