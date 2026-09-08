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

  it('applies the tap-target check to sliders and steppers', () => {
    const document = structuredClone(defaultDocument);
    document.screens[0]?.root.children.push(
      { id: 'slider-test', kind: 'slider', label: 'Volume', binding: 'volume', value: 50, minimum: 0, maximum: 100, step: 1, minHeight: 32 },
      { id: 'stepper-test', kind: 'stepper', label: 'Quantity', binding: 'quantity', value: 1, minimum: 0, maximum: 10, step: 1, minHeight: 32 },
      { id: 'colorpicker-test', kind: 'colorpicker', label: 'Tint', binding: 'tint', color: '#007AFF', minHeight: 32 },
      { id: 'searchfield-test', kind: 'searchfield', label: '検索', binding: 'query', prompt: '検索', minHeight: 32 },
    );

    expect(lintDocument(document)).toEqual(expect.arrayContaining([
      expect.objectContaining({ nodeId: 'slider-test', code: 'HIT_TARGET' }),
      expect.objectContaining({ nodeId: 'stepper-test', code: 'HIT_TARGET' }),
      expect.objectContaining({ nodeId: 'colorpicker-test', code: 'HIT_TARGET' }),
      expect.objectContaining({ nodeId: 'searchfield-test', code: 'HIT_TARGET' }),
    ]));
  });

  it('checks camera controls like other labeled actions', () => {
    const document = structuredClone(defaultDocument);
    document.screens[0]?.root.children.push({ id: 'camera-test', kind: 'camera', label: ' ', minHeight: 32 });

    expect(lintDocument(document)).toEqual(expect.arrayContaining([
      expect.objectContaining({ nodeId: 'camera-test', code: 'HIT_TARGET' }),
      expect.objectContaining({ nodeId: 'camera-test', code: 'EMPTY_LABEL' }),
    ]));
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

  it('flags an empty sheet that would not present useful content', () => {
    const document = structuredClone(defaultDocument);
    document.screens[0]?.root.children.push({ id: 'empty-sheet', kind: 'sheet', label: '編集', title: '編集', children: [] });

    expect(lintDocument(document)).toEqual(expect.arrayContaining([
      expect.objectContaining({ nodeId: 'empty-sheet', code: 'EMPTY_SHEET' }),
    ]));
  });

  it('checks Alert tap targets and action copy', () => {
    const document = structuredClone(defaultDocument);
    document.screens[0]?.root.children.push({
      id: 'alert-test',
      kind: 'alert',
      label: ' ',
      title: ' ',
      message: '確認',
      primaryButton: ' ',
      primaryRole: 'normal',
      minHeight: 32,
    });

    expect(lintDocument(document)).toEqual(expect.arrayContaining([
      expect.objectContaining({ nodeId: 'alert-test', code: 'HIT_TARGET' }),
      expect.objectContaining({ nodeId: 'alert-test', code: 'ACCESSIBILITY' }),
      expect.objectContaining({ nodeId: 'alert-test', code: 'EMPTY_LABEL' }),
    ]));
  });

  it('checks ConfirmationDialog tap targets and choices', () => {
    const document = structuredClone(defaultDocument);
    document.screens[0]?.root.children.push({
      id: 'confirmation-test',
      kind: 'confirmation-dialog',
      label: ' ',
      title: ' ',
      message: '確認',
      options: [' ', ''],
      minHeight: 32,
    });

    expect(lintDocument(document)).toEqual(expect.arrayContaining([
      expect.objectContaining({ nodeId: 'confirmation-test', code: 'HIT_TARGET' }),
      expect.objectContaining({ nodeId: 'confirmation-test', code: 'ACCESSIBILITY' }),
      expect.objectContaining({ nodeId: 'confirmation-test', code: 'EMPTY_LABEL' }),
    ]));
  });

  it('flags a remote Image with an invalid URL', () => {
    const document = structuredClone(defaultDocument);
    document.screens[0]?.root.children.push({
      id: 'remote-image-test',
      kind: 'image',
      source: 'remote',
      systemName: 'not-a-url',
      accessibilityLabel: '画像',
    });

    expect(lintDocument(document)).toEqual(expect.arrayContaining([
      expect.objectContaining({ nodeId: 'remote-image-test', code: 'ACCESSIBILITY' }),
    ]));
  });

  it('flags unlabeled sheets, empty group boxes, and empty tab views', () => {
    const document = structuredClone(defaultDocument);
    document.screens[0]?.root.children.push(
      { id: 'unlabeled-sheet', kind: 'sheet', label: ' ', title: '編集', children: [{ id: 'sheet-text', kind: 'text', text: '内容', fontSize: 17, weight: 'regular' }] },
      { id: 'empty-groupbox', kind: 'groupbox', title: ' ', children: [] },
      { id: 'empty-tabs', kind: 'tabview', children: [] },
    );

    expect(lintDocument(document)).toEqual(expect.arrayContaining([
      expect.objectContaining({ nodeId: 'unlabeled-sheet', code: 'EMPTY_LABEL' }),
      expect.objectContaining({ nodeId: 'empty-groupbox', code: 'ACCESSIBILITY' }),
      expect.objectContaining({ nodeId: 'empty-tabs', code: 'EMPTY_SECTION' }),
    ]));
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

  it('flags a map without an accessible label', () => {
    const document = structuredClone(defaultDocument);
    document.screens[0]?.root.children.push({ id: 'map-test', kind: 'map', label: ' ' });

    expect(lintDocument(document)).toEqual(expect.arrayContaining([
      expect.objectContaining({ nodeId: 'map-test', code: 'ACCESSIBILITY' }),
    ]));
  });

  it('flags a navigation link without a destination screen', () => {
    const document = structuredClone(defaultDocument);
    document.screens[0]?.root.children.push({
      id: 'link-test',
      kind: 'navigation-link',
      label: 'Details',
      destinationScreenId: 'missing-screen',
      minHeight: 44,
    });

    expect(lintDocument(document)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ nodeId: 'link-test', code: 'NAVIGATION_DESTINATION' }),
      ]),
    );
  });

  it('flags a button with an invalid destination screen', () => {
    const document = structuredClone(defaultDocument);
    document.screens[0]?.root.children.push({
      id: 'button-destination-test',
      kind: 'button',
      label: '詳細を開く',
      destinationScreenId: 'missing-screen',
      role: 'normal',
      minHeight: 44,
    });

    expect(lintDocument(document)).toEqual(expect.arrayContaining([
      expect.objectContaining({ nodeId: 'button-destination-test', code: 'NAVIGATION_DESTINATION' }),
    ]));
  });

  it('flags self-referencing navigation and an unlabeled section', () => {
    const document = structuredClone(defaultDocument);
    const screen = document.screens[0];
    if (!screen) throw new Error('Fixture screen missing');
    screen.root.children.push(
      { id: 'self-link', kind: 'navigation-link', label: '再表示', destinationScreenId: screen.id, minHeight: 44 },
      { id: 'untitled-section', kind: 'section', title: ' ', children: [{ id: 'section-text', kind: 'text', text: '内容', fontSize: 17, weight: 'regular' }] },
    );

    expect(lintDocument(document)).toEqual(expect.arrayContaining([
      expect.objectContaining({ nodeId: 'self-link', code: 'NAVIGATION_STRUCTURE' }),
      expect.objectContaining({ nodeId: 'untitled-section', code: 'ACCESSIBILITY' }),
    ]));
  });

  it('flags unlabeled picker and progress parts', () => {
    const document = structuredClone(defaultDocument);
    document.screens[0]?.root.children.push(
      { id: 'picker-test', kind: 'picker', label: '', binding: 'selection', options: ['One'], minHeight: 44 },
      { id: 'progress-test', kind: 'progress', label: '', value: 0.5 },
    );

    expect(lintDocument(document)).toEqual(expect.arrayContaining([
      expect.objectContaining({ nodeId: 'picker-test', code: 'EMPTY_LABEL' }),
      expect.objectContaining({ nodeId: 'progress-test', code: 'ACCESSIBILITY' }),
    ]));
  });

  it('accepts an icon-only button when it has a VoiceOver label', () => {
    const document = structuredClone(defaultDocument);
    const button = document.screens[0]?.root.children.find((node) => node.kind === 'button');
    if (!button || button.kind !== 'button') throw new Error('Fixture button missing');
    button.label = '';
    button.accessibilityLabel = '閉じる';

    expect(lintDocument(document).some((issue) => issue.nodeId === button.id && issue.code === 'EMPTY_LABEL')).toBe(false);
  });

  it('flags unlabeled gauges and empty-state symbols', () => {
    const document = structuredClone(defaultDocument);
    document.screens[0]?.root.children.push(
      { id: 'gauge-test', kind: 'gauge', label: '', value: 0.5, minimum: 0, maximum: 1, minHeight: 44 },
      { id: 'empty-state-test', kind: 'content-unavailable', title: '項目なし', systemName: '', description: '' },
    );

    expect(lintDocument(document)).toEqual(expect.arrayContaining([
      expect.objectContaining({ nodeId: 'gauge-test', code: 'ACCESSIBILITY' }),
      expect.objectContaining({ nodeId: 'empty-state-test', code: 'ACCESSIBILITY' }),
    ]));
  });

  it('does not warn about Dynamic Type when a semantic text style is used', () => {
    const document = structuredClone(defaultDocument);
    const text = document.screens[0]?.root.children.find((node) => node.kind === 'text');
    if (!text || text.kind !== 'text') throw new Error('Fixture text missing');
    text.textStyle = 'body';

    expect(lintDocument(document).some((issue) => issue.nodeId === text.id && issue.code === 'DYNAMIC_TYPE')).toBe(false);
  });

  it('notes fixed text line limits as a Dynamic Type risk', () => {
    const document = structuredClone(defaultDocument);
    const text = document.screens[0]?.root.children.find((node) => node.kind === 'text');
    if (!text || text.kind !== 'text') throw new Error('Fixture text missing');
    text.textStyle = 'body';
    text.lineLimit = 2;

    expect(lintDocument(document)).toEqual(expect.arrayContaining([
      expect.objectContaining({ nodeId: text.id, code: 'DYNAMIC_TYPE', severity: 'info' }),
    ]));
  });

  it('flags an unlabeled toolbar item', () => {
    const document = structuredClone(defaultDocument);
    const screen = document.screens[0];
    if (!screen) throw new Error('Fixture screen missing');
    screen.toolbarItems = [{ id: 'toolbar-empty', title: ' ', placement: 'topBarTrailing' }];

    expect(lintDocument(document)).toEqual(expect.arrayContaining([
      expect.objectContaining({ nodeId: screen.root.id, code: 'ACCESSIBILITY' }),
    ]));
  });

  it('flags a toolbar item with an invalid destination', () => {
    const document = structuredClone(defaultDocument);
    const screen = document.screens[0];
    if (!screen) throw new Error('Fixture screen missing');
    screen.toolbarItems = [{ id: 'toolbar-link', title: '詳細', placement: 'topBarTrailing', destinationScreenId: 'missing-screen' }];

    expect(lintDocument(document)).toEqual(expect.arrayContaining([
      expect.objectContaining({ nodeId: screen.root.id, code: 'NAVIGATION_DESTINATION' }),
    ]));
  });

  it('flags unlabeled and invalid tab bar items', () => {
    const document = structuredClone(defaultDocument);
    const screen = document.screens[0];
    if (!screen) throw new Error('Fixture screen missing');
    screen.tabBarItems = [
      { id: 'empty-tab', title: ' ', placement: 'bottomBar' },
      { id: 'broken-tab', title: '詳細', placement: 'bottomBar', destinationScreenId: 'missing-screen' },
    ];

    expect(lintDocument(document)).toEqual(expect.arrayContaining([
      expect.objectContaining({ nodeId: screen.root.id, code: 'ACCESSIBILITY' }),
      expect.objectContaining({ nodeId: screen.root.id, code: 'NAVIGATION_DESTINATION' }),
    ]));
  });

  it('flags a swipe destination that points back to the same screen', () => {
    const document = structuredClone(defaultDocument);
    const screen = document.screens[0];
    if (!screen) throw new Error('Fixture screen missing');
    screen.swipe = { left: screen.id };

    expect(lintDocument(document)).toEqual(expect.arrayContaining([
      expect.objectContaining({ nodeId: screen.root.id, code: 'NAVIGATION_STRUCTURE' }),
    ]));
  });

  it('checks that NavigationSplitView has sidebar and detail content', () => {
    const document = structuredClone(defaultDocument);
    const split = { id: 'split-test', kind: 'navigation-split-view' as const, children: [{ id: 'sidebar-only', kind: 'list' as const, children: [] }] };
    document.screens[0]?.root.children.push(split);

    expect(lintDocument(document)).toEqual(expect.arrayContaining([
      expect.objectContaining({ nodeId: split.id, code: 'EMPTY_SECTION' }),
    ]));
  });

  it('flags nested scroll containers and non-root split views', () => {
    const document = structuredClone(defaultDocument);
    const scroll = {
      id: 'scroll-test',
      kind: 'scrollview' as const,
      children: [{ id: 'nested-form', kind: 'form' as const, children: [] }],
    };
    const nestedSplit = {
      id: 'nested-split',
      kind: 'navigation-split-view' as const,
      children: [{ id: 'nested-sidebar', kind: 'list' as const, children: [] }, { id: 'nested-detail', kind: 'vstack' as const, children: [] }],
    };
    document.screens[0]?.root.children.push(scroll, {
      id: 'split-wrapper',
      kind: 'vstack',
      children: [nestedSplit],
    });

    expect(lintDocument(document)).toEqual(expect.arrayContaining([
      expect.objectContaining({ nodeId: 'nested-form', code: 'NAVIGATION_STRUCTURE' }),
      expect.objectContaining({ nodeId: 'nested-split', code: 'NAVIGATION_STRUCTURE' }),
    ]));
  });

  it('flags dedicated scroll containers mixed with other root content', () => {
    const document = structuredClone(defaultDocument);
    const screen = document.screens[0];
    if (!screen) throw new Error('Fixture screen missing');
    screen.root.children = [
      { id: 'root-list', kind: 'list', children: [] },
      { id: 'root-note', kind: 'text', text: '補足', fontSize: 17, weight: 'regular' },
    ];

    expect(lintDocument(document)).toEqual(expect.arrayContaining([
      expect.objectContaining({ nodeId: 'root-list', code: 'NAVIGATION_STRUCTURE' }),
    ]));
  });
});
