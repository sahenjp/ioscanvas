import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { defaultDocument } from '../lib/defaultDocument';
import { parseCanvasDocument } from '../lib/document';
import { cloneNode, createId, createM3eNode, createM3eScreenNode, createNode, createPattern, findNode, findNodeLocation, insertNode, isContainerNode, moveNode as moveTreeNode, removeNode, updateNode } from '../lib/nodes';
import type { CanvasDocument, CanvasNode, CanvasScreen, ContainerNode, DocumentAppearance, M3eInsertKind, M3eScreenPartKind, NodeKind, PatternId, ToolbarItem } from '../types/document';

const MAX_HISTORY = 50;

interface EditorState {
  document: CanvasDocument;
  selectedNodeId: string | null;
  selectedNodeIds: string[];
  exportOpen: boolean;
  previewMode: boolean;
  clipboard: CanvasNode | null;
  past: CanvasDocument[];
  future: CanvasDocument[];
  selectNode: (id: string | null) => void;
  toggleNodeSelection: (id: string) => void;
  selectScreen: (id: string) => void;
  setPreviewMode: (open: boolean) => void;
  setExportOpen: (open: boolean) => void;
  addNode: (kind: NodeKind, parentId?: string | null, index?: number) => void;
  addM3eNode: (kind: M3eInsertKind, parentId?: string | null, index?: number) => void;
  addM3eScreenPart: (kind: M3eScreenPartKind) => void;
  addPattern: (pattern: PatternId, parentId?: string | null, index?: number) => void;
  tidyActiveScreen: () => void;
  moveActiveScreen: (direction: 'up' | 'down') => void;
  addScreen: () => void;
  duplicateActiveScreen: () => void;
  deleteActiveScreen: () => void;
  duplicateSelectedNode: () => void;
  groupSelectedNodes: () => void;
  ungroupSelectedNode: () => void;
  copySelectedNode: () => void;
  cutSelectedNode: () => void;
  pasteNode: () => void;
  moveNode: (nodeId: string, parentId: string | null, index?: number) => void;
  moveSelectedNode: (direction: 'up' | 'down') => void;
  updateSelectedNode: (patch: Partial<CanvasNode>) => void;
  updateSelectedNodes: (patch: Partial<CanvasNode>) => void;
  updateDocumentName: (name: string) => void;
  updateActiveScreen: (patch: Partial<Pick<CanvasScreen, 'name' | 'navigationTitle' | 'notes' | 'navigationTitleDisplayMode' | 'contentPlacement' | 'background' | 'previewDevice' | 'previewOrientation' | 'toolbarItems' | 'tabBarItems' | 'm3eTopAppBar' | 'm3eBottomNav' | 'swipe'>>) => void;
  updateAppearance: (patch: Partial<DocumentAppearance>) => void;
  deleteSelectedNode: () => void;
  loadDocument: (document: CanvasDocument) => void;
  undo: () => void;
  redo: () => void;
  resetDocument: () => void;
}

function activeScreen(document: CanvasDocument) {
  return document.screens.find((screen) => screen.id === document.activeScreenId) ?? document.screens[0];
}

function cloneDocument(document: CanvasDocument): CanvasDocument {
  return structuredClone(document);
}

function withHistory(
  state: EditorState,
  document: CanvasDocument,
  selectedNodeId = state.selectedNodeId,
  selectedNodeIds = selectedNodeId === state.selectedNodeId
    ? state.selectedNodeIds
    : selectedNodeId ? [selectedNodeId] : [],
): Partial<EditorState> {
  return {
    document,
    past: [...state.past, state.document].slice(-MAX_HISTORY),
    future: [],
    selectedNodeId,
    selectedNodeIds,
  };
}

function selectedNodeExists(document: CanvasDocument, id: string | null): boolean {
  if (!id) return false;
  return document.screens.some((screen) => screen.root.id === id || Boolean(findNode(screen.root.children, id)));
}

function clearScreenReferences(nodes: CanvasNode[], screenId: string): CanvasNode[] {
  return nodes.map((node) => {
    const updated = node.kind === 'navigation-link' && node.destinationScreenId === screenId
      ? { ...node, destinationScreenId: '' }
      : node.kind === 'button' && node.destinationScreenId === screenId
        ? { ...node, destinationScreenId: undefined }
        : node;
    return updated.children
      ? ({ ...updated, children: clearScreenReferences(updated.children, screenId) } as CanvasNode)
      : updated;
  });
}

