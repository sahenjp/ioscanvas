import { beforeEach, describe, expect, it } from 'vitest';
import { defaultDocument } from '../lib/defaultDocument';
import { useEditorStore } from '../store/editor';

beforeEach(() => {
  const base = structuredClone(defaultDocument);
  const home = base.screens[0];
  if (!home) throw new Error('Home screen missing');
  useEditorStore.setState({
    document: { ...base, screens: [home], activeScreenId: home.id },
    selectedNodeId: null,
    selectedNodeIds: [],
    exportOpen: false,
    exportTab: 'swiftui',
    previewMode: false,
    clipboard: null,
    past: [],
    future: [],
  });
});

describe('editor screen workflow', () => {
  it('adds and duplicates screens without sharing their node tree', () => {
    const store = useEditorStore.getState();

    store.addScreen();
    const addedScreenId = useEditorStore.getState().document.activeScreenId;
    store.duplicateActiveScreen();

    const document = useEditorStore.getState().document;
    const added = document.screens.find((screen) => screen.id === addedScreenId);
    const duplicate = document.screens.at(-1);
    expect(document.screens).toHaveLength(3);
    expect(duplicate?.id).not.toBe(added?.id);
    expect(duplicate?.root.id).not.toBe(added?.root.id);
  });

  it('wraps existing root content into the detail side of a new split view', () => {
    const store = useEditorStore.getState();
    store.addNode('navigation-split-view');

    const root = useEditorStore.getState().document.screens[0]?.root;
    expect(root?.children).toHaveLength(1);
    const split = root?.children[0];
    expect(split?.kind).toBe('navigation-split-view');
    if (!split || split.kind !== 'navigation-split-view') throw new Error('Split fixture missing');
    expect(split.children[0]?.kind).toBe('list');
    expect(split.children[1]?.children?.map((node) => node.id)).toContain('welcome-title');

    store.undo();
    expect(useEditorStore.getState().document.screens[0]?.root.children.map((node) => node.id)).toContain('welcome-title');
  });

  it('inserts a semantic pattern into the selected container and makes it undoable', () => {
    const store = useEditorStore.getState();
    store.addNode('vstack');
    const parentId = useEditorStore.getState().selectedNodeId;
    if (!parentId) throw new Error('Pattern parent was not created');

    store.addPattern('glass-card', parentId);

    const parent = useEditorStore.getState().document.screens[0]?.root.children.find((node) => node.id === parentId);
    expect(parent?.kind).toBe('vstack');
    expect(parent?.children?.[0]?.kind).toBe('glass-container');
    expect(useEditorStore.getState().selectedNodeId).toBe(parent?.children?.[0]?.id);

    store.undo();
    expect(useEditorStore.getState().document.screens[0]?.root.children.find((node) => node.id === parentId)?.children).toHaveLength(0);
  });

  it('adds an M3E part as one undoable semantic insertion', () => {
    const store = useEditorStore.getState();

    store.addM3eNode('extendedFab');

    const inserted = useEditorStore.getState().document.screens[0]?.root.children.at(-1);
    expect(inserted).toMatchObject({ kind: 'button', m3eKind: 'extendedFab', label: '作成' });
    expect(useEditorStore.getState().past).toHaveLength(1);

    store.undo();
    expect(useEditorStore.getState().document.screens[0]?.root.children.some((node) => node.m3eKind === 'extendedFab')).toBe(false);
  });

  it('adds M3E screen parts through the native screen model', () => {
    const store = useEditorStore.getState();

    store.addM3eScreenPart('topAppBar');
    expect(useEditorStore.getState().document.screens[0]?.toolbarItems).toEqual([
      expect.objectContaining({ placement: 'topBarTrailing', systemName: 'ellipsis.circle' }),
    ]);

    store.undo();
    store.addM3eScreenPart('bottomNav');
    expect(useEditorStore.getState().document.screens[0]?.tabBarItems).toHaveLength(1);

    store.undo();
    store.addM3eScreenPart('navRail');
    expect(useEditorStore.getState().document.screens[0]?.root.children[0]).toMatchObject({ kind: 'navigation-split-view', m3eKind: 'navRail' });
  });

  it('keeps one screen when deleting the last remaining screen', () => {
    const store = useEditorStore.getState();

    store.deleteActiveScreen();

    expect(useEditorStore.getState().document.screens).toHaveLength(1);
  });

  it('clears navigation references when deleting their destination screen', () => {
    const store = useEditorStore.getState();

    store.addScreen();
    const destinationId = useEditorStore.getState().document.activeScreenId;
    store.selectScreen('screen-home');
    store.selectNode('settings-link');
    store.updateSelectedNode({ destinationScreenId: destinationId });
    store.selectScreen(destinationId);
    store.deleteActiveScreen();

    const link = useEditorStore.getState().document.screens[0]?.root.children.find((node) => node.id === 'settings-link');
    expect(link?.kind).toBe('navigation-link');
    if (link?.kind === 'navigation-link') expect(link.destinationScreenId).toBe('');
  });

  it('clears button navigation references when deleting their destination screen', () => {
    const store = useEditorStore.getState();

    store.addScreen();
    const destinationId = useEditorStore.getState().document.activeScreenId;
    store.selectScreen('screen-home');
    store.selectNode('welcome-button');
    store.updateSelectedNode({ destinationScreenId: destinationId });
    store.selectScreen(destinationId);
    store.deleteActiveScreen();

    const button = useEditorStore.getState().document.screens[0]?.root.children.find((node) => node.id === 'welcome-button');
    expect(button?.kind).toBe('button');
    if (button?.kind === 'button') expect(button.destinationScreenId).toBeUndefined();
  });

  it('clears toolbar navigation references when deleting their destination screen', () => {
    const store = useEditorStore.getState();

    store.addScreen();
    const destinationId = useEditorStore.getState().document.activeScreenId;
    store.selectScreen('screen-home');
    store.updateActiveScreen({ toolbarItems: [{ id: 'toolbar-link', title: '詳細', placement: 'topBarTrailing', destinationScreenId: destinationId }] });
    store.selectScreen(destinationId);
    store.deleteActiveScreen();

    const toolbarItem = useEditorStore.getState().document.screens[0]?.toolbarItems?.[0];
    expect(toolbarItem?.destinationScreenId).toBeUndefined();
  });

  it('clears tab bar navigation references when deleting their destination screen', () => {
    const store = useEditorStore.getState();

    store.addScreen();
    const destinationId = useEditorStore.getState().document.activeScreenId;
    store.selectScreen('screen-home');
    store.updateActiveScreen({ tabBarItems: [{ id: 'tab-link', title: '詳細', placement: 'bottomBar', destinationScreenId: destinationId }] });
    store.selectScreen(destinationId);
    store.deleteActiveScreen();

    const tabItem = useEditorStore.getState().document.screens[0]?.tabBarItems?.[0];
    expect(tabItem?.destinationScreenId).toBeUndefined();
  });

  it('gives duplicated screens independent toolbar and tab bar IDs', () => {
    const store = useEditorStore.getState();
    store.updateActiveScreen({
      toolbarItems: [{ id: 'toolbar-home', title: 'ヘルプ', placement: 'topBarTrailing' }],
      tabBarItems: [{ id: 'tab-home', title: 'ホーム', placement: 'bottomBar', selected: true }],
    });

    store.duplicateActiveScreen();

    const screens = useEditorStore.getState().document.screens;
    expect(screens[1]?.toolbarItems?.[0]?.id).not.toBe(screens[0]?.toolbarItems?.[0]?.id);
    expect(screens[1]?.tabBarItems?.[0]?.id).not.toBe(screens[0]?.tabBarItems?.[0]?.id);
  });

  it('reorders screens without changing their identity or active screen', () => {
    const store = useEditorStore.getState();

    store.addScreen();
    const addedScreenId = useEditorStore.getState().document.activeScreenId;
    store.moveActiveScreen('up');

    const document = useEditorStore.getState().document;
    expect(document.screens.map((screen) => screen.id)).toEqual([addedScreenId, 'screen-home']);
    expect(document.activeScreenId).toBe(addedScreenId);
    expect(useEditorStore.getState().past).toHaveLength(2);

    store.moveActiveScreen('up');
    expect(useEditorStore.getState().document.screens.map((screen) => screen.id)).toEqual([addedScreenId, 'screen-home']);
  });

  it('moves the selected node without leaving the semantic parent', () => {
    const store = useEditorStore.getState();

    store.selectNode('welcome-button');
    store.moveSelectedNode('up');

    let children = useEditorStore.getState().document.screens[0]?.root.children;
    expect(children?.map((node) => node.id)).toEqual(['home-symbol', 'welcome-title', 'welcome-button', 'welcome-body', 'settings-link']);

    store.moveSelectedNode('down');
    children = useEditorStore.getState().document.screens[0]?.root.children;
    expect(children?.map((node) => node.id)).toEqual(['home-symbol', 'welcome-title', 'welcome-body', 'welcome-button', 'settings-link']);
  });

  it('keeps appearance changes in undo history', () => {
    const store = useEditorStore.getState();

    store.updateAppearance({ colorScheme: 'dark', accentColor: 'orange' });
    expect(useEditorStore.getState().document.appearance).toEqual({ colorScheme: 'dark', accentColor: 'orange', fontDesign: 'default' });

    store.undo();
    expect(useEditorStore.getState().document.appearance).toEqual({ colorScheme: 'system', accentColor: 'blue', fontDesign: 'default' });
  });

  it('renames the project as an undoable document edit', () => {
    const store = useEditorStore.getState();

    store.updateDocumentName('設定アプリ');

    expect(useEditorStore.getState().document.name).toBe('設定アプリ');
    store.undo();
    expect(useEditorStore.getState().document.name).toBe('新規プロジェクト');
    store.updateDocumentName('   ');
    expect(useEditorStore.getState().document.name).toBe('新規プロジェクト');
  });

  it('edits M3E document metadata as an undoable document edit', () => {
    const store = useEditorStore.getState();

    store.updateM3eDocumentMetadata({ paletteKey: 'custom', customPalette: { primary: '#123456' }, platform: 'android', brief: 'M3E互換の補足' });

    expect(useEditorStore.getState().document.m3eMetadata).toEqual({ paletteKey: 'custom', customPalette: { primary: '#123456' }, platform: 'android', brief: 'M3E互換の補足' });
    store.undo();
    expect(useEditorStore.getState().document.m3eMetadata).toBeUndefined();
  });

  it('tidies SwiftUI spacing and hit targets in one undoable edit', () => {
    const current = useEditorStore.getState().document;
    const document = structuredClone(current);
    const screen = document.screens[0];
    if (!screen) throw new Error('Home screen missing');
    screen.root.spacing = 4;
    screen.root.alignment = 'trailing';
    screen.root.children.push({
      id: 'tight-stack',
      kind: 'hstack',
      spacing: 1,
      children: [{ id: 'small-button', kind: 'button', label: '実行', role: 'normal', minHeight: 20 }],
    });
    useEditorStore.setState({ document });

    useEditorStore.getState().tidyActiveScreen();

    const tidied = useEditorStore.getState().document.screens[0];
    if (!tidied) throw new Error('Tidied screen missing');
    expect(tidied.root.spacing).toBe(16);
    expect(tidied.root.alignment).toBe('leading');
    const stack = tidied.root.children.find((node) => node.id === 'tight-stack');
    if (!stack || stack.kind !== 'hstack') throw new Error('Stack fixture missing');
    expect(stack.spacing).toBe(8);
    expect(stack.children[0]?.kind).toBe('button');
    if (stack.children[0]?.kind === 'button') expect(stack.children[0].minHeight).toBe(44);

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().document.screens[0]?.root.spacing).toBe(4);
    expect(useEditorStore.getState().past).toHaveLength(0);
  });

  it('copies and pastes a selected node as a fresh tree', () => {
    const store = useEditorStore.getState();

    store.selectNode('welcome-button');
    store.copySelectedNode();
    store.pasteNode();

    const children = useEditorStore.getState().document.screens[0]?.root.children ?? [];
    expect(children).toHaveLength(6);
    expect(children[4]?.kind).toBe('button');
    expect(children[4]?.id).not.toBe('welcome-button');
  });

  it('groups selected siblings while keeping their order and history', () => {
    const store = useEditorStore.getState();

    store.selectNode('welcome-title');
    store.toggleNodeSelection('welcome-button');
    store.groupSelectedNodes();

    const groupedChildren = useEditorStore.getState().document.screens[0]?.root.children ?? [];
    const group = groupedChildren.find((node) => node.kind === 'group');
    expect(group?.kind).toBe('group');
    if (group?.kind !== 'group') throw new Error('Group node was not created');
    expect(group.children.map((node) => node.id)).toEqual(['welcome-title', 'welcome-button']);
    expect(useEditorStore.getState().selectedNodeIds).toEqual([group.id]);

    store.undo();
    expect(useEditorStore.getState().document.screens[0]?.root.children.map((node) => node.id)).toEqual([
      'home-symbol',
      'welcome-title',
      'welcome-body',
      'welcome-button',
      'settings-link',
    ]);

    store.redo();
    expect(useEditorStore.getState().document.screens[0]?.root.children.find((node) => node.id === group.id)?.kind).toBe('group');
  });

  it('ungroups a Group while preserving child order and selection', () => {
    const store = useEditorStore.getState();

    store.selectNode('welcome-title');
    store.toggleNodeSelection('welcome-button');
    store.groupSelectedNodes();
    const group = useEditorStore.getState().selectedNodeId;
    if (!group) throw new Error('Group was not created');

    store.ungroupSelectedNode();

    const children = useEditorStore.getState().document.screens[0]?.root.children ?? [];
    expect(children.map((node) => node.id)).toEqual([
      'home-symbol',
      'welcome-title',
      'welcome-button',
      'welcome-body',
      'settings-link',
    ]);
    expect(useEditorStore.getState().selectedNodeIds).toEqual(['welcome-title', 'welcome-button']);
    expect(children.some((node) => node.id === group)).toBe(false);
  });

  it('does not group nodes from different semantic parents', () => {
    const store = useEditorStore.getState();

    store.addNode('vstack');
    const parentId = useEditorStore.getState().selectedNodeId;
    if (!parentId) throw new Error('Container was not created');
    store.addNode('text', parentId);
    const childId = useEditorStore.getState().selectedNodeId;
    if (!childId) throw new Error('Nested node was not created');

    store.selectNode('welcome-title');
    store.toggleNodeSelection(childId);
    store.groupSelectedNodes();

    const children = useEditorStore.getState().document.screens[0]?.root.children ?? [];
    expect(children.filter((node) => node.kind === 'group')).toHaveLength(0);
    expect(useEditorStore.getState().past).toHaveLength(2);
  });

  it('deletes all selected siblings in one history step', () => {
    const store = useEditorStore.getState();

    store.selectNode('welcome-title');
    store.toggleNodeSelection('welcome-button');
    store.deleteSelectedNode();

    const children = useEditorStore.getState().document.screens[0]?.root.children ?? [];
    expect(children.map((node) => node.id)).toEqual(['home-symbol', 'welcome-body', 'settings-link']);
    expect(useEditorStore.getState().selectedNodeIds).toEqual([]);

    store.undo();
    expect(useEditorStore.getState().document.screens[0]?.root.children.map((node) => node.id)).toContain('welcome-title');
    expect(useEditorStore.getState().document.screens[0]?.root.children.map((node) => node.id)).toContain('welcome-button');
  });

  it('applies shared styles to multiple selected nodes in one history step', () => {
    const store = useEditorStore.getState();

    store.selectNode('welcome-title');
    store.toggleNodeSelection('welcome-body');
    store.updateSelectedNodes({ background: 'secondary', frameWidth: 'max', padding: 12 });

    const children = useEditorStore.getState().document.screens[0]?.root.children ?? [];
    const title = children.find((node) => node.id === 'welcome-title');
    const body = children.find((node) => node.id === 'welcome-body');
    expect(title?.background).toBe('secondary');
    expect(body?.background).toBe('secondary');
    expect(title?.frameWidth).toBe('max');
    expect(body?.padding).toBe(12);
    expect(useEditorStore.getState().past).toHaveLength(1);

    store.undo();
    expect(useEditorStore.getState().document.screens[0]?.root.children.find((node) => node.id === 'welcome-title')?.background).toBeUndefined();
  });
});
