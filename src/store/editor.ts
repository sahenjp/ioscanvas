import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { defaultDocument } from '../lib/defaultDocument';
import { cloneNode, createNode, findNode, findNodeLocation, insertNode, isContainerNode, moveNode as moveTreeNode, removeNode, updateNode } from '../lib/nodes';
import type { CanvasDocument, CanvasNode, CanvasScreen, NodeKind } from '../types/document';

const MAX_HISTORY = 50;

interface EditorState {
  document: CanvasDocument;
  selectedNodeId: string | null;
  exportOpen: boolean;
  past: CanvasDocument[];
  future: CanvasDocument[];
  selectNode: (id: string | null) => void;
  setExportOpen: (open: boolean) => void;
  addNode: (kind: NodeKind, parentId?: string | null, index?: number) => void;
  duplicateSelectedNode: () => void;
  moveNode: (nodeId: string, parentId: string | null, index?: number) => void;
  updateSelectedNode: (patch: Partial<CanvasNode>) => void;
  updateActiveScreen: (patch: Partial<Pick<CanvasScreen, 'name' | 'navigationTitle'>>) => void;
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
): Partial<EditorState> {
  return {
    document,
    past: [...state.past, state.document].slice(-MAX_HISTORY),
    future: [],
    selectedNodeId,
  };
}

function selectedNodeExists(document: CanvasDocument, id: string | null): boolean {
  if (!id) return false;
  return document.screens.some((screen) => screen.root.id === id || Boolean(findNode(screen.root.children, id)));
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      document: cloneDocument(defaultDocument),
      selectedNodeId: null,
      exportOpen: false,
      past: [],
      future: [],
      selectNode: (id) => set({ selectedNodeId: id }),
      setExportOpen: (open) => set({ exportOpen: open }),
      addNode: (kind, parentId = null, index) => {
        const node = createNode(kind);
        set((state) => {
          const screen = activeScreen(state.document);
          if (!screen) return state;

          if (parentId === null) {
            const children = [...screen.root.children];
            const position = index === undefined ? children.length : Math.max(0, Math.min(index, children.length));
            children.splice(position, 0, node);
            return withHistory(state, replaceScreenChildren(state.document, screen.id, children), node.id);
          }

          const target = findNode(screen.root.children, parentId);
          if (!target || !isContainerNode(target)) return state;
          const inserted = insertNode(screen.root.children, parentId, node, index);
          return withHistory(state, replaceScreenChildren(state.document, screen.id, inserted), node.id);
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
      moveNode: (nodeId, parentId, index) => {
        set((state) => {
          const screen = activeScreen(state.document);
          if (!screen) return state;
          const nextChildren = moveTreeNode(screen.root.children, nodeId, parentId, index);
          if (nextChildren === screen.root.children) return state;
          return withHistory(state, replaceScreenChildren(state.document, screen.id, nextChildren), nodeId);
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
      deleteSelectedNode: () => {
        const id = get().selectedNodeId;
        if (!id) return;
        set((state) => {
          const screen = activeScreen(state.document);
          if (!screen || !findNode(screen.root.children, id)) return state;
          const nextChildren = removeNode(screen.root.children, id);
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
          };
        });
      },
      resetDocument: () => {
        set((state) => withHistory(state, cloneDocument(defaultDocument), null));
      },
      loadDocument: (document) => {
        set((state) => withHistory(state, cloneDocument(document), null));
      },
    }),
    {
      name: 'ioscanvas-document',
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
