import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { defaultDocument } from '../lib/defaultDocument';
import { createNode, findNode, removeNode, updateNode } from '../lib/nodes';
import type { CanvasDocument, CanvasNode, NodeKind } from '../types/document';

interface EditorState {
  document: CanvasDocument;
  selectedNodeId: string | null;
  exportOpen: boolean;
  selectNode: (id: string | null) => void;
  setExportOpen: (open: boolean) => void;
  addNode: (kind: NodeKind) => void;
  updateSelectedNode: (patch: Partial<CanvasNode>) => void;
  deleteSelectedNode: () => void;
  resetDocument: () => void;
}

function activeScreen(document: CanvasDocument) {
  return document.screens.find((screen) => screen.id === document.activeScreenId) ?? document.screens[0];
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      document: defaultDocument,
      selectedNodeId: null,
      exportOpen: false,
      selectNode: (id) => set({ selectedNodeId: id }),
      setExportOpen: (open) => set({ exportOpen: open }),
      addNode: (kind) => {
        const node = createNode(kind);
        set((state) => {
          const screen = activeScreen(state.document);
          if (!screen) return state;
          return {
            document: {
              ...state.document,
              screens: state.document.screens.map((candidate) =>
                candidate.id === screen.id
                  ? {
                      ...candidate,
                      root: {
                        ...candidate.root,
                        children: [...candidate.root.children, node],
                      },
                    }
                  : candidate,
              ),
            },
            selectedNodeId: node.id,
          };
        });
      },
      updateSelectedNode: (patch) => {
        const id = get().selectedNodeId;
        if (!id) return;
        set((state) => {
          const screen = activeScreen(state.document);
          if (!screen || !findNode(screen.root.children, id)) return state;
          return {
            document: {
              ...state.document,
              screens: state.document.screens.map((candidate) =>
                candidate.id === screen.id
                  ? {
                      ...candidate,
                      root: {
                        ...candidate.root,
                        children: updateNode(candidate.root.children, id, patch),
                      },
                    }
                  : candidate,
              ),
            },
          };
        });
      },
      deleteSelectedNode: () => {
        const id = get().selectedNodeId;
        if (!id) return;
        set((state) => {
          const screen = activeScreen(state.document);
          if (!screen) return state;
          return {
            document: {
              ...state.document,
              screens: state.document.screens.map((candidate) =>
                candidate.id === screen.id
                  ? {
                      ...candidate,
                      root: {
                        ...candidate.root,
                        children: removeNode(candidate.root.children, id),
                      },
                    }
                  : candidate,
              ),
            },
            selectedNodeId: null,
          };
        });
      },
      resetDocument: () => set({ document: defaultDocument, selectedNodeId: null }),
    }),
    {
      name: 'ioscanvas-document',
      partialize: (state) => ({ document: state.document }),
    },
  ),
);