function clearSwipeReferences(
  swipe: CanvasScreen['swipe'],
  screenId: string,
): CanvasScreen['swipe'] {
  if (!swipe) return undefined;
  const next = Object.fromEntries(Object.entries(swipe).filter(([, destination]) => destination !== screenId));
  return Object.keys(next).length > 0 ? next as CanvasScreen['swipe'] : undefined;
}

function addNodeToActiveScreen(
  state: EditorState,
  node: CanvasNode,
  parentId: string | null = null,
  index?: number,
): Partial<EditorState> {
  const screen = activeScreen(state.document);
  if (!screen) return state;

  if (parentId === null) {
    if (node.kind === 'navigation-split-view' && !screen.root.children.some((child) => child.kind === 'navigation-split-view')) {
      if (!isContainerNode(node)) return state;
      const detail = node.children[1];
      if (detail && isContainerNode(detail)) detail.children = [...screen.root.children];
      return withHistory(state, replaceScreenChildren(state.document, screen.id, [node]), node.id);
    }
    const children = [...screen.root.children];
    const position = index === undefined ? children.length : Math.max(0, Math.min(index, children.length));
    children.splice(position, 0, node);
    return withHistory(state, replaceScreenChildren(state.document, screen.id, children), node.id);
  }

  const target = findNode(screen.root.children, parentId);
  if (!target || !isContainerNode(target)) return state;
  const inserted = insertNode(screen.root.children, parentId, node, index);
  return withHistory(state, replaceScreenChildren(state.document, screen.id, inserted), node.id);
}

