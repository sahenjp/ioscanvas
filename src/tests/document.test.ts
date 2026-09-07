import { describe, expect, it } from 'vitest';
import { defaultDocument } from '../lib/defaultDocument';
import { parseCanvasDocument } from '../lib/document';

describe('project document parsing', () => {
  it('accepts a valid exported document without unknown fields', () => {
    const document = structuredClone(defaultDocument);
    const text = document.screens[0]?.root.children[0];
    if (!text) throw new Error('Fixture node missing');
    text.glass = 'regular';
    const parsed = parseCanvasDocument(document);

    expect(parsed).toEqual(document);
  });

  it('rejects malformed or duplicate node IDs', () => {
    const document = structuredClone(defaultDocument);
    const first = document.screens[0]?.root.children[0];
    const second = document.screens[0]?.root.children[1];
    if (!first || !second) throw new Error('Fixture nodes missing');
    second.id = first.id;

    expect(parseCanvasDocument(document)).toBeNull();
    expect(parseCanvasDocument({ version: 1 })).toBeNull();
  });

  it('adds default appearance to legacy documents and validates new values', () => {
    const legacy = structuredClone(defaultDocument) as Partial<typeof defaultDocument>;
    delete legacy.appearance;

    expect(parseCanvasDocument(legacy)?.appearance).toEqual({ colorScheme: 'system', accentColor: 'blue' });
    expect(parseCanvasDocument({ ...defaultDocument, appearance: { colorScheme: 'sepia', accentColor: 'blue' } })).toBeNull();
  });

  it('validates picker options and progress values', () => {
    const document = structuredClone(defaultDocument);
    document.screens[0]?.root.children.push(
      { id: 'picker-test', kind: 'picker', label: 'Theme', binding: 'theme', options: ['Light', 'Dark'], minHeight: 44 },
      { id: 'progress-test', kind: 'progress', label: 'Upload', value: 0.75 },
    );

    expect(parseCanvasDocument(document)).toEqual(document);
    const invalid = structuredClone(document);
    const progress = invalid.screens[0]?.root.children.find((node) => node.kind === 'progress');
    if (!progress || progress.kind !== 'progress') throw new Error('Progress fixture missing');
    progress.value = 2;
    expect(parseCanvasDocument(invalid)).toBeNull();
  });
});
