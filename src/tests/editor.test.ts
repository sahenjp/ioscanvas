import { beforeEach, describe, expect, it } from 'vitest';
import { defaultDocument } from '../lib/defaultDocument';
import { useEditorStore } from '../store/editor';

beforeEach(() => {
  useEditorStore.setState({
    document: structuredClone(defaultDocument),
    selectedNodeId: null,
    exportOpen: false,
    previewMode: false,
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

  it('keeps one screen when deleting the last remaining screen', () => {
    const store = useEditorStore.getState();

    store.deleteActiveScreen();

    expect(useEditorStore.getState().document.screens).toHaveLength(1);
  });
});