function addM3eScreenPartToActiveScreen(state: EditorState, kind: M3eScreenPartKind): Partial<EditorState> {
  const screen = activeScreen(state.document);
  if (!screen) return state;

  if (kind === 'navRail') return addNodeToActiveScreen(state, createM3eScreenNode(kind));

  const screenIndex = state.document.screens.findIndex((candidate) => candidate.id === screen.id);
  if (kind === 'topAppBar') {
    if ((screen.toolbarItems ?? []).some((item) => item.placement === 'topBarLeading' || item.placement === 'topBarTrailing')) return state;
    const toolbarItems: ToolbarItem[] = [
      ...(screenIndex > 0 ? [{ id: createId('toolbar'), title: '戻る', systemName: 'chevron.left', placement: 'topBarLeading' as const, navigationAction: 'back' as const, navigationTransition: 'slideLeft' as const }] : []),
      { id: createId('toolbar'), title: 'その他', systemName: 'ellipsis.circle', placement: 'topBarTrailing' },
    ];
    const document = {
      ...state.document,
      screens: state.document.screens.map((candidate) => candidate.id === screen.id ? { ...candidate, toolbarItems } : candidate),
    };
    return withHistory(state, document, null);
  }

  if ((screen.tabBarItems ?? []).length > 0) return state;
  const tabBarItems: ToolbarItem[] = state.document.screens.slice(0, 4).map((candidate, index) => ({
    id: createId('tab'),
    title: candidate.name,
    systemName: ['house.fill', 'star.fill', 'gearshape.fill', 'ellipsis.circle'][index] ?? 'circle',
    placement: 'bottomBar',
    selected: candidate.id === screen.id,
    ...(candidate.id === screen.id ? {} : { destinationScreenId: candidate.id }),
  }));
  const document = {
    ...state.document,
    screens: state.document.screens.map((candidate) => candidate.id === screen.id ? { ...candidate, tabBarItems } : candidate),
  };
  return withHistory(state, document, null);
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      document: cloneDocument(defaultDocument),
      selectedNodeId: null,
      selectedNodeIds: [],
      exportOpen: false,
      previewMode: false,
      clipboard: null,
      past: [],
      future: [],
      selectNode: (id) => set({ selectedNodeId: id, selectedNodeIds: id ? [id] : [] }),
      toggleNodeSelection: (id) => {
        set((state) => {
          const selected = state.selectedNodeIds.includes(id)
            ? state.selectedNodeIds.filter((candidate) => candidate !== id)
            : [...state.selectedNodeIds, id];
          return {
            selectedNodeIds: selected,
            selectedNodeId: selected.at(-1) ?? null,
          };
        });
      },
      selectScreen: (id) => {
        set((state) => {
          if (!state.document.screens.some((screen) => screen.id === id)) return state;
          if (state.document.activeScreenId === id) return state;
          return { document: { ...state.document, activeScreenId: id }, selectedNodeId: null, selectedNodeIds: [] };
        });
      },
      setPreviewMode: (open) => set({ previewMode: open, selectedNodeId: open ? null : get().selectedNodeId, selectedNodeIds: open ? [] : get().selectedNodeIds }),
      setExportOpen: (open) => set({ exportOpen: open }),
      addNode: (kind, parentId = null, index) => {
        set((state) => addNodeToActiveScreen(state, createNode(kind), parentId, index));
      },
      addM3eNode: (kind, parentId = null, index) => {
        set((state) => addNodeToActiveScreen(state, createM3eNode(kind), parentId, index));
      },
      addM3eScreenPart: (kind) => {
        set((state) => addM3eScreenPartToActiveScreen(state, kind));
      },
      addPattern: (pattern, parentId = null, index) => {
        const node = createPattern(pattern);
        set((state) => {
          const screen = activeScreen(state.document);
          if (!screen) return state;
          if (parentId !== null) {
            const target = findNode(screen.root.children, parentId);
            if (!target || !isContainerNode(target)) return state;
          }
          const nextChildren = insertNode(screen.root.children, parentId, node, index);
          return withHistory(state, replaceScreenChildren(state.document, screen.id, nextChildren), node.id);
        });
      },
      tidyActiveScreen: () => {
        set((state) => {
          const screen = activeScreen(state.document);
          if (!screen) return state;

          const root = tidyNode(screen.root);
          if (JSON.stringify(root) === JSON.stringify(screen.root)) return state;

          const document = {
            ...state.document,
            screens: state.document.screens.map((candidate) => candidate.id === screen.id ? { ...candidate, root } : candidate),
          };
          return withHistory(state, document);
        });
      },
      moveActiveScreen: (direction) => {
        set((state) => {
          const index = state.document.screens.findIndex((screen) => screen.id === state.document.activeScreenId);
          const targetIndex = direction === 'up' ? index - 1 : index + 1;
          if (index < 0 || targetIndex < 0 || targetIndex >= state.document.screens.length) return state;

          const screens = [...state.document.screens];
          const current = screens[index];
          const target = screens[targetIndex];
          if (!current || !target) return state;
          screens[index] = target;
          screens[targetIndex] = current;
          return withHistory(state, { ...state.document, screens });
        });
      },
      addScreen: () => {
        set((state) => {
          const number = state.document.screens.length + 1;
          const screen: CanvasScreen = {
            id: createId('screen'),
            name: `画面 ${number}`,
            navigationTitle: `画面 ${number}`,
            root: { id: createId('root'), kind: 'vstack', spacing: 16, children: [] },
          };
          return withHistory(state, {
            ...state.document,
            screens: [...state.document.screens, screen],
            activeScreenId: screen.id,
          }, null);
        });
      },
      duplicateActiveScreen: () => {
        set((state) => {
          const screen = activeScreen(state.document);
          if (!screen) return state;
          const root = cloneNode(screen.root);
          if (!isContainerNode(root)) return state;
          const duplicate: CanvasScreen = {
            ...screen,
            id: createId('screen'),
            name: `${screen.name} のコピー`,
            ...(screen.toolbarItems ? { toolbarItems: screen.toolbarItems.map((item) => ({ ...item, id: createId('toolbar') })) } : {}),
            ...(screen.tabBarItems ? { tabBarItems: screen.tabBarItems.map((item) => ({ ...item, id: createId('tab') })) } : {}),
            root,
          };
          return withHistory(state, {
            ...state.document,
            screens: [...state.document.screens, duplicate],
            activeScreenId: duplicate.id,
          }, null);
        });
      },
      deleteActiveScreen: () => {
        set((state) => {
          if (state.document.screens.length <= 1) return state;
          const deletedScreenId = state.document.activeScreenId;
          const index = state.document.screens.findIndex((screen) => screen.id === deletedScreenId);
          if (index < 0) return state;
          const screens = state.document.screens
            .filter((screen) => screen.id !== deletedScreenId)
            .map((screen) => ({
              ...screen,
              root: { ...screen.root, children: clearScreenReferences(screen.root.children, deletedScreenId) },
              toolbarItems: screen.toolbarItems?.map((item) => item.destinationScreenId === deletedScreenId ? { ...item, destinationScreenId: undefined } : item),
              tabBarItems: screen.tabBarItems?.map((item) => item.destinationScreenId === deletedScreenId ? { ...item, destinationScreenId: undefined } : item),
              swipe: clearSwipeReferences(screen.swipe, deletedScreenId),
            }));
          const nextScreen = screens[Math.max(0, index - 1)] ?? screens[0];
          if (!nextScreen) return state;
          return withHistory(state, {
            ...state.document,
            screens,
            activeScreenId: nextScreen.id,
          }, null);
        });
      },
      duplicateSelectedNode: () => {
        const id = get().selectedNodeId;
        if (!id) return;
        set((state) => {
          const screen = activeScreen(state.document);
          const source = screen && findNodeLocation(screen.root.children, id);
          if (!screen || !source) return state;
          const duplicate = cloneNode(source.node);
          const nextChildren = insertNode(screen.root.children, source.parentId, duplicate, source.index + 1);
          return withHistory(state, replaceScreenChildren(state.document, screen.id, nextChildren), duplicate.id);
        });
      },
      groupSelectedNodes: () => {
        set((state) => {
          const ids = state.selectedNodeIds.length > 0
            ? state.selectedNodeIds
            : state.selectedNodeId ? [state.selectedNodeId] : [];
          if (ids.length < 2) return state;

          const screen = activeScreen(state.document);
          const locations = screen
            ? ids.flatMap((id) => {
              const location = findNodeLocation(screen.root.children, id);
              return location ? [location] : [];
            })
            : [];
          if (!screen || locations.length !== ids.length) return state;
          const firstLocation = locations[0];
          if (!firstLocation) return state;

          const parentId = firstLocation.parentId;
          if (locations.some((location) => location.parentId !== parentId)) return state;

          const selected = locations
            .slice()
            .sort((left, right) => left.index - right.index)
            .map((location) => location.node);
          let sourceChildren = screen.root.children;
          if (parentId !== null) {
            const parent = findNode(screen.root.children, parentId);
            if (!parent || !isContainerNode(parent)) return state;
            sourceChildren = parent.children;
          }
          const selectedSet = new Set(ids);
          const firstIndex = Math.min(...locations.map((location) => location.index));
          const insertionIndex = sourceChildren.slice(0, firstIndex).filter((node) => !selectedSet.has(node.id)).length;
          const remaining = sourceChildren.filter((node) => !selectedSet.has(node.id));
          const group = createNode('group');
          if (!isContainerNode(group)) return state;
          group.children = selected;
          remaining.splice(insertionIndex, 0, group);

          return withHistory(
            state,
            replaceChildrenAtParent(state.document, screen.id, parentId, remaining),
            group.id,
            [group.id],
          );
        });
      },
      ungroupSelectedNode: () => {
        const id = get().selectedNodeId;
        if (!id) return;
        set((state) => {
          const screen = activeScreen(state.document);
          const source = screen && findNodeLocation(screen.root.children, id);
          if (!screen || !source || source.node.kind !== 'group') return state;

          const siblings = source.parentId === null
            ? screen.root.children
            : (() => {
                const parent = findNode(screen.root.children, source.parentId ?? '');
                return parent && isContainerNode(parent) ? parent.children : undefined;
              })();
          if (!siblings) return state;

          const expanded = [
            ...siblings.slice(0, source.index),
            ...source.node.children,
            ...siblings.slice(source.index + 1),
          ];
          return withHistory(
            state,
            replaceChildrenAtParent(state.document, screen.id, source.parentId, expanded),
            source.node.children.at(-1)?.id ?? null,
            source.node.children.map((child) => child.id),
          );
        });
      },
      copySelectedNode: () => {
        const id = get().selectedNodeId;
        if (!id) return;
        const state = get();
        const screen = activeScreen(state.document);
        const source = screen && findNodeLocation(screen.root.children, id);
        if (!source) return;
        set({ clipboard: structuredClone(source.node) });
      },
      cutSelectedNode: () => {
        const id = get().selectedNodeId;
        if (!id) return;
        set((state) => {
          const screen = activeScreen(state.document);
          const source = screen && findNodeLocation(screen.root.children, id);
          if (!screen || !source) return state;
          return {
            ...withHistory(state, replaceScreenChildren(state.document, screen.id, removeNode(screen.root.children, id)), null),
            clipboard: structuredClone(source.node),
          };
        });
      },
      pasteNode: () => {
        const clipboard = get().clipboard;
        if (!clipboard) return;
        set((state) => {
          const screen = activeScreen(state.document);
          if (!screen) return state;
          const selected = state.selectedNodeId ? findNodeLocation(screen.root.children, state.selectedNodeId) : undefined;
          const selectedNode = state.selectedNodeId ? findNode(screen.root.children, state.selectedNodeId) : undefined;
          const parentId = selectedNode && isContainerNode(selectedNode)
            ? selectedNode.id
            : selected?.parentId ?? null;
          const index = selectedNode && isContainerNode(selectedNode)
            ? selectedNode.children.length
            : selected ? selected.index + 1 : screen.root.children.length;
          const pasted = cloneNode(clipboard);
          const nextChildren = insertNode(screen.root.children, parentId, pasted, index);
          return withHistory(state, replaceScreenChildren(state.document, screen.id, nextChildren), pasted.id);
        });
      },
      moveNode: (nodeId, parentId, index) => {
        set((state) => {
          const screen = activeScreen(state.document);
          if (!screen) return state;
          const nextChildren = moveTreeNode(screen.root.children, nodeId, parentId, index);
          if (nextChildren === screen.root.children) return state;
          return withHistory(state, replaceScreenChildren(state.document, screen.id, nextChildren), nodeId);
        });
      },
      moveSelectedNode: (direction) => {
        const id = get().selectedNodeId;
        if (!id) return;
        set((state) => {
          const screen = activeScreen(state.document);
          const source = screen && findNodeLocation(screen.root.children, id);
          if (!screen || !source) return state;

          const parent = source.parentId ? findNode(screen.root.children, source.parentId) : undefined;
          const siblings = source.parentId === null
            ? screen.root.children
            : parent && isContainerNode(parent) ? parent.children : undefined;
          if (!siblings) return state;

          const index = direction === 'up' ? source.index - 1 : source.index + 2;
          if (index < 0 || index > siblings.length) return state;

          const nextChildren = moveTreeNode(screen.root.children, id, source.parentId, index);
          return withHistory(state, replaceScreenChildren(state.document, screen.id, nextChildren), id);
        });
      },
      updateSelectedNode: (patch) => {
        const id = get().selectedNodeId;
        if (!id) return;
        set((state) => {
          const screen = activeScreen(state.document);
          if (!screen || !findNode(screen.root.children, id)) return state;
          const nextChildren = updateNode(screen.root.children, id, patch);
          return withHistory(state, replaceScreenChildren(state.document, screen.id, nextChildren));
        });
      },
      updateSelectedNodes: (patch) => {
        const ids = get().selectedNodeIds;
        if (ids.length < 2) return;
        set((state) => {
          const screen = activeScreen(state.document);
          if (!screen) return state;
          const nextChildren = ids.reduce(
            (children, id) => updateNode(children, id, patch),
            screen.root.children,
          );
          if (JSON.stringify(nextChildren) === JSON.stringify(screen.root.children)) return state;
          return withHistory(state, replaceScreenChildren(state.document, screen.id, nextChildren));
        });
      },
      updateDocumentName: (name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set((state) => state.document.name === trimmed
          ? state
          : withHistory(state, { ...state.document, name: trimmed }));
      },
      updateActiveScreen: (patch) => {
        set((state) => {
          const screen = activeScreen(state.document);
          if (!screen) return state;
          const document = {
            ...state.document,
            screens: state.document.screens.map((candidate) =>
              candidate.id === screen.id ? { ...candidate, ...patch } : candidate,
            ),
          };
          return withHistory(state, document);
        });
      },
      updateAppearance: (patch) => {
        set((state) => withHistory(state, {
          ...state.document,
          appearance: { ...state.document.appearance, ...patch },
        }));
      },
      deleteSelectedNode: () => {
        const current = get();
        const ids = current.selectedNodeIds.length > 0
          ? current.selectedNodeIds
          : current.selectedNodeId ? [current.selectedNodeId] : [];
        if (ids.length === 0) return;
        set((state) => {
          const screen = activeScreen(state.document);
          if (!screen || ids.some((id) => !findNode(screen.root.children, id))) return state;
          const nextChildren = ids.reduce((children, id) => removeNode(children, id), screen.root.children);
          return withHistory(state, replaceScreenChildren(state.document, screen.id, nextChildren), null);
        });
      },
      undo: () => {
        set((state) => {
          const previous = state.past.at(-1);
          if (!previous) return state;
          return {
            document: previous,
            past: state.past.slice(0, -1),
            future: [state.document, ...state.future].slice(0, MAX_HISTORY),
            selectedNodeId: selectedNodeExists(previous, state.selectedNodeId) ? state.selectedNodeId : null,
            selectedNodeIds: state.selectedNodeIds.filter((id) => selectedNodeExists(previous, id)),
          };
        });
      },
      redo: () => {
        set((state) => {
          const next = state.future[0];
          if (!next) return state;
          return {
            document: next,
            past: [...state.past, state.document].slice(-MAX_HISTORY),
            future: state.future.slice(1),
            selectedNodeId: selectedNodeExists(next, state.selectedNodeId) ? state.selectedNodeId : null,
            selectedNodeIds: state.selectedNodeIds.filter((id) => selectedNodeExists(next, id)),
          };
        });
      },
      resetDocument: () => {
        set((state) => ({ ...withHistory(state, cloneDocument(defaultDocument), null), clipboard: null, selectedNodeIds: [] }));
      },
      loadDocument: (document) => {
        set((state) => ({ ...withHistory(state, cloneDocument(document), null), clipboard: null, selectedNodeIds: [] }));
      },
    }),
    {
      name: 'ioscanvas-document',
      version: 1,
      migrate: (persistedState) => {
        const document = typeof persistedState === 'object' && persistedState !== null && 'document' in persistedState
          ? parseCanvasDocument(persistedState.document)
          : null;
        return { document: document ?? cloneDocument(defaultDocument) };
      },
      partialize: (state) => ({ document: state.document }),
    },
  ),
);

