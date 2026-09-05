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

  it('flags empty sections and oversized fixed controls', () => {
    const document = structuredClone(defaultDocument);
    const section = { id: 'section-test', kind: 'section' as const, title: 'Settings', children: [] };
    const button = document.screens[0]?.root.children.find((node) => node.kind === 'button');
    if (!button || button.kind !== 'button') throw new Error('Fixture button missing');
    button.minHeight = 120;
    document.screens[0]?.root.children.push(section);

    expect(lintDocument(document)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ nodeId: section.id, code: 'EMPTY_SECTION' }),
        expect.objectContaining({ nodeId: button.id, code: 'FIXED_HEIGHT' }),
      ]),
    );
  });

  it('flags a screen with no navigation title', () => {
    const document = structuredClone(defaultDocument);
    const screen = document.screens[0];
    if (!screen) throw new Error('Fixture screen missing');
    screen.navigationTitle = '  ';

    expect(lintDocument(document)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ nodeId: screen.root.id, code: 'NAVIGATION_STRUCTURE' }),
      ]),
    );
  });

  it('flags an image with no SF Symbol name', () => {
    const document = structuredClone(defaultDocument);
    document.screens[0]?.root.children.push({
      id: 'image-test',
      kind: 'image',
      systemName: '  ',
      accessibilityLabel: 'Image',
    });

    expect(lintDocument(document)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ nodeId: 'image-test', code: 'ACCESSIBILITY' }),
      ]),
    );
  });
});
