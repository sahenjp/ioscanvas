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
});