function replaceScreenChildren(
  document: CanvasDocument,
  screenId: string,
  children: CanvasNode[],
): CanvasDocument {
  return {
    ...document,
    screens: document.screens.map((screen) =>
      screen.id === screenId ? { ...screen, root: { ...screen.root, children } } : screen,
    ),
  };
}

function tidyNode(node: ContainerNode): ContainerNode;
function tidyNode(node: CanvasNode): CanvasNode;
function tidyNode(node: CanvasNode): CanvasNode {
  const normalized = node.kind === 'button'
    || node.kind === 'toggle'
    || node.kind === 'textfield'
    || node.kind === 'searchfield'
    || node.kind === 'securefield'
    || node.kind === 'texteditor'
    || node.kind === 'picker'
    || node.kind === 'slider'
    || node.kind === 'stepper'
    || node.kind === 'menu'
    || node.kind === 'navigation-link'
    || node.kind === 'link'
    || node.kind === 'datepicker'
    || node.kind === 'gauge'
    ? { ...node, minHeight: Math.max(node.minHeight, 44) }
    : { ...node };

  if (!isContainerNode(normalized)) return normalized;

  normalized.children = normalized.children.map(tidyNode);
  switch (normalized.kind) {
    case 'vstack':
    case 'lazyvstack':
      normalized.spacing = 16;
      normalized.alignment = 'leading';
      break;
    case 'hstack':
    case 'lazyhstack':
      normalized.spacing = 8;
      normalized.alignment = 'center';
      break;
    case 'glass-container':
      normalized.spacing = 12;
      break;
    case 'lazyvgrid':
    case 'lazyhgrid':
      normalized.spacing = 12;
      break;
    default:
      break;
  }
  return normalized;
}

function replaceChildrenAtParent(
  document: CanvasDocument,
  screenId: string,
  parentId: string | null,
  children: CanvasNode[],
): CanvasDocument {
  return {
    ...document,
    screens: document.screens.map((screen) => screen.id !== screenId
      ? screen
      : {
          ...screen,
          root: {
            ...screen.root,
            children: parentId === null
              ? children
              : replaceNodeChildren(screen.root.children, parentId, children),
          },
        }),
  };
}

function replaceNodeChildren(nodes: CanvasNode[], parentId: string, children: CanvasNode[]): CanvasNode[] {
  return nodes.map((node) => {
    if (node.id === parentId && isContainerNode(node)) return { ...node, children };
    return node.children
      ? ({ ...node, children: replaceNodeChildren(node.children, parentId, children) } as CanvasNode)
      : node;
  });
}
