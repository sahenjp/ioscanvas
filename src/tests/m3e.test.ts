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
    {
      id: 'home-nav',
      x: 0,
      y: 788,
      axis: 'x',
      items: [{
        id: 'nav',
        kind: 'bottomNav',
        label: '',
        icon: null,
        variant: 'filled',
        tabs: [{ icon: 'home', label: 'ホーム' }, { icon: 'arrow_forward', label: '詳細' }],
        actions: { 'tab:1': { to: 'detail', transition: 'fade' } },
      }],
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
    const detail = document?.screens[1];
    expect(home).toMatchObject({ name: 'ホーム', navigationTitle: 'ホーム', notes: '一覧画面' });
    expect(home?.toolbarItems).toEqual(expect.arrayContaining([
      expect.objectContaining({ placement: 'topBarLeading', systemName: 'line.3.horizontal' }),
      expect.objectContaining({ placement: 'topBarTrailing', systemName: 'gearshape.fill' }),
      expect.objectContaining({ placement: 'bottomBar', title: '詳細', destinationScreenId: detail?.id }),
    ]));

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

  it('keeps a toggle button valid when its M3E action also names a destination', () => {
    const document = convertM3eDocument({
      frames: [{ id: 'home', name: 'ホーム', x: 0, y: 0 }, { id: 'next', name: '次', x: 492, y: 0 }],
      groups: [{
        id: 'controls',
        x: 16,
        y: 80,
        axis: 'y',
        items: [{ id: 'favorite', kind: 'button', label: 'お気に入り', icon: 'favorite', variant: 'filled', checked: false, action: { to: 'next', transition: 'slide' } }],
      }],
    });

    expect(document).not.toBeNull();
    expect(document?.screens[0]?.root.children[0]).toMatchObject({ kind: 'button', toggle: { isOn: false } });
  });

  it('preserves checked state for native toggle controls', () => {
    const document = convertM3eDocument({
      frames: [{ id: 'home', name: 'ホーム', x: 0, y: 0 }],
      groups: [{
        id: 'settings',
        x: 16,
        y: 80,
        axis: 'y',
        items: [{ id: 'notifications', kind: 'switch', label: '通知', icon: null, variant: 'filled', checked: true }],
      }],
    });

    expect(document?.screens[0]?.root.children[0]).toMatchObject({ kind: 'toggle', isOn: true });
    if (!document) throw new Error('M3E document was not converted');
    expect(generateSwiftUI(document)).toContain('@State private var is_notifications: Bool = true');
  });

  it('preserves selected options and indeterminate progress states', () => {
    const document = convertM3eDocument({
      frames: [{ id: 'home', name: 'ホーム', x: 0, y: 0 }],
      groups: [{
        id: 'controls',
        x: 16,
        y: 80,
        axis: 'y',
        items: [
          { id: 'sort', kind: 'select', label: '並び順', icon: null, variant: 'filled', selected: 1, tabs: [{ label: '新しい順' }, { label: '古い順' }] },
          { id: 'loading', kind: 'loadingIndicator', label: '読み込み中', icon: null, variant: 'filled' },
          { id: 'wave', kind: 'linearProgress', label: '同期', icon: null, variant: 'filled', value: 72, wavy: true, trackThickness: 8 },
          { id: 'ring', kind: 'circularProgress', label: '処理', icon: null, variant: 'filled', value: 0.25, trackThickness: 6 },
          { id: 'custom-text', kind: 'text', label: '細かな見出し', size: 19, icon: null, variant: 'filled' },
        ],
      }],
    });

    const nodes = document?.screens[0]?.root.children ?? [];
    expect(findNode(nodes, 'm3e-sort')).toMatchObject({ kind: 'picker', initialOption: '古い順' });
    expect(findNode(nodes, 'm3e-loading')).toMatchObject({ kind: 'progress', indeterminate: true });
    expect(findNode(nodes, 'm3e-wave')).toMatchObject({ kind: 'progress', style: 'linear', value: 0.72, wavy: true, trackThickness: 8 });
    expect(findNode(nodes, 'm3e-ring')).toMatchObject({ kind: 'progress', style: 'circular', value: 0.25, trackThickness: 6 });
    expect(findNode(nodes, 'm3e-custom-text')).toMatchObject({ kind: 'text', textStyle: 'custom', fontSize: 19 });
    if (!document) throw new Error('M3E document was not converted');
    const output = generateSwiftUI(document);
    expect(output).toContain('@State private var selection_sort: String = "古い順"');
    expect(output).toContain('ProgressView {');
    expect(output).toContain('.progressViewStyle(.circular)');
    expect(output).toContain('M3Eの波形指定');
  });

  it('preserves the initial selected tab in Preview and generated SwiftUI', () => {
    const document = convertM3eDocument({
      frames: [{ id: 'home', name: 'ホーム', x: 0, y: 0 }],
      groups: [{
        id: 'tabs-group',
        x: 16,
        y: 80,
        axis: 'y',
        items: [{
          id: 'tabs',
          kind: 'tabs',
          label: '',
          icon: null,
          variant: 'filled',
          selected: 1,
          tabs: [{ label: '概要', icon: 'home' }, { label: '詳細', icon: 'info' }],
        }],
      }],
    });

    const nodes = document?.screens[0]?.root.children ?? [];
    expect(findNode(nodes, 'm3e-tabview-tabs')).toMatchObject({ kind: 'tabview', selectedIndex: 1 });
    if (!document) throw new Error('M3E document was not converted');
    const output = generateSwiftUI(document);
    expect(output).toContain('@State private var selected_m3e_tabview_tabs: Int = 1');
    expect(output).toContain('TabView(selection: $selected_m3e_tabview_tabs)');
    expect(output).toContain('.tag(1)');
  });

  it('maps M3E box and card presentation state to SwiftUI structure', () => {
    const document = convertM3eDocument({
      frames: [{ id: 'home', name: 'ホーム', x: 0, y: 0 }],
      groups: [{
        id: 'content',
        x: 16,
        y: 80,
        axis: 'y',
        items: [
          { id: 'sheet', kind: 'box', label: 'メニュー', icon: null, variant: 'filled', checked: true },
          { id: 'card', kind: 'card', label: 'おすすめ', supporting: '説明', icon: 'star', variant: 'filled', imagePos: 'leading', contentAlign: 'center', imageSize: 96, noImage: false },
        ],
      }],
    });

    const nodes = document?.screens[0]?.root.children ?? [];
    expect(findNode(nodes, 'm3e-sheet')).toMatchObject({ kind: 'groupbox', isBottomSheet: true });
    expect(findNode(nodes, 'm3e-card')).toMatchObject({ kind: 'groupbox', cardImagePosition: 'leading', cardImageSize: 96, cardContentAlignment: 'center' });
    if (!document) throw new Error('M3E document was not converted');
    const output = generateSwiftUI(document);
    expect(output).toContain('Capsule()');
    expect(output).toContain('M3Eのボトムシート表現');
    const card = findNode(nodes, 'm3e-card');
    if (!card) throw new Error('Card fixture missing');
    expect(card.children?.[0]).toMatchObject({ kind: 'hstack' });
  });
});
