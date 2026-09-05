import { describe, expect, it } from 'vitest';
import { defaultDocument } from '../lib/defaultDocument';
import { generateSwiftUI } from '../lib/swiftui';

describe('SwiftUI generator', () => {
  it('generates a NavigationStack and the initial content', () => {
    const output = generateSwiftUI(defaultDocument);
    expect(output).toContain('NavigationStack');
    expect(output).toContain('Build with structure.');
    expect(output).toContain('Button("Continue")');
    expect(output).toContain('.navigationTitle("Home")');
  });

  it('keeps generated Swift identifiers valid and Dynamic Type-aware', () => {
    const document = structuredClone(defaultDocument);
    const screen = document.screens[0];
    if (!screen) throw new Error('Fixture screen missing');
    screen.name = '123 Login';
    screen.root.children.push(
      { id: 'toggle-test', kind: 'toggle', label: 'Enabled', binding: 'class', minHeight: 44 },
      { id: 'field-test', kind: 'textfield', label: 'Name', binding: '1 user-name', minHeight: 44 },
    );

    const output = generateSwiftUI(document);

    expect(output).toContain('struct _123_LoginView: View');
    expect(output).toContain('@State private var _class: Bool = false');
    expect(output).toContain('@State private var _1_user_name: String = ""');
    expect(output).toContain('isOn: $_class');
    expect(output).toContain('text: $_1_user_name');
    expect(output).toContain('relativeTo: .body');
  });

  it('keeps Boolean and String bindings separate when names collide', () => {
    const document = structuredClone(defaultDocument);
    const screen = document.screens[0];
    if (!screen) throw new Error('Fixture screen missing');
    screen.root.children.push(
      { id: 'toggle-shared', kind: 'toggle', label: 'Enabled', binding: 'shared', minHeight: 44 },
      { id: 'field-shared', kind: 'textfield', label: 'Name', binding: 'shared', minHeight: 44 },
    );

    const output = generateSwiftUI(document);

    expect(output).toContain('@State private var shared: Bool = false');
    expect(output).toContain('@State private var shared2: String = ""');
    expect(output).toContain('isOn: $shared');
    expect(output).toContain('text: $shared2');
  });
});
