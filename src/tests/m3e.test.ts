import { describe, expect, it } from 'vitest';
import { findNode } from '../lib/nodes';
import { convertM3eDocument, describeM3eCompatibilityFields, describeM3eCompatibilityKinds, exportM3eDocument, generateM3eJson, getM3eCompatibilityAnomalies, inspectM3eCompatibility, inspectM3eExportCompatibility, isM3eDocument } from '../lib/m3e';
import { defaultDocument } from '../lib/defaultDocument';
import { parseCanvasDocument } from '../lib/document';
import { generateSwiftUI } from '../lib/swiftui';
import type { CanvasDocument, CanvasNode } from '../types/document';

const m3eDocument = {
  title: 'レシピ',
  paletteKey: 'teal',
  theme: { dark: true, font: 'robotoSerif' },
  frame: 'detail',
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
  it('explains approximate mappings in compatibility diagnostics', () => {
    expect(describeM3eCompatibilityKinds(['securefield', 'gauge'])).toContain('securefield（textFieldへ投影するため');
    expect(describeM3eCompatibilityFields(['size', 'src'])).toContain('src（SwiftUIのAssetまたはURLへ差し替え）');
  });

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

    expect(exportM3eDocument(document).frames[0]?.swipe).toBeUndefined();
    const report = inspectM3eExportCompatibility(document);
    expect(report).toEqual({
      flattenedItemCount: 4,
      unsupportedNodeKinds: [],
      flattenedNodeKinds: ['glass-container', 'vstack'],
      approximatedKinds: ['securefield'],
      unresolvedDestinationCount: 2,
      unresolvedActionCount: 2,
      preservedFields: [],
      approximatedFields: [],
      lostFields: [],
      invalidFields: [],
      unknownFields: [],
      normalizedScreenCount: 1,
      roundTripValid: true,
    });
    expect(getM3eCompatibilityAnomalies(report)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'FLATTENED_LAYOUT', status: 'approximated' }),
      expect.objectContaining({ code: 'APPROXIMATED_KIND', status: 'approximated' }),
      expect.objectContaining({ code: 'UNRESOLVED_NAVIGATION', status: 'unresolved' }),
    ]));
  });

  it('reports invalid values in the exported M3E projection', () => {
    const document: CanvasDocument = {
      version: 1,
      name: '不正値の書き出し',
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
          children: [{ id: 'range', kind: 'slider', label: '範囲', binding: 'range', value: 5, minimum: 10, maximum: 5, step: 0, minHeight: 44 }],
        },
      }],
    };

    const report = inspectM3eExportCompatibility(document);
    expect(report.invalidFields).toEqual(expect.arrayContaining([
      'groups[1].items[0].minimum',
      'groups[1].items[0].maximum',
      'groups[1].items[0].step',
    ]));
    expect(getM3eCompatibilityAnomalies(report)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'INVALID_FIELD', status: 'lost' }),
    ]));
  });

  it('preserves card presentation and indeterminate circular progress on export', () => {
    const document: CanvasDocument = {
      version: 1,
      name: 'M3E表示状態',
      platform: 'iOS',
      minimumOS: '26.0',
      appearance: { colorScheme: 'system', accentColor: 'blue' },
      activeScreenId: 'home',
      screens: [{
        id: 'home',
        name: 'ホーム',
        navigationTitle: 'ホーム',
        root: {
          id: 'root',
          kind: 'vstack',
          children: [
            {
              id: 'card',
              kind: 'groupbox',
              title: 'おすすめ',
              cardImagePosition: 'leading',
              cardImageSize: 96,
              cardContentAlignment: 'center',
              children: [],
            },
            { id: 'loading', kind: 'progress', label: '読み込み中', value: 0.5, style: 'circular', indeterminate: true },
          ],
        },
      }],
    };

    const items = exportM3eDocument(document).groups.flatMap((group) => group.items);
    expect(items).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'card', label: 'おすすめ', imagePos: 'leading', imageSize: 96, contentAlign: 'center' }),
      expect.objectContaining({ kind: 'loadingIndicator', label: '読み込み中' }),
    ]));
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
    const exportedItems = exportM3eDocument(document).groups.flatMap((group) => group.items);
    expect(exportedItems).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'listItem', label: 'スープ', icon: 'fork.knife', supporting: '30分', action: { to: 'screen-detail', transition: 'slide' } }),
    ]));

    expect(detail?.swipe).toEqual({ right: home?.id });
    expect(document.activeScreenId).toBe(detail?.id);
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

  it('does not create invalid empty NavigationLinks for incomplete rails', () => {
    const document = convertM3eDocument({
      frames: [{ id: 'home', name: 'ホーム', x: 0, y: 0 }],
      groups: [{
        id: 'rail',
        x: 0,
        y: 0,
        axis: 'y',
        items: [{
          id: 'rail',
          kind: 'navRail',
          label: '',
          icon: null,
          variant: 'filled',
          tabs: [{ label: 'ホーム' }, { label: '未解決' }],
          actions: { 'tab:1': { to: 'missing' } },
        }],
      }],
    });

    const rail = findNode(document?.screens[0]?.root.children ?? [], 'm3e-rail');
    const entries = rail?.children?.[0]?.children ?? [];
    expect(entries).toEqual([
      expect.objectContaining({ kind: 'button', label: 'ホーム' }),
      expect.objectContaining({ kind: 'button', label: '未解決', notes: 'M3Eの遷移先を解決できませんでした。' }),
    ]);
    expect(entries.some((entry) => entry.kind === 'navigation-link' && entry.destinationScreenId === '')).toBe(false);
  });

  it('keeps text-only top bar actions as semantic toolbar items', () => {
    const document = convertM3eDocument({
      frames: [{ id: 'home', name: 'ホーム', x: 0, y: 0 }, { id: 'settings', name: '設定', x: 492, y: 0 }],
      groups: [{
        id: 'bar',
        x: 0,
        y: 0,
        axis: 'x',
        items: [{ id: 'bar', kind: 'topAppBar', label: 'ホーム', icon: null, variant: 'filled', actions: { icon: { to: 'settings', transition: 'fade' } } }],
      }],
    });

    expect(document?.screens[0]?.toolbarItems).toEqual([
      expect.objectContaining({ title: '操作', placement: 'topBarLeading', destinationScreenId: 'screen-settings', navigationTransition: 'fade' }),
    ]);
  });

  it('round-trips M3E toolbar actions as one semantic action group', () => {
    const document = convertM3eDocument({
      frames: [{ id: 'home', name: 'ホーム', x: 0, y: 0 }, { id: 'next', name: '次', x: 492, y: 0 }],
      groups: [{
        id: 'tools',
        x: 16,
        y: 80,
        axis: 'x',
        items: [{
          id: 'tools',
          kind: 'toolbar',
          label: '操作',
          icon: null,
          variant: 'filled',
          tabs: [{ label: '編集', icon: 'edit' }, { label: '次へ', icon: 'arrow_forward' }],
          actions: { 'tab:1': { to: 'next', transition: 'slide' } },
        }],
      }],
    });

    expect(document).not.toBeNull();
    if (!document) throw new Error('Toolbar fixture was not converted');
    const items = exportM3eDocument(document).groups.flatMap((group) => group.items);
    expect(items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'toolbar',
        tabs: [{ label: '編集', icon: 'pencil' }, { label: '次へ', icon: 'chevron.right' }],
        actions: { 'tab:1': { to: 'screen-next', transition: 'slide' } },
      }),
    ]));
  });

  it('keeps back actions on list items and preserves linked cards', () => {
    const document = convertM3eDocument({
      frames: [{ id: 'home', name: 'ホーム', x: 0, y: 0 }, { id: 'next', name: '次', x: 492, y: 0 }],
      groups: [{
        id: 'content',
        x: 16,
        y: 80,
        axis: 'y',
        items: [
          { id: 'back-row', kind: 'listItem', label: '戻る', icon: null, variant: 'filled', action: { to: 'back', transition: 'fade' } },
          { id: 'next-card', kind: 'card', label: '詳細', supporting: '続き', icon: 'doc.text', variant: 'tonal', action: { to: 'next', transition: 'slide' } },
        ],
      }],
    });

    expect(document).not.toBeNull();
    if (!document) throw new Error('Linked compatibility fixture was not converted');
    const exported = exportM3eDocument(document).groups.flatMap((group) => group.items);
    expect(exported).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'listItem', label: '戻る', action: { to: 'back', transition: 'fade' } }),
      expect.objectContaining({ kind: 'card', label: '詳細', supporting: '続き', action: { to: 'screen-next', transition: 'slide' } }),
    ]));
  });

  it('keeps the original M3E kind for linked text and images', () => {
    const document = convertM3eDocument({
      frames: [{ id: 'home', name: 'ホーム', x: 0, y: 0 }, { id: 'detail', name: '詳細', x: 492, y: 0 }],
      groups: [{
        id: 'content',
        x: 16,
        y: 80,
        axis: 'y',
        items: [
          { id: 'linked-text', kind: 'text', label: '詳細を見る', size: 17, icon: null, variant: 'filled', action: { to: 'detail', transition: 'fade' } },
          { id: 'linked-badge', kind: 'badge', label: '新着', icon: null, variant: 'filled', action: { to: 'detail', transition: 'slide' } },
          { id: 'linked-image', kind: 'image', label: '写真', icon: 'photo', variant: 'filled', action: { to: 'detail', transition: 'slide' } },
        ],
      }],
    });

    expect(document).not.toBeNull();
    if (!document) throw new Error('Linked primitive fixture was not converted');
    expect(exportM3eDocument(document).groups.flatMap((group) => group.items)).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'text', label: '詳細を見る', action: { to: 'screen-detail', transition: 'fade' } }),
      expect.objectContaining({ kind: 'badge', label: '新着', action: { to: 'screen-detail', transition: 'slide' } }),
      expect.objectContaining({ kind: 'image', label: '写真', icon: 'photo', action: { to: 'screen-detail', transition: 'slide' } }),
    ]));
  });

  it('keeps actions on linked camera, map, and progress elements', () => {
    const document = convertM3eDocument({
      frames: [{ id: 'home', name: 'ホーム', x: 0, y: 0 }, { id: 'detail', name: '詳細', x: 492, y: 0 }],
      groups: [{
        id: 'content',
        x: 16,
        y: 80,
        axis: 'y',
        items: [
          { id: 'camera', kind: 'camera', label: '撮影', icon: null, variant: 'filled', action: { to: 'detail', transition: 'slide' } },
          { id: 'map', kind: 'map', label: '地図', icon: 'map', variant: 'filled', action: { to: 'detail', transition: 'fade' } },
          { id: 'progress', kind: 'linearProgress', label: '同期', icon: null, variant: 'filled', value: 40, action: { to: 'detail', transition: 'slideUp' } },
          { id: 'loading', kind: 'loadingIndicator', label: '待機', icon: null, variant: 'filled', action: { to: 'detail', transition: 'none' } },
        ],
      }],
    });

    expect(document).not.toBeNull();
    if (!document) throw new Error('Linked control fixture was not converted');
    expect(exportM3eDocument(document).groups.flatMap((group) => group.items)).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'camera', label: '撮影', action: { to: 'screen-detail', transition: 'slide' } }),
      expect.objectContaining({ kind: 'map', label: '地図', action: { to: 'screen-detail', transition: 'fade' } }),
      expect.objectContaining({ kind: 'linearProgress', label: '同期', value: 40, action: { to: 'screen-detail', transition: 'slideUp' } }),
      expect.objectContaining({ kind: 'loadingIndicator', label: '待機', action: { to: 'screen-detail', transition: 'none' } }),
    ]));
  });

  it('keeps actions on linked input controls and boxes', () => {
    const document = convertM3eDocument({
      frames: [{ id: 'home', name: 'ホーム', x: 0, y: 0 }, { id: 'detail', name: '詳細', x: 492, y: 0 }],
      groups: [{
        id: 'controls',
        x: 16,
        y: 80,
        axis: 'y',
        items: [
          { id: 'box', kind: 'box', label: '設定', icon: null, variant: 'outlined', action: { to: 'detail', transition: 'fade' } },
          { id: 'input', kind: 'textField', label: '名前', icon: null, variant: 'filled', action: { to: 'detail', transition: 'slide' } },
          { id: 'sort', kind: 'select', label: '並び順', icon: null, variant: 'filled', tabs: [{ label: '新しい順' }, { label: '古い順' }], selected: 1, action: { to: 'detail', transition: 'slideUp' } },
          { id: 'notifications', kind: 'switch', label: '通知', icon: null, variant: 'filled', checked: true, action: { to: 'detail', transition: 'slideDown' } },
          { id: 'volume', kind: 'slider', label: '音量', icon: null, variant: 'filled', value: 25, minimum: 0, maximum: 100, step: 5, action: { to: 'detail', transition: 'none' } },
        ],
      }],
    });

    expect(document).not.toBeNull();
    if (!document) throw new Error('Linked input fixture was not converted');
    const nodes = document.screens[0]?.root.children ?? [];
    expect(findNode(nodes, 'm3e-link-m3e-input')).toMatchObject({ kind: 'navigation-link', destinationScreenId: 'screen-detail', navigationTransition: 'slide' });
    expect(findNode(nodes, 'm3e-link-m3e-sort')).toMatchObject({ kind: 'navigation-link', destinationScreenId: 'screen-detail' });
    expect(findNode(nodes, 'm3e-link-m3e-notifications')).toMatchObject({ kind: 'navigation-link', destinationScreenId: 'screen-detail' });
    expect(findNode(nodes, 'm3e-link-m3e-volume')).toMatchObject({ kind: 'navigation-link', destinationScreenId: 'screen-detail' });

    expect(exportM3eDocument(document).groups.flatMap((group) => group.items)).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'box', label: '設定', action: { to: 'screen-detail', transition: 'fade' } }),
      expect.objectContaining({ kind: 'textField', label: '名前', action: { to: 'screen-detail', transition: 'slide' } }),
      expect.objectContaining({ kind: 'select', label: '並び順', selected: 1, action: { to: 'screen-detail', transition: 'slideUp' } }),
      expect.objectContaining({ kind: 'switch', label: '通知', checked: true, action: { to: 'screen-detail', transition: 'slideDown' } }),
      expect.objectContaining({ kind: 'slider', label: '音量', value: 25, action: { to: 'screen-detail', transition: 'none' } }),
    ]));
  });

  it('keeps approximation notes when exporting native SwiftUI controls to M3E', () => {
    const document = structuredClone(defaultDocument);
    const screen = document.screens[0];
    if (!screen) throw new Error('Default document has no screen');
    screen.root.children = [
      { id: 'secure', kind: 'securefield', label: 'パスワード', binding: 'password', minHeight: 44 },
      { id: 'editor', kind: 'texteditor', label: 'メモ', binding: 'notes', minHeight: 88 },
      { id: 'color', kind: 'colorpicker', label: '色', binding: 'tint', color: '#007AFF', minHeight: 44 },
      { id: 'stepper', kind: 'stepper', label: '数量', binding: 'quantity', value: 1, minimum: 0, maximum: 10, step: 1, minHeight: 44 },
      { id: 'menu', kind: 'menu', label: '操作', options: ['編集'], minHeight: 44 },
      { id: 'gauge', kind: 'gauge', label: '進捗', value: 0.5, minimum: 0, maximum: 1, minHeight: 44 },
      { id: 'link', kind: 'link', label: '公式', url: 'https://example.com', minHeight: 44 },
      { id: 'date', kind: 'datepicker', label: '日付', binding: 'date', minHeight: 44 },
    ];

    const exported = exportM3eDocument(document).groups.flatMap((group) => group.items);
    expect(exported.find((item) => item.id === 'secure')?.note).toContain('SecureField');
    expect(exported.find((item) => item.id === 'editor')?.note).toContain('TextEditor');
    expect(exported.find((item) => item.id === 'color')?.note).toContain('ColorPicker');
    expect(exported.find((item) => item.id === 'stepper')).toEqual(expect.objectContaining({ value: 1, minimum: 0, maximum: 10, step: 1, note: expect.stringContaining('Stepper') }));
    expect(exported.find((item) => item.id === 'menu')).toEqual(expect.objectContaining({ tabs: [{ label: '編集', icon: null }], note: expect.stringContaining('メニュー項目') }));
    expect(exported.find((item) => item.id === 'gauge')).toEqual(expect.objectContaining({ value: 50, minimum: 0, maximum: 1, note: expect.stringContaining('Gauge') }));
    expect(exported.find((item) => item.id === 'link')?.note).toContain('外部リンク');
    expect(exported.find((item) => item.id === 'date')?.note).toContain('DatePicker');
  });

  it('exports icon-only semantic buttons as M3E icon buttons', () => {
    const document = convertM3eDocument({
      frames: [{ id: 'home', name: 'ホーム', x: 0, y: 0 }],
      groups: [{
        id: 'actions',
        x: 16,
        y: 80,
        axis: 'y',
        items: [{ id: 'favorite', kind: 'iconButton', label: '', icon: 'favorite', variant: 'tonal' }],
      }],
    });

    expect(document).not.toBeNull();
    if (!document) throw new Error('Icon button fixture was not converted');
    expect(exportM3eDocument(document).groups.flatMap((group) => group.items)).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'iconButton', label: '', icon: 'favorite' }),
    ]));
  });

  it('keeps expressive action kinds across the semantic iOS round trip', () => {
    const document = convertM3eDocument({
      frames: [{ id: 'home', name: 'ホーム', x: 0, y: 0 }, { id: 'next', name: '次', x: 492, y: 0 }],
      groups: [{
        id: 'expressive',
        x: 16,
        y: 80,
        axis: 'y',
        items: [
          { id: 'extended', kind: 'extendedFab', label: '作成', icon: 'add', variant: 'tonal' },
          { id: 'chip', kind: 'chip', label: 'お気に入り', icon: 'star', variant: 'outlined', checked: true },
          {
            id: 'split',
            kind: 'splitButton',
            label: '送信',
            icon: 'send',
            variant: 'filled',
            tabs: [{ label: '下書き', icon: 'doc.fill' }, { label: '予約', icon: 'calendar' }],
            actions: { 'tab:0': { to: 'back', transition: 'slideLeft' }, 'tab:1': { to: 'next', transition: 'fade' } },
          },
          { id: 'agree', kind: 'checkbox', label: '同意する', checked: true },
          { id: 'choice', kind: 'radio', label: '選択肢', checked: false },
          { id: 'dot', kind: 'badge', label: '', variant: 'filled' },
          {
            id: 'menu',
            kind: 'fabMenu',
            label: '',
            icon: 'add',
            variant: 'filled',
            tabs: [{ label: '写真', icon: 'photo' }, { label: '書類', icon: 'doc.fill' }],
          },
        ],
      }],
    });

    expect(document).not.toBeNull();
    if (!document) throw new Error('Expressive fixture was not converted');
    const nodes = document.screens[0]?.root.children ?? [];
    expect(findNode(nodes, 'm3e-extended')).toMatchObject({ kind: 'button', m3eKind: 'extendedFab' });
    expect(findNode(nodes, 'm3e-chip')).toMatchObject({ kind: 'button', m3eKind: 'chip', toggle: { isOn: true } });
    expect(findNode(nodes, 'm3e-split')).toMatchObject({
      kind: 'button',
      m3eKind: 'splitButton',
      m3eMenuActions: {
        'tab:0': { navigationAction: 'back', navigationTransition: 'slideLeft' },
        'tab:1': { destinationScreenId: 'screen-next', navigationTransition: 'fade' },
      },
    });
    expect(findNode(nodes, 'm3e-agree')).toMatchObject({ kind: 'toggle', m3eKind: 'checkbox', isOn: true });
    expect(findNode(nodes, 'm3e-choice')).toMatchObject({ kind: 'toggle', m3eKind: 'radio' });
    expect(findNode(nodes, 'm3e-dot')).toMatchObject({ kind: 'text', m3eKind: 'badge', text: '' });
    expect(findNode(nodes, 'm3e-menu')).toMatchObject({ kind: 'vstack', m3eKind: 'fabMenu', m3eIcon: 'plus' });

    const exported = exportM3eDocument(document).groups.flatMap((group) => group.items);
    expect(exported).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'extendedFab', label: '作成', icon: 'add' }),
      expect.objectContaining({ kind: 'chip', label: 'お気に入り', checked: true }),
      expect.objectContaining({
        kind: 'splitButton',
        label: '送信',
        icon: 'send',
        actions: {
          'tab:0': { to: 'back', transition: 'slideLeft' },
          'tab:1': { to: 'screen-next', transition: 'fade' },
        },
      }),
      expect.objectContaining({ kind: 'checkbox', label: '同意する', checked: true }),
      expect.objectContaining({ kind: 'radio', label: '選択肢', checked: false }),
      expect.objectContaining({ kind: 'badge', label: '' }),
      expect.objectContaining({ kind: 'fabMenu', icon: 'add', tabs: [{ label: '写真', icon: 'photo' }, { label: '書類', icon: 'doc.fill' }] }),
    ]));

    const swiftui = generateSwiftUI(document);
    expect(parseCanvasDocument(document)).toEqual(document);
    expect(swiftui).toContain('@Environment(\\.dismiss) private var dismiss');
    expect(swiftui).toContain('Button("下書き") {');
    expect(swiftui).toContain('NavigationLink("予約", destination: Screen2View())');
    expect(swiftui).toContain('Menu {');
    expect(swiftui).toContain('Circle()');
  });

  it('round-trips every supported M3E presentation kind', () => {
    const items = [
      { id: 'box', kind: 'box', label: 'ボックス', icon: null, variant: 'outlined' },
      { id: 'button', kind: 'button', label: '実行', icon: 'play_arrow', variant: 'filled' },
      { id: 'icon-button', kind: 'iconButton', label: '', icon: 'settings', variant: 'tonal' },
      { id: 'fab', kind: 'fab', label: '', icon: 'add', variant: 'tonal' },
      { id: 'extended-fab', kind: 'extendedFab', label: '作成', icon: 'add', variant: 'tonal' },
      { id: 'chip', kind: 'chip', label: 'タグ', icon: null, variant: 'outlined' },
      { id: 'search', kind: 'searchBar', label: '検索', icon: 'search', variant: 'filled' },
      { id: 'card', kind: 'card', label: 'カード', icon: 'photo', variant: 'tonal' },
      { id: 'list-item', kind: 'listItem', label: '項目', icon: 'star', variant: 'filled' },
      { id: 'dialog', kind: 'dialog', label: '確認', icon: null, variant: 'filled' },
      { id: 'snackbar', kind: 'snackbar', label: '保存しました', supporting: '元に戻す', icon: null, variant: 'filled' },
      { id: 'text-field', kind: 'textField', label: '名前', icon: null, variant: 'outlined' },
      { id: 'select', kind: 'select', label: '選択', icon: null, variant: 'outlined', tabs: [{ label: 'A' }, { label: 'B' }] },
      { id: 'switch', kind: 'switch', label: '通知', icon: null, variant: 'filled' },
      { id: 'checkbox', kind: 'checkbox', label: '同意', icon: null, variant: 'filled' },
      { id: 'slider', kind: 'slider', label: '音量', icon: null, variant: 'filled' },
      { id: 'text', kind: 'text', label: '本文', icon: null, variant: 'filled' },
      { id: 'image', kind: 'image', label: '画像', icon: 'photo', variant: 'filled' },
      { id: 'camera', kind: 'camera', label: '撮影', icon: null, variant: 'filled' },
      { id: 'map', kind: 'map', label: '地図', icon: 'map', variant: 'filled' },
      { id: 'divider', kind: 'divider', label: '', icon: null, variant: 'filled' },
      { id: 'loading', kind: 'loadingIndicator', label: '読み込み中', icon: null, variant: 'filled' },
      { id: 'linear', kind: 'linearProgress', label: '進捗', icon: null, variant: 'filled', value: 40 },
      { id: 'circular', kind: 'circularProgress', label: '処理', icon: null, variant: 'filled', value: 0.4 },
      { id: 'split', kind: 'splitButton', label: '送信', icon: 'send', variant: 'filled' },
      { id: 'fab-menu', kind: 'fabMenu', label: 'メニュー', icon: 'add', variant: 'tonal', tabs: [{ label: '写真', icon: 'photo' }] },
      { id: 'toolbar', kind: 'toolbar', label: '操作', icon: null, variant: 'filled', tabs: [{ label: '設定', icon: 'settings' }] },
      { id: 'tabs', kind: 'tabs', label: 'タブ', icon: null, variant: 'filled', tabs: [{ label: '概要', icon: 'home' }] },
      { id: 'radio', kind: 'radio', label: '選択肢', icon: null, variant: 'filled' },
      { id: 'badge', kind: 'badge', label: '1', icon: null, variant: 'filled' },
    ];
    const document = convertM3eDocument({
      title: '全種別',
      frames: [{ id: 'home', name: 'ホーム', x: 0, y: 0, w: 412, h: 892 }],
      groups: [
        { id: 'top', x: 0, y: 0, axis: 'x', items: [{ id: 'top-bar', kind: 'topAppBar', label: 'ホーム', icon: 'menu', variant: 'filled' }] },
        { id: 'body', x: 0, y: 80, axis: 'y', items: [{ id: 'rail', kind: 'navRail', label: 'レール', icon: null, variant: 'filled', tabs: [{ label: 'ホーム', icon: 'home' }] }, ...items] },
        { id: 'bottom', x: 0, y: 820, axis: 'x', items: [{ id: 'bottom-nav', kind: 'bottomNav', label: '', icon: null, variant: 'filled', tabs: [{ label: 'ホーム', icon: 'home' }] }] },
      ],
    });

    expect(document).not.toBeNull();
    if (!document) throw new Error('Presentation kind fixture was not converted');
    const exportedKinds = new Set(exportM3eDocument(document).groups.flatMap((group) => group.items).map((item) => item.kind));
    expect([...exportedKinds]).toEqual(expect.arrayContaining([
      'box', 'button', 'iconButton', 'fab', 'extendedFab', 'chip', 'searchBar', 'card', 'listItem', 'dialog', 'snackbar',
      'textField', 'select', 'switch', 'checkbox', 'slider', 'text', 'image', 'camera', 'map', 'divider', 'loadingIndicator',
      'linearProgress', 'circularProgress', 'splitButton', 'fabMenu', 'toolbar', 'tabs', 'radio', 'badge', 'topAppBar', 'bottomNav', 'navRail',
    ]));
    const report = inspectM3eExportCompatibility(document);
    expect(report.roundTripValid).toBe(true);
  });

  it('keeps non-action M3E kinds when the semantic tree is edited and exported', () => {
    const document = convertM3eDocument({
      frames: [{ id: 'home', name: 'ホーム', x: 0, y: 0 }],
      groups: [{
        id: 'content',
        x: 0,
        y: 0,
        axis: 'y',
        items: [
          { id: 'search', kind: 'searchBar', label: '検索', icon: 'search', variant: 'filled' },
          { id: 'row', kind: 'listItem', label: '設定', supporting: '詳細', icon: 'settings', icon2: 'chevron_right', variant: 'filled' },
          { id: 'box', kind: 'box', label: 'ボックス', icon: null, variant: 'outlined' },
          { id: 'card', kind: 'card', label: 'カード', supporting: '補足', icon: 'photo', variant: 'tonal' },
          { id: 'snackbar', kind: 'snackbar', label: '保存しました', supporting: '元に戻す', icon: null, variant: 'filled' },
        ],
      }],
    });

    expect(document).not.toBeNull();
    if (!document) throw new Error('Semantic M3E fixture was not converted');
    const nodes = document.screens[0]?.root.children ?? [];
    expect(findNode(nodes, 'm3e-search')).toMatchObject({ kind: 'searchfield', m3eKind: 'searchBar' });
    expect(findNode(nodes, 'm3e-row-row')).toMatchObject({ kind: 'hstack', m3eKind: 'listItem' });
    expect(findNode(nodes, 'm3e-box')).toMatchObject({ kind: 'groupbox', m3eKind: 'box' });
    expect(findNode(nodes, 'm3e-card')).toMatchObject({ kind: 'groupbox', m3eKind: 'card' });
    expect(findNode(nodes, 'm3e-snackbar')).toMatchObject({ kind: 'hstack', m3eKind: 'snackbar' });

    const exported = exportM3eDocument(document).groups.flatMap((group) => group.items);
    expect(exported).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'searchBar', label: '検索' }),
      expect.objectContaining({ kind: 'listItem', label: '設定', supporting: '詳細', icon: 'settings', icon2: 'chevron_right' }),
      expect.objectContaining({ kind: 'box', label: 'ボックス' }),
      expect.objectContaining({ kind: 'card', label: 'カード', supporting: '補足' }),
      expect.objectContaining({ kind: 'snackbar', label: '保存しました', supporting: '元に戻す' }),
    ]));
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
            { id: 'fab', kind: 'fab', label: '', icon: 'add', variant: 'tonal' },
            null,
          ],
        },
        { id: 'broken-group', x: 0, y: 0, axis: 'z', items: [] },
      ],
    });

    expect(report).toEqual({
      invalidFrameCount: 1,
      invalidGroupCount: 1,
      orphanedGroupCount: 0,
      discardedItemCount: 1,
      unresolvedDestinationCount: 2,
      unresolvedActionCount: 2,
      unsupportedKinds: ['unknownPart'],
      approximatedKinds: ['fab'],
      preservedFields: ['action', 'icon'],
      approximatedFields: [],
      lostFields: [],
      invalidFields: ['frames[1].name', 'groups[0].items[3]', 'groups[1].axis', 'groups[1].items'],
      unknownFields: [],
      flattenedLayoutCount: 0,
    });
    if (!report) throw new Error('Compatibility report was not generated');
    expect(getM3eCompatibilityAnomalies(report)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'UNSUPPORTED_KIND', status: 'lost' }),
      expect.objectContaining({ code: 'APPROXIMATED_KIND', status: 'approximated' }),
      expect.objectContaining({ code: 'UNRESOLVED_NAVIGATION', status: 'unresolved' }),
    ]));
  });

  it('reports unknown M3E fields instead of silently dropping them', () => {
    const report = inspectM3eCompatibility({
      futureProjectField: true,
      theme: { dark: false, futureThemeField: true },
      frames: [{ id: 'home', name: 'ホーム', x: 0, y: 0, futureFrameField: true, swipe: { diagonal: 'home' } }],
      groups: [{
        id: 'content',
        x: 0,
        y: 0,
        axis: 'y',
        items: [{
          id: 'text',
          kind: 'text',
          label: '本文',
          futureItemField: true,
          action: { to: 'home', futureActionField: 'preserve-me' },
          tabs: [{ label: 'タブ', futureTabField: true }],
        }],
      }],
    });

    expect(report?.unknownFields).toEqual(expect.arrayContaining([
      'document.futureProjectField',
      'theme.futureThemeField',
      'frames[0].futureFrameField',
      'frames[0].swipe.diagonal',
      'groups[0].items[0].futureItemField',
      'groups[0].items[0].action.futureActionField',
      'groups[0].items[0].tabs[0].futureTabField',
    ]));
    expect(getM3eCompatibilityAnomalies(report!)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'UNKNOWN_FIELD', status: 'lost' }),
    ]));

    const invalid = inspectM3eCompatibility({
      frames: [{ id: 'home', name: 'ホーム', x: 0, y: 0 }],
      groups: [{ id: 'invalid', x: 0, y: 0, axis: 'y', items: [{ id: 'bad', kind: 'select', tabs: [{ label: 12 }], actions: { 'tab:0': null } }] }],
    });
    expect(invalid?.lostFields).toEqual(expect.arrayContaining(['actions', 'tabs']));
    expect(invalid?.invalidFields).toEqual(expect.arrayContaining([
      'groups[0].items[0].tabs[0].label',
      'groups[0].items[0].actions.tab:0',
    ]));
  });

  it('reports values that the importer would normalize instead of preserving them', () => {
    const report = inspectM3eCompatibility({
      frames: [{
        id: 'home',
        name: 'ホーム',
        x: 0,
        y: 0,
        w: 0,
        h: '892',
        swipe: { left: 12, right: '', up: null, down: 'missing' },
      }],
      groups: [{
        id: 'controls',
        x: 0,
        y: 0,
        axis: 'y',
        items: [
          { id: 'range', kind: 'slider', minimum: 10, maximum: 5, step: 0, value: 120 },
          { id: 'select', kind: 'select', tabs: [{ label: '一' }, { label: '二' }], selected: 2 },
          { id: 'tabs', kind: 'tabs', tabs: [{ label: '一' }], selected: -1 },
          { id: 'rail', kind: 'navRail', tabs: [{ label: '一' }], selected: '0', variant: 'ghost', checked: 'yes', corners: { tl: -1, tr: 0, bl: 0, br: 0 } },
        ],
      }],
    });

    expect(report?.invalidFields).toEqual(expect.arrayContaining([
      'frames[0].w',
      'frames[0].h',
      'frames[0].swipe.left',
      'frames[0].swipe.right',
      'frames[0].swipe.up',
      'groups[0].items[0].minimum',
      'groups[0].items[0].maximum',
      'groups[0].items[0].step',
      'groups[0].items[0].value',
      'groups[0].items[1].selected',
      'groups[0].items[2].selected',
      'groups[0].items[3].selected',
      'groups[0].items[3].variant',
      'groups[0].items[3].checked',
      'groups[0].items[3].corners.tl',
    ]));
    expect(getM3eCompatibilityAnomalies(report!)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'INVALID_FIELD', status: 'lost' }),
    ]));
  });

  it('reports and drops groups that are outside every valid frame', () => {
    const value = {
      frames: [{ id: 'home', name: 'ホーム', x: 0, y: 0, w: 412, h: 892 }],
      groups: [{ id: 'outside', x: 900, y: 0, axis: 'y', items: [{ id: 'text', kind: 'text', label: '画面外' }] }],
    };

    expect(inspectM3eCompatibility(value)).toMatchObject({ orphanedGroupCount: 1 });
    expect(convertM3eDocument(value)?.screens[0]?.root.children).toEqual([]);
  });

  it('reports and explains M3E free-placement metadata without adding coordinates to the tree', () => {
    const source = {
      frames: [{ id: 'home', name: 'ホーム', x: 0, y: 0 }],
      groups: [{
        id: 'free-group',
        x: 0,
        y: 0,
        axis: 'y',
        free: true,
        locked: true,
        pos: { x: 12, y: 24 },
        items: [{ id: 'free-text', kind: 'text', label: '自由配置', pos: { x: 4, y: 8 }, locked: true }],
      }],
    };

    expect(inspectM3eCompatibility(source)).toMatchObject({ flattenedLayoutCount: 5 });
    const document = convertM3eDocument(source);
    expect(document?.screens[0]?.root.children[0]).toMatchObject({
      kind: 'text',
      notes: expect.stringContaining('自由配置・座標指定・ロック'),
    });
    expect(JSON.stringify(document)).not.toContain('"pos"');
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
          { id: 'sort', kind: 'select', label: '並び順', icon: null, variant: 'filled', selected: 1, tabs: [{ label: '新しい順', icon: 'arrow_up' }, { label: '古い順', icon: 'arrow_down' }] },
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
    expect(output).toContain('M3EWavyProgressView(value: 0.72, label: "同期", trackThickness: 8)');
    expect(output).toContain('M3ECircularProgressView(value: 0.25, label: "処理", lineWidth: 6)');
    expect(exportM3eDocument(document).groups.flatMap((group) => group.items)).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'select', tabs: [{ label: '新しい順', icon: 'arrow_up' }, { label: '古い順', icon: 'arrow_down' }] }),
    ]));
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
    expect(output).toContain('M3Eのボトムシート表現');
    expect(output).toContain('.presentationDetents([.medium, .large])');
    const card = findNode(nodes, 'm3e-card');
    if (!card) throw new Error('Card fixture missing');
    expect(card.children?.[0]).toMatchObject({ kind: 'hstack' });
    expect(output).toContain('.frame(width: 96)');
    expect(output).toContain('.frame(maxWidth: .infinity, alignment: .center)');
    const exportedItems = exportM3eDocument(document).groups.flatMap((group) => group.items);
    expect(exportedItems).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'box', label: 'メニュー', checked: true }),
      expect.objectContaining({ kind: 'card', label: 'おすすめ', icon: 'star', supporting: '説明', imagePos: 'leading', imageSize: 96, contentAlign: 'center' }),
    ]));
  });

  it('keeps a camera import as a semantic camera control', () => {
    const document = convertM3eDocument({
      frames: [{ id: 'home', name: 'ホーム', x: 0, y: 0 }],
      groups: [{ id: 'capture', x: 16, y: 80, axis: 'y', items: [{ id: 'camera', kind: 'camera', label: '料理を撮影' }] }],
    });

    expect(findNode(document?.screens[0]?.root.children ?? [], 'm3e-camera')).toMatchObject({ kind: 'camera', label: '料理を撮影' });
    if (!document) throw new Error('Camera fixture was not converted');
    expect(generateSwiftUI(document)).toContain('M3ECameraCapture(label: "料理を撮影")');
  });

  it('keeps M3E dialog choices and destinations in the Alert tree', () => {
    const document = convertM3eDocument({
      frames: [{ id: 'home', name: 'ホーム', x: 0, y: 0 }, { id: 'detail', name: '詳細', x: 492, y: 0 }],
      groups: [{
        id: 'dialog-group',
        x: 16,
        y: 80,
        axis: 'y',
        items: [{
          id: 'dialog',
          kind: 'dialog',
          label: '削除しますか？',
          supporting: 'この操作は取り消せません。',
          tabs: [{ label: '削除', icon: 'trash' }, { label: 'キャンセル', icon: 'xmark' }, { label: '詳細', icon: null }],
          actions: { 'tab:0': { to: 'detail', transition: 'slide' }, 'tab:1': { to: 'back', transition: 'slideLeft' } },
        }],
      }],
    });

    const dialog = findNode(document?.screens[0]?.root.children ?? [], 'm3e-dialog');
    expect(dialog).toMatchObject({
      kind: 'alert',
      primaryButton: '削除',
      secondaryButton: 'キャンセル',
      actions: [
        { label: '削除', destinationScreenId: 'screen-detail' },
        { label: 'キャンセル', navigationAction: 'back' },
        { label: '詳細' },
      ],
    });
    if (!document) throw new Error('Dialog fixture was not converted');
    const output = generateSwiftUI(document);
    expect(output).toContain('Button("削除")');
    expect(output).toContain('NavigationLink(destination: Screen2View()');
    expect(output).toContain('show_alert_action_m3e_dialog_0 = true');
    expect(output).toContain('Button("キャンセル")');
    expect(output).toContain('dismiss()');
    expect(exportM3eDocument(document).groups.flatMap((group) => group.items)).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'dialog', tabs: expect.arrayContaining([{ label: '削除', icon: 'trash' }, { label: 'キャンセル', icon: 'xmark' }]) }),
    ]));
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
            { id: 'snackbar', kind: 'snackbar', label: '保存しました', supporting: '元に戻す', icon: null, variant: 'filled', action: { to: 'detail', transition: 'fade' } },
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
      children: [expect.objectContaining({ kind: 'text' }), expect.objectContaining({ kind: 'button', label: '元に戻す', destinationScreenId: 'screen-detail', navigationTransition: 'fade' })],
    });
    expect(findNode(nodes, 'm3e-rail')).toMatchObject({ kind: 'navigation-split-view', selectedIndex: 1, railExpanded: true, railModal: true });
    expect(document.screens[0]?.tabBarItems).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: '詳細', placement: 'bottomBar', selected: true }),
    ]));
    const output = generateSwiftUI(document);
    expect(output).toContain('import MapKit');
    expect(output).toContain('Map()');
    expect(output).toContain('NavigationLink {');
    expect(output).toContain('Text("元に戻す")');
    expect(output).toContain('.accessibilityElement(children: .contain)');
    expect(output).toContain('List(selection: $selected_m3e_rail)');
    const exportedItems = exportM3eDocument(document).groups.flatMap((group) => group.items);
    expect(exportedItems).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'navRail', railExpanded: true, railModal: true }),
      expect.objectContaining({ kind: 'map', label: '現在地' }),
      expect.objectContaining({ kind: 'snackbar', label: '保存しました', supporting: '元に戻す', action: { to: 'screen-detail', transition: 'fade' } }),
    ]));
  });

  it('retains typed M3E presentation fields through an editable round trip', () => {
    const source = {
      title: '互換プロジェクト',
      frames: [{ id: 'home', name: 'ホーム', x: 0, y: 0 }],
      groups: [
        {
          id: 'top',
          x: 0,
          y: 0,
          axis: 'x',
          items: [{
            id: 'top-bar',
            kind: 'topAppBar',
            label: 'ホーム',
            icon: 'menu',
            icon2: 'settings',
            variant: 'filled',
            size: 56,
            radiusTop: 8,
            radiusBottom: 12,
            fill: 'surfaceContainerHigh',
            actions: { icon2: { to: 'back', transition: 'slideLeft' } },
          }],
        },
        {
          id: 'body',
          x: 16,
          y: 80,
          axis: 'y',
          items: [{
            id: 'favorite',
            kind: 'button',
            label: 'お気に入り',
            icon: 'favorite',
            variant: 'tonal',
            supporting: '保存済み',
            size: 140,
            size2: 52,
            radiusTop: 10,
            radiusBottom: 14,
            corners: { tl: 10, tr: 12, bl: 14, br: 16 },
            checked: true,
            noCheck: true,
            contained: true,
            fill: 'primaryContainer',
            iconFill: 'secondaryContainer',
            textColor: 'onPrimaryContainer',
            src: 'data:image/png;base64,fixture',
            toggle: { icon: 'check', variant: 'filled', label: '解除' },
            action: { to: 'back', transition: 'fade' },
          }],
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
            tabs: [{ label: 'ホーム', icon: 'home' }],
            selected: 0,
            contained: true,
          }],
        },
      ],
    };

    const document = convertM3eDocument(source);
    expect(document).not.toBeNull();
    if (!document) throw new Error('Metadata fixture was not converted');

    const favorite = findNode(document.screens[0]?.root.children ?? [], 'm3e-favorite');
    expect(favorite?.m3eMetadata).toMatchObject({
      size: 140,
      size2: 52,
      corners: { tl: 10, tr: 12, bl: 14, br: 16 },
      noCheck: true,
      contained: true,
      textColor: 'onPrimaryContainer',
    });
    expect(parseCanvasDocument(document)).toEqual(document);

    const swiftui = generateSwiftUI(document);
    expect(swiftui).toContain('.background(Color.accentColor.opacity(0.16))');
    expect(swiftui).toContain('.foregroundStyle(Color.primary)');
    expect(swiftui).toContain('.frame(width: 140)');
    expect(swiftui).toContain('.frame(minHeight: 52)');
    expect(swiftui).toContain('.clipShape(UnevenRoundedRectangle(cornerRadii: .init(topLeading: 10, bottomLeading: 14, bottomTrailing: 16, topTrailing: 12)))');
    expect(swiftui).toContain('.background(Color.accentColor.opacity(0.10), in: RoundedRectangle(cornerRadius: 8))');
    expect(swiftui).toContain('.toolbarBackground(Color.secondary.opacity(0.18), for: .navigationBar)');
    expect(swiftui).toContain('.toolbarBackground(.thinMaterial, for: .tabBar)');

    const explicitNone = structuredClone(document);
    const noneFavorite = findNode(explicitNone.screens[0]?.root.children ?? [], 'm3e-favorite');
    if (!noneFavorite) throw new Error('M3E button fixture is missing from the cloned document');
    noneFavorite.background = 'none';
    expect(generateSwiftUI(explicitNone)).toContain('.background(Color.accentColor.opacity(0.16))');

    const exported = exportM3eDocument(document);
    const items = exported.groups.flatMap((group) => group.items);
    expect(items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'button',
        size: 140,
        size2: 52,
        radiusTop: 10,
        radiusBottom: 14,
        corners: { tl: 10, tr: 12, bl: 14, br: 16 },
        noCheck: true,
        contained: true,
        fill: 'primaryContainer',
        iconFill: 'secondaryContainer',
        textColor: 'onPrimaryContainer',
        src: 'data:image/png;base64,fixture',
        toggle: expect.objectContaining({ label: '解除' }),
      }),
      expect.objectContaining({ kind: 'topAppBar', size: 56, radiusTop: 8, radiusBottom: 12, fill: 'surfaceContainerHigh' }),
      expect.objectContaining({ kind: 'bottomNav', contained: true, selected: 0 }),
    ]));

    const importReport = inspectM3eCompatibility(source);
    expect(importReport?.lostFields).toEqual([]);
    expect(importReport?.preservedFields).toEqual(expect.arrayContaining(['action', 'corners', 'fill', 'noCheck', 'size', 'toggle']));
    expect(importReport?.approximatedFields).toEqual(expect.arrayContaining(['corners', 'noCheck', 'size']));
    const exportReport = inspectM3eExportCompatibility(document);
    expect(exportReport.lostFields).toEqual([]);
    expect(exportReport.preservedFields).toEqual(expect.arrayContaining(['corners', 'fill', 'noCheck', 'size', 'toggle']));
    expect(exportReport.roundTripValid).toBe(true);
  });

  it('maps slider value and range into SwiftUI semantics before exporting', () => {
    const document = convertM3eDocument({
      frames: [{ id: 'home', name: 'ホーム', x: 0, y: 0 }],
      groups: [{
        id: 'controls',
        x: 0,
        y: 0,
        axis: 'y',
        items: [{ id: 'range', kind: 'slider', label: '温度', value: 25, minimum: 10, maximum: 30, step: 5, variant: 'filled' }],
      }],
    });

    expect(document).not.toBeNull();
    if (!document) throw new Error('Slider document was not converted');
    expect(findNode(document.screens[0]?.root.children ?? [], 'm3e-range')).toMatchObject({
      kind: 'slider',
      value: 15,
      minimum: 10,
      maximum: 30,
      step: 5,
    });

    const slider = exportM3eDocument(document).groups.flatMap((group) => group.items).find((item) => item.id === 'm3e-range');
    expect(slider).toMatchObject({ value: 25, minimum: 10, maximum: 30, step: 5 });
  });

  it('carries list item icon fills onto generated SwiftUI row icons', () => {
    const document = convertM3eDocument({
      frames: [{ id: 'home', name: 'ホーム', x: 0, y: 0 }],
      groups: [{
        id: 'list',
        x: 0,
        y: 0,
        axis: 'y',
        items: [{ id: 'settings', kind: 'listItem', label: '設定', icon: 'gearshape', icon2: 'chevron.right', iconFill: 'primaryContainer', variant: 'filled' }],
      }],
    });

    expect(document).not.toBeNull();
    if (!document) throw new Error('List item icon fixture was not converted');
    expect(document.screens[0]?.root.children[0]?.m3eMetadata).toMatchObject({ iconFill: 'primaryContainer' });
    expect(generateSwiftUI(document)).toContain('.background(Color.accentColor.opacity(0.16), in: RoundedRectangle(cornerRadius: 8))');
  });

  it('retains original M3E icon names and source fields after semantic editing', () => {
    const source = {
      title: '原典保持',
      frames: [{ id: 'home', name: 'ホーム', x: 0, y: 0 }],
      groups: [{
        id: 'content',
        x: 0,
        y: 0,
        axis: 'y',
        items: [
          { id: 'action', kind: 'button', label: 'ホーム', icon: 'home', icon2: 'settings', variant: 'filled', note: '元の操作', bold: false },
          { id: 'range', kind: 'slider', label: '温度', icon: null, value: 25, minimum: 10, maximum: 30, step: 5, variant: 'filled' },
        ],
      }],
    };

    const document = convertM3eDocument(source);
    expect(document).not.toBeNull();
    if (!document) throw new Error('Raw M3E fixture was not converted');

    const action = findNode(document.screens[0]?.root.children ?? [], 'm3e-action');
    const slider = findNode(document.screens[0]?.root.children ?? [], 'm3e-range');
    expect(action).toMatchObject({ m3eIcon2: 'gearshape.fill' });
    expect(action?.m3eMetadata).toMatchObject({ icon: 'home', icon2: 'settings', note: '元の操作', bold: false });
    expect(slider?.m3eMetadata).toMatchObject({ icon: null, value: 25 });
    expect(generateSwiftUI(document)).toContain('HStack(spacing: 8)');
    expect(generateSwiftUI(document)).toContain('Image(systemName: "gearshape.fill")');

    const items = exportM3eDocument(document).groups.flatMap((group) => group.items);
    expect(items).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'm3e-action', icon: 'home', icon2: 'settings', note: '元の操作', bold: false }),
      expect.objectContaining({ id: 'm3e-range', icon: null, value: 25 }),
    ]));

    if (!action || action.kind !== 'button') throw new Error('Raw button fixture is missing');
    const editNode = (node: CanvasNode): CanvasNode => node.id === action.id
      ? { ...action, systemName: 'star.fill' }
      : Array.isArray(node.children) ? { ...node, children: node.children.map(editNode) } : node;
    const edited: CanvasDocument = {
      ...document,
      screens: document.screens.map((screen) => screen.id !== document.activeScreenId
        ? screen
        : { ...screen, root: { ...screen.root, children: screen.root.children.map(editNode) } }),
    };
    expect(exportM3eDocument(edited).groups.flatMap((group) => group.items)).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'm3e-action', icon: 'star.fill' }),
    ]));
    const removeIcon = (node: CanvasNode): CanvasNode => node.id === action.id
      ? { ...node, m3eIcon2: null }
      : Array.isArray(node.children) ? { ...node, children: node.children.map(removeIcon) } : node;
    const removedIcon = {
      ...edited,
      screens: edited.screens.map((screen) => screen.id !== edited.activeScreenId
        ? screen
        : { ...screen, root: { ...screen.root, children: screen.root.children.map(removeIcon) } }),
    };
    expect(exportM3eDocument(removedIcon).groups.flatMap((group) => group.items)).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'm3e-action', icon2: null }),
    ]));
    expect(inspectM3eCompatibility(source)?.lostFields).toEqual([]);
    expect(inspectM3eExportCompatibility(document).lostFields).toEqual([]);
  });
});
