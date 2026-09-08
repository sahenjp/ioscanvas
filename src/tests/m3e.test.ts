import { describe, expect, it } from 'vitest';
import { findNode } from '../lib/nodes';
import { convertM3eDocument, exportM3eDocument, generateM3eJson, inspectM3eCompatibility, inspectM3eExportCompatibility, isM3eDocument } from '../lib/m3e';
import { defaultDocument } from '../lib/defaultDocument';
import { generateSwiftUI } from '../lib/swiftui';
import type { CanvasDocument } from '../types/document';

const m3eDocument = {
  title: 'レシピ',
  paletteKey: 'teal',
  theme: { dark: true, font: 'robotoSerif' },
  frames: [
    { id: 'home', name: 'ホーム', x: 0, y: 0, note: '一覧画面', place: 'center', bg: 'surfaceContainerLow' },
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
  it('exports the semantic iOS document to a readable M3E project and imports it again', () => {
    const exported = exportM3eDocument(defaultDocument);
    const parsedJson: unknown = JSON.parse(generateM3eJson(defaultDocument));

    expect(isM3eDocument(exported)).toBe(true);
    expect(parsedJson).toEqual(exported);
    expect(exported.frames[0]).toMatchObject({ name: 'ホーム', w: 412, h: 892 });
    expect(exported.groups.flatMap((group) => group.items)).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'button', label: '続ける' }),
    ]));

    const roundTripped = convertM3eDocument(exported);
    expect(roundTripped?.screens.map((screen) => screen.name)).toEqual(defaultDocument.screens.map((screen) => screen.name));
    expect(roundTripped?.screens[0]?.previewDevice).toBe('iphone-16');
    expect(roundTripped?.screens[0]?.root.children).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'navigation-link', label: '設定を開く' }),
    ]));
  });

  it('reports lossy decisions made during M3E export', () => {
    const document: CanvasDocument = {
      version: 1,
      name: '互換診断',
      platform: 'iOS',
      minimumOS: '26.0',
      appearance: { colorScheme: 'system', accentColor: 'blue' },
      activeScreenId: 'home',
      screens: [{
        id: 'home',
        name: 'ホーム',
        navigationTitle: 'ホーム',
        previewDevice: 'iphone-se',
        root: {
          id: 'root',
          kind: 'vstack',
          children: [
            { id: 'title', kind: 'text', text: '見出し', fontSize: 28, weight: 'bold' },
            { id: 'password', kind: 'securefield', label: 'パスワード', binding: 'password', minHeight: 44 },
            { id: 'glass', kind: 'glass-container', children: [{ id: 'glass-text', kind: 'text', text: '補足', fontSize: 17, weight: 'regular' }] },
            { id: 'broken-link', kind: 'button', label: '開く', role: 'normal', minHeight: 44, destinationScreenId: 'missing' },
          ],
        },
        swipe: { right: 'missing' },
      }],
    };

    expect(inspectM3eExportCompatibility(document)).toEqual({
      flattenedItemCount: 4,
      unsupportedNodeKinds: ['glass-container', 'vstack'],
      approximatedKinds: ['securefield'],
      unresolvedDestinationCount: 2,
      normalizedScreenCount: 1,
    });
  });

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
    expect(home).toMatchObject({ name: 'ホーム', navigationTitle: 'ホーム', notes: '一覧画面', contentPlacement: 'center', background: 'surfaceContainerLow', previewDevice: 'iphone-16', previewOrientation: 'portrait' });
    expect(home?.toolbarItems).toEqual(expect.arrayContaining([
      expect.objectContaining({ placement: 'topBarLeading', systemName: 'line.3.horizontal' }),
      expect.objectContaining({ placement: 'topBarTrailing', systemName: 'gearshape.fill' }),
    ]));
    expect(home?.tabBarItems).toEqual(expect.arrayContaining([
      expect.objectContaining({ placement: 'bottomBar', title: '詳細', destinationScreenId: detail?.id }),
    ]));

    const recipeRow = home ? findNode(home.root.children, 'm3e-row-recipe') : undefined;
    expect(recipeRow).toMatchObject({
      kind: 'navigation-link',
      destinationScreenId: detail?.id,
      navigationTransition: 'slide',
      notes: expect.stringContaining('タップで'),
      children: [expect.objectContaining({ kind: 'hstack' })],
    });
    expect(generateSwiftUI(document)).toContain('NavigationLink {');

    expect(detail?.swipe).toEqual({ right: home?.id });
  });

  it('maps M3E frame sizes to semantic iPhone and iPad preview devices', () => {
    const document = convertM3eDocument({
      frames: [
        { id: 'small', name: '小さい画面', x: 0, y: 0, w: 375, h: 667 },
        { id: 'tablet', name: 'タブレット', x: 500, y: 0, w: 744, h: 1133 },
        { id: 'desktop', name: '横長画面', x: 1300, y: 0, w: 1280, h: 800 },
      ],
      groups: [],
    });

    expect(document?.screens.map((screen) => screen.previewDevice)).toEqual(['iphone-se', 'ipad-mini', 'ipad-pro-11']);
    expect(document?.screens.map((screen) => screen.previewOrientation)).toEqual(['portrait', 'portrait', 'landscape']);
  });

  it('keeps back actions as executable semantic controls', () => {
    const document = convertM3eDocument({
      frames: [{ id: 'home', name: 'ホーム', x: 0, y: 0 }, { id: 'detail', name: '詳細', x: 492, y: 0 }],
      groups: [{
        id: 'detail-actions',
        x: 492,
        y: 80,
        axis: 'y',
        items: [{ id: 'close', kind: 'button', label: '閉じる', icon: 'close', variant: 'text', action: { to: 'back', transition: 'fade' } }],
      }],
    });

    expect(document?.screens[1]?.root.children[0]).toMatchObject({
      kind: 'button',
      navigationAction: 'back',
      navigationTransition: 'fade',
    });
    expect(document ? generateSwiftUI(document) : '').toContain('dismiss()');
  });

  it('rejects values that are not M3E project documents', () => {
    expect(isM3eDocument({ screens: [] })).toBe(false);
    expect(convertM3eDocument({ frames: [], groups: [] })).toBeNull();
  });

  it('reports M3E data that needs review after import', () => {
    const report = inspectM3eCompatibility({
      frames: [
        { id: 'home', name: 'ホーム', x: 0, y: 0, swipe: { left: 'missing' } },
        { id: 'broken', x: 0, y: 0 },
      ],
      groups: [
        {
          id: 'body',
          x: 0,
          y: 0,
          axis: 'y',
          items: [
            { id: 'unknown', kind: 'unknownPart', label: '独自パーツ' },
            { id: 'bad-action', kind: 'button', label: '開く', action: { to: 'missing' } },
            null,
          ],
        },
        { id: 'broken-group', x: 0, y: 0, axis: 'z', items: [] },
      ],
    });

    expect(report).toEqual({
      invalidFrameCount: 1,
      invalidGroupCount: 1,
      discardedItemCount: 1,
      unresolvedDestinationCount: 2,
      unsupportedKinds: ['unknownPart'],
    });
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
    expect(output).toContain('.frame(width: 96)');
    expect(output).toContain('.frame(maxWidth: .infinity, alignment: .center)');
  });

  it('keeps a camera import as a semantic camera control', () => {
    const document = convertM3eDocument({
      frames: [{ id: 'home', name: 'ホーム', x: 0, y: 0 }],
      groups: [{ id: 'capture', x: 16, y: 80, axis: 'y', items: [{ id: 'camera', kind: 'camera', label: '料理を撮影' }] }],
    });

    expect(findNode(document?.screens[0]?.root.children ?? [], 'm3e-camera')).toMatchObject({ kind: 'camera', label: '料理を撮影' });
    if (!document) throw new Error('Camera fixture was not converted');
    expect(generateSwiftUI(document)).toContain('AVFoundation: AVCaptureSessionをカメラプレビューへ接続する');
  });

  it('keeps MapKit, Snackbar actions, and navigation selection state semantic', () => {
    const document = convertM3eDocument({
      frames: [{ id: 'home', name: 'ホーム', x: 0, y: 0 }, { id: 'detail', name: '詳細', x: 492, y: 0 }],
      groups: [
        {
          id: 'rail',
          x: 0,
          y: 0,
          axis: 'y',
          items: [{
            id: 'rail',
            kind: 'navRail',
            label: '',
            icon: 'menu',
            variant: 'filled',
            selected: 1,
            railExpanded: true,
            railModal: true,
            tabs: [{ label: 'ホーム', icon: 'house' }, { label: '詳細', icon: 'info', }],
            actions: { 'tab:0': { to: 'home' }, 'tab:1': { to: 'detail' } },
          }],
        },
        {
          id: 'content',
          x: 16,
          y: 80,
          axis: 'y',
          items: [
            { id: 'map', kind: 'map', label: '現在地', icon: null, variant: 'filled' },
            { id: 'snackbar', kind: 'snackbar', label: '保存しました', supporting: '元に戻す', icon: null, variant: 'filled' },
          ],
        },
        {
          id: 'bottom',
          x: 0,
          y: 780,
          axis: 'x',
          items: [{
            id: 'bottom-nav',
            kind: 'bottomNav',
            label: '',
            icon: null,
            variant: 'filled',
            selected: 1,
            tabs: [{ label: 'ホーム', icon: 'home' }, { label: '詳細', icon: 'info' }],
          }],
        },
      ],
    });

    expect(document).not.toBeNull();
    if (!document) throw new Error('M3E document was not converted');
    const nodes = document.screens[0]?.root.children ?? [];
    expect(findNode(nodes, 'm3e-map')).toMatchObject({ kind: 'map', label: '現在地' });
    expect(findNode(nodes, 'm3e-snackbar')).toMatchObject({
      kind: 'hstack',
      children: [expect.objectContaining({ kind: 'text' }), expect.objectContaining({ kind: 'button', label: '元に戻す' })],
    });
    expect(findNode(nodes, 'm3e-rail')).toMatchObject({ kind: 'navigation-split-view', selectedIndex: 1, railExpanded: true, railModal: true });
    expect(document.screens[0]?.tabBarItems).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: '詳細', placement: 'bottomBar', selected: true }),
    ]));
    const output = generateSwiftUI(document);
    expect(output).toContain('import MapKit');
    expect(output).toContain('Map()');
    expect(output).toContain('Button("元に戻す")');
    expect(output).toContain('List(selection: $selected_m3e_rail)');
  });
});
