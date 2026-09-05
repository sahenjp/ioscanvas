import { describe, expect, it } from 'vitest';
import { defaultDocument } from '../lib/defaultDocument';
import { lintDocument } from '../lib/hig';

describe('HIG linter', () => {
  it('flags controls smaller than 44pt', () => {
    const document = structuredClone(defaultDocument);
    const button = document.screens[0]?.root.children.find((node) => node.kind === 'button');
    if (!button || button.kind !== 'button') throw new Error('Fixture button missing');
    button.minHeight = 32;

    expect(lintDocument(document)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ nodeId: button.id, code: 'HIT_TARGET' }),
      ]),
    );
  });

  it('flags text smaller than 11pt', () => {
    const document = structuredClone(defaultDocument);
    const text = document.screens[0]?.root.children.find((node) => node.kind === 'text');
    if (!text || text.kind !== 'text') throw new Error('Fixture text missing');
    text.fontSize = 9;

    expect(lintDocument(document)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ nodeId: text.id, code: 'TEXT_SIZE' }),
      ]),
    );
  });
});
