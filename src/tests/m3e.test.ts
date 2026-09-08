import { describe, expect, it } from 'vitest';
import { findNode } from '../lib/nodes';
import { convertM3eDocument, isM3eDocument } from '../lib/m3e';
import { generateSwiftUI } from '../lib/swiftui';

const m3eDocument = {
  title: 'レシピ',
  paletteKey: 'teal',
  theme: { dark: true, font: 'robotoSerif' },
  frames: [
    { id: 'home', name: 'ホーム', x: 0, y: 0, note: '一覧画面' },
    { id: 'detail', name: '詳細', x: 492, y: 0, swipe: { right: 'home' } },
  ],
  groups: [
    {
      id: 'home-bar',
      x: 0,
      y: 0,
      axis: 'x',
      items: [{ id: 'bar', kind: 'topAppBar', label: 'ホーム', icon: 'line.3.horizontal', icon2: 'gearshape.fill', variant: 'filled' }],
    },
    {
      id: 'home-list',
      x: 16,
      y: 120,
      axis: 'y',
      items: [{ id: 'recipe', kind: 'listItem', label: 'スープ', supporting: '30分', icon: 'fork.knife', variant: 'filled', action: { to: 'detail', transition: 'slide' } }],
    },
    {
      id: 'detail-body',
      x: 492,
      y: 120,
      axis: 'y',
      items: [{ id: 'detail-text', kind: 'text', label: '材料', size: 28, bold: true, icon: null, variant: 'filled' }],
    },
  ],
};

describe('M3E compatibility importer', () => {
  it('recognizes and converts M3E screen groups into a semantic iOS document', () => {
    expect(isM3eDocument(m3eDocument)).toBe(true);

    const document = convertM3eDocument(m3eDocument);

    expect(document).not.toBeNull();
    if (!document) throw new Error('M3E document was not converted');
    expect(document).toMatchObject({
      name: 'レシピ',
      appearance: { colorScheme: 'dark', accentColor: 'custom', accentHex: '#14b8a6', fontDesign: 'serif' },
    });
    const home = document?.screens[0];
    expect(home).toMatchObject({ name: 'ホーム', navigationTitle: 'ホーム', notes: '一覧画面' });
    expect(home?.toolbarItems).toEqual(expect.arrayContaining([
      expect.objectContaining({ placement: 'topBarLeading', systemName: 'line.3.horizontal' }),
      expect.objectContaining({ placement: 'topBarTrailing', systemName: 'gearshape.fill' }),
    ]));

    const detail = document?.screens[1];
    const recipeRow = home ? findNode(home.root.children, 'm3e-row-recipe') : undefined;
    expect(recipeRow).toMatchObject({
      kind: 'navigation-link',
      destinationScreenId: detail?.id,
      notes: expect.stringContaining('タップで'),
      children: [expect.objectContaining({ kind: 'hstack' })],
    });
    expect(generateSwiftUI(document)).toContain('NavigationLink {');

    expect(detail?.swipe).toEqual({ right: home?.id });
  });

  it('rejects values that are not M3E project documents', () => {
    expect(isM3eDocument({ screens: [] })).toBe(false);
    expect(convertM3eDocument({ frames: [], groups: [] })).toBeNull();
  });
});
