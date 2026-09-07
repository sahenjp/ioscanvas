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
    expect(output).toContain('.font(.system(size: 28, weight: .semibold))');
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

  it('exports SF Symbols with an accessibility label', () => {
    const document = structuredClone(defaultDocument);
    const screen = document.screens[0];
    if (!screen) throw new Error('Fixture screen missing');
    screen.root.children.push({
      id: 'image-test',
      kind: 'image',
      systemName: 'person.crop.circle',
      accessibilityLabel: 'Profile',
    });

    const output = generateSwiftUI(document);

    expect(output).toContain('Image(systemName: "person.crop.circle")');
    expect(output).toContain('.accessibilityLabel("Profile")');
    expect(output).not.toContain('..accessibilityLabel');
  });

  it('exports Liquid Glass using iOS 26 SwiftUI APIs', () => {
    const document = structuredClone(defaultDocument);
    const screen = document.screens[0];
    if (!screen) throw new Error('Fixture screen missing');
    const text = screen.root.children.find((node) => node.kind === 'text');
    const button = screen.root.children.find((node) => node.kind === 'button');
    if (!text || text.kind !== 'text' || !button || button.kind !== 'button') throw new Error('Fixture nodes missing');
    text.glass = 'clear';
    button.glass = 'regular';

    const output = generateSwiftUI(document);

    expect(output).toContain('.glassEffect(.clear)');
    expect(output).toContain('.buttonStyle(.glass)');
  });

  it('exports the document appearance on the root navigation stack', () => {
    const document = structuredClone(defaultDocument);
    document.appearance = { colorScheme: 'dark', accentColor: 'purple' };

    const output = generateSwiftUI(document);

    expect(output).toContain('.tint(.purple)');
    expect(output).toContain('.preferredColorScheme(.dark)');
  });

  it('exports native list containers and links between screens', () => {
    const document = structuredClone(defaultDocument);
    const home = document.screens[0];
    if (!home) throw new Error('Home screen missing');
    document.screens = [home];
    document.screens.push({
      id: 'screen-details',
      name: 'Details',
      navigationTitle: 'Details',
      root: { id: 'root-details', kind: 'vstack', spacing: 16, children: [] },
    });
    home.root.children.push({
      id: 'settings-list',
      kind: 'list',
      children: [{
        id: 'settings-link',
        kind: 'navigation-link',
        label: 'Details',
        destinationScreenId: 'screen-details',
        minHeight: 44,
      }],
    });

    const output = generateSwiftUI(document);

    expect(output).toContain('List {');
    expect(output).toContain('NavigationLink("Details")');
    expect(output).toContain('DetailsView()');
    expect(output).toContain('struct DetailsView: View');
  });
});
