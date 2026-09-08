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
    expect(parseCanvasDocument({ ...defaultDocument, appearance: { colorScheme: 'system', accentColor: 'blue', fontDesign: 'pixel' } })).toBeNull();
    const customAppearance = { ...defaultDocument, appearance: { colorScheme: 'light' as const, accentColor: 'custom' as const, accentHex: '#FF9500' } };
    expect(parseCanvasDocument(customAppearance)?.appearance).toEqual(customAppearance.appearance);
    expect(parseCanvasDocument({ ...customAppearance, appearance: { ...customAppearance.appearance, accentHex: 'orange' } })).toBeNull();
    expect(parseCanvasDocument({ ...customAppearance, appearance: { colorScheme: 'light', accentColor: 'custom' } })).toBeNull();
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

  it('rejects dimensions that would produce invalid SwiftUI modifiers', () => {
    const document = structuredClone(defaultDocument);
    const button = document.screens[0]?.root.children.find((node) => node.kind === 'button');
    const text = document.screens[0]?.root.children.find((node) => node.kind === 'text');
    if (!button || button.kind !== 'button' || !text || text.kind !== 'text') throw new Error('Fixture nodes missing');

    const negativeHeight = structuredClone(document);
    const negativeButton = negativeHeight.screens[0]?.root.children.find((node) => node.id === button.id);
    if (!negativeButton || negativeButton.kind !== 'button') throw new Error('Button fixture missing');
    negativeButton.minHeight = -1;
    expect(parseCanvasDocument(negativeHeight)).toBeNull();

    const zeroFont = structuredClone(document);
    const zeroText = zeroFont.screens[0]?.root.children.find((node) => node.id === text.id);
    if (!zeroText || zeroText.kind !== 'text') throw new Error('Text fixture missing');
    zeroText.fontSize = 0;
    expect(parseCanvasDocument(zeroFont)).toBeNull();
  });

  it('accepts semantic text and Liquid Glass properties', () => {
    const document = structuredClone(defaultDocument);
    const home = document.screens[0];
    if (!home) throw new Error('Home screen missing');
    home.root.children.push({
      id: 'glass-group',
      kind: 'glass-container',
      spacing: 12,
      children: [{
        id: 'glass-label',
        kind: 'text',
        text: '内容',
      fontSize: 17,
      weight: 'semibold',
      textStyle: 'headline',
      fontDesign: 'rounded',
      textAlignment: 'center',
      lineLimit: 2,
      glass: 'clear',
      glassInteractive: true,
      glassTint: 'blue',
      glassShape: 'capsule',
      padding: 8,
      }],
    });

    expect(parseCanvasDocument(document)).toEqual(document);
    expect(parseCanvasDocument({ ...document, screens: [{ ...home, root: { ...home.root, children: [{ ...home.root.children[0], padding: 129 }] } }] })).toBeNull();
    const invalidLineLimit = structuredClone(document);
    const invalidGroup = invalidLineLimit.screens[0]?.root.children.find((node) => node.id === 'glass-group');
    if (!invalidGroup || invalidGroup.kind !== 'glass-container') throw new Error('Glass group fixture missing');
    const invalidText = invalidGroup.children[0];
    if (!invalidText || invalidText.kind !== 'text') throw new Error('Glass text fixture missing');
    invalidText.lineLimit = 0;
    expect(parseCanvasDocument(invalidLineLimit)).toBeNull();
  });

  it('round-trips an optional SF Symbol on buttons', () => {
    const document = structuredClone(defaultDocument);
    const screen = document.screens[0];
    const button = screen?.root.children.find((node) => node.kind === 'button');
    if (!screen || !button || button.kind !== 'button') throw new Error('Button fixture missing');
    button.systemName = 'arrow.right';
    button.accessibilityLabel = '次の画面へ';
    button.buttonStyle = 'bordered';
    button.destinationScreenId = 'screen-settings';

    expect(parseCanvasDocument(document)).toEqual(document);
    expect(parseCanvasDocument({
      ...document,
      screens: [{ ...screen, root: { ...screen.root, children: [{ ...button, systemName: 12 }] } }],
    })).toBeNull();
    expect(parseCanvasDocument({
      ...document,
      screens: [{ ...screen, root: { ...screen.root, children: [{ ...button, buttonStyle: 'unsupported' }] } }],
    })).toBeNull();
    expect(parseCanvasDocument({
      ...document,
      screens: [{ ...screen, root: { ...screen.root, children: [{ ...button, destinationScreenId: 12 }] } }],
    })).toBeNull();
    expect(parseCanvasDocument({
      ...document,
      screens: [{ ...screen, root: { ...screen.root, children: [{ ...button, accessibilityLabel: 12 }] } }],
    })).toBeNull();
  });

  it('round-trips asset and remote Image sources', () => {
    const document = structuredClone(defaultDocument);
    document.screens[0]?.root.children.push(
      { id: 'asset-image', kind: 'image', source: 'asset', systemName: 'HeroImage', accessibilityLabel: 'ヒーロー画像' },
      { id: 'remote-image', kind: 'image', source: 'remote', systemName: 'https://example.com/hero.png', accessibilityLabel: 'リモート画像' },
    );

    expect(parseCanvasDocument(document)).toEqual(document);
    expect(parseCanvasDocument({ ...document, screens: [{ ...document.screens[0], root: { ...document.screens[0]!.root, children: [{ ...document.screens[0]!.root.children.at(-1), source: 'unsupported' }] } }] })).toBeNull();
  });

  it('round-trips toggle button states and rejects conflicting destinations', () => {
    const document = structuredClone(defaultDocument);
    const screen = document.screens[0];
    const button = screen?.root.children.find((node) => node.kind === 'button');
    if (!screen || !button || button.kind !== 'button') throw new Error('Button fixture missing');
    button.toggle = {
      isOn: true,
      onLabel: '通知を停止',
      onSystemName: 'bell.slash.fill',
      onButtonStyle: 'bordered',
    };

    expect(parseCanvasDocument(document)).toEqual(document);
    expect(parseCanvasDocument({
      ...document,
      screens: [{ ...screen, root: { ...screen.root, children: [{ ...button, toggle: { ...button.toggle, isOn: 'yes' } }] } }],
    })).toBeNull();
    expect(parseCanvasDocument({
      ...document,
      screens: [{ ...screen, root: { ...screen.root, children: [{ ...button, destinationScreenId: 'screen-settings' }] } }],
    })).toBeNull();
  });

  it('round-trips the standard form controls and container nodes', () => {
    const document = structuredClone(defaultDocument);
    const home = document.screens[0];
    if (!home) throw new Error('Home screen missing');
    home.root.children.push(
      { id: 'group-test', kind: 'group', children: [] },
      { id: 'lazy-stack-test', kind: 'lazyvstack', alignment: 'leading', spacing: 12, children: [] },
      { id: 'lazy-row-test', kind: 'lazyhstack', alignment: 'center', spacing: 8, children: [] },
      { id: 'split-test', kind: 'navigation-split-view', children: [{ id: 'split-sidebar', kind: 'list', children: [] }, { id: 'split-detail', kind: 'vstack', spacing: 12, children: [] }] },
      { id: 'groupbox-test', kind: 'groupbox', title: '設定', children: [] },
      { id: 'grid-test', kind: 'lazyvgrid', columns: 2, spacing: 12, children: [] },
      { id: 'row-grid-test', kind: 'lazyhgrid', rows: 2, spacing: 12, children: [] },
      { id: 'tabs-test', kind: 'tabview', children: [{ id: 'tab-home', kind: 'text', text: 'Home', fontSize: 17, weight: 'regular', tabTitle: 'Home', tabSystemName: 'house.fill' }] },
      { id: 'details-test', kind: 'disclosure-group', title: 'Details', children: [] },
      { id: 'sheet-test', kind: 'sheet', label: 'Edit', title: 'Edit sheet', children: [] },
      { id: 'secure-test', kind: 'securefield', label: 'Password', binding: 'password', minHeight: 44 },
      { id: 'search-test', kind: 'searchfield', label: '検索', binding: 'query', prompt: 'キーワードを検索', minHeight: 44 },
      { id: 'editor-test', kind: 'texteditor', label: 'Notes', binding: 'notes', minHeight: 88 },
      { id: 'color-test', kind: 'colorpicker', label: 'アクセント', binding: 'accentColor', color: '#007AFF', minHeight: 44 },
      { id: 'slider-test', kind: 'slider', label: 'Volume', binding: 'volume', value: 50, minimum: 0, maximum: 100, step: 1, minHeight: 44 },
      { id: 'stepper-test', kind: 'stepper', label: 'Quantity', binding: 'quantity', value: 1, minimum: 0, maximum: 10, step: 1, minHeight: 44 },
      { id: 'menu-test', kind: 'menu', label: 'Actions', options: ['Edit', 'Delete'], minHeight: 44 },
      { id: 'gauge-test', kind: 'gauge', label: '進捗', value: 0.6, minimum: 0, maximum: 1, minHeight: 44 },
      { id: 'empty-state-test', kind: 'content-unavailable', title: '項目なし', systemName: 'tray', description: 'まだ項目がありません。' },
      { id: 'camera-test', kind: 'camera', label: '写真を撮る', minHeight: 44 },
      { id: 'alert-test', kind: 'alert', label: '削除', title: '削除しますか？', message: 'この操作は取り消せません。', primaryButton: '削除', primaryRole: 'destructive', secondaryButton: 'キャンセル', secondaryRole: 'cancel', minHeight: 44 },
      { id: 'confirmation-test', kind: 'confirmation-dialog', label: '操作', title: '操作を選択', message: '実行する操作を選んでください。', options: ['編集', '削除'], cancelButton: 'キャンセル', minHeight: 44 },
    );

    expect(parseCanvasDocument(document)).toEqual(document);
  });

  it('validates Alert actions and presentation values', () => {
    const document = structuredClone(defaultDocument);
    const alert = { id: 'alert-test', kind: 'alert' as const, label: '確認', title: '続けますか？', message: '確認してください。', primaryButton: '続ける', primaryRole: 'normal' as const, secondaryButton: 'キャンセル', secondaryRole: 'cancel' as const, minHeight: 44 };
    document.screens[0]?.root.children.push(alert);

    expect(parseCanvasDocument(document)).toEqual(document);
    expect(parseCanvasDocument({ ...document, screens: [{ ...document.screens[0], root: { ...document.screens[0]!.root, children: [{ ...alert, secondaryRole: 'cancel', secondaryButton: undefined }] } }] })).toBeNull();
    expect(parseCanvasDocument({ ...document, screens: [{ ...document.screens[0], root: { ...document.screens[0]!.root, children: [{ ...alert, minHeight: -1 }] } }] })).toBeNull();
  });

  it('validates ConfirmationDialog options', () => {
    const document = structuredClone(defaultDocument);
    const dialog = { id: 'confirmation-test', kind: 'confirmation-dialog' as const, label: '操作', title: '操作を選択', message: '選んでください。', options: ['編集', '削除'], cancelButton: 'キャンセル', minHeight: 44 };
    document.screens[0]?.root.children.push(dialog);

    expect(parseCanvasDocument(document)).toEqual(document);
    expect(parseCanvasDocument({ ...document, screens: [{ ...document.screens[0], root: { ...document.screens[0]!.root, children: [{ ...dialog, options: [] }] } }] })).toBeNull();
    expect(parseCanvasDocument({ ...document, screens: [{ ...document.screens[0], root: { ...document.screens[0]!.root, children: [{ ...dialog, cancelButton: 42 }] } }] })).toBeNull();
  });

  it('validates SearchField prompt values', () => {
    const document = structuredClone(defaultDocument);
    const search = { id: 'search-test', kind: 'searchfield' as const, label: '検索', binding: 'query', prompt: 'キーワード', minHeight: 44 };
    document.screens[0]?.root.children.push(search);

    expect(parseCanvasDocument(document)).toEqual(document);
    expect(parseCanvasDocument({ ...document, screens: [{ ...document.screens[0], root: { ...document.screens[0]!.root, children: [{ ...search, prompt: 42 }] } }] })).toBeNull();
  });

  it('rejects invalid grid dimensions and Gauge ranges', () => {
    const document = structuredClone(defaultDocument);
    const home = document.screens[0];
    if (!home) throw new Error('Home screen missing');
    home.root.children.push(
      { id: 'grid-test', kind: 'lazyvgrid', columns: 2, spacing: 12, children: [] },
      { id: 'row-grid-test', kind: 'lazyhgrid', rows: 2, spacing: 12, children: [] },
      { id: 'gauge-test', kind: 'gauge', label: '進捗', value: 0.6, minimum: 0, maximum: 1, minHeight: 44 },
    );

    expect(parseCanvasDocument(document)).toEqual(document);
    expect(parseCanvasDocument({
      ...document,
      screens: [{ ...home, root: { ...home.root, children: [{ ...home.root.children.at(-2), columns: 0 }] } }],
    })).toBeNull();
    expect(parseCanvasDocument({
      ...document,
      screens: [{ ...home, root: { ...home.root, children: [{ ...home.root.children.at(-2), rows: 0 }] } }],
    })).toBeNull();
    expect(parseCanvasDocument({
      ...document,
      screens: [{ ...home, root: { ...home.root, children: [{ ...home.root.children.at(-1), minimum: 1, maximum: 1 }] } }],
    })).toBeNull();
  });

  it('validates ColorPicker hex values', () => {
    const document = structuredClone(defaultDocument);
    const home = document.screens[0];
    if (!home) throw new Error('Home screen missing');
    home.root.children.push({ id: 'color-test', kind: 'colorpicker', label: '色', binding: 'color', color: '#FF9500', minHeight: 44 });

    expect(parseCanvasDocument(document)).toEqual(document);
    expect(parseCanvasDocument({
      ...document,
      screens: [{ ...home, root: { ...home.root, children: [{ ...home.root.children.at(-1), color: 'orange' }] } }],
    })).toBeNull();
  });

  it('round-trips screen navigation presentation and toolbar items', () => {
    const document = structuredClone(defaultDocument);
    const screen = document.screens[0];
    if (!screen) throw new Error('Home screen missing');
    screen.navigationTitleDisplayMode = 'inline';
    screen.toolbarItems = [{
      id: 'toolbar-help',
      title: 'ヘルプ',
      systemName: 'questionmark.circle',
      placement: 'topBarTrailing',
      role: 'normal',
      destinationScreenId: 'screen-settings',
    }];
    screen.tabBarItems = [{
      id: 'tab-home',
      title: 'ホーム',
      systemName: 'house',
      placement: 'bottomBar',
      selected: true,
      destinationScreenId: 'screen-home',
    }];
    screen.swipe = { left: 'screen-settings' };

    expect(parseCanvasDocument(document)).toEqual(document);
    expect(parseCanvasDocument({ ...document, screens: [{ ...screen, toolbarItems: [{ ...screen.toolbarItems[0], placement: 'invalid' }] }] })).toBeNull();
    expect(parseCanvasDocument({ ...document, screens: [{ ...screen, tabBarItems: [{ ...screen.tabBarItems[0], placement: 'topBarLeading' }] }] })).toBeNull();
    expect(parseCanvasDocument({ ...document, screens: [{ ...screen, swipe: { left: 'missing-screen' } }] })).toBeNull();
  });

  it('round-trips implementation notes and rejects non-text notes', () => {
    const document = structuredClone(defaultDocument);
    const screen = document.screens[0];
    const text = screen?.root.children.find((node) => node.kind === 'text');
    if (!screen || !text) throw new Error('Notes fixtures missing');
    screen.notes = 'フォーム送信後に設定画面へ戻す';
    text.notes = 'Dynamic Typeで折り返せる見出し';

    expect(parseCanvasDocument(document)).toEqual(document);
    expect(parseCanvasDocument({ ...document, screens: [{ ...screen, notes: 42 }] })).toBeNull();
    expect(parseCanvasDocument({ ...document, screens: [{ ...screen, root: { ...screen.root, children: [{ ...text, notes: false }] } }] })).toBeNull();
  });
});
