import { describe, expect, it } from 'vitest';
import { defaultDocument } from '../lib/defaultDocument';
import { parseCanvasDocument } from '../lib/document';

describe('project document parsing', () => {
  it('accepts a valid exported document without unknown fields', () => {
    const parsed = parseCanvasDocument(structuredClone(defaultDocument));

    expect(parsed).toEqual(defaultDocument);
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
});
