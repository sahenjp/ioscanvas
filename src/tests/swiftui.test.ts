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

  it('sanitizes state names and keeps text relative to Dynamic Type', () => {
    const document = structuredClone(defaultDocument);
    const toggle = { id: 'toggle-test', kind: 'toggle' as const, label: 'Enabled', binding: '2fa enabled', minHeight: 44 };
    document.screens[0]?.root.children.push(toggle);

    const output = generateSwiftUI(document);

    expect(output).toContain('@State private var _2fa_enabled: Bool = false');
    expect(output).toContain('relativeTo: .body');
    expect(output).toContain('isOn: $_2fa_enabled');
  });
});
