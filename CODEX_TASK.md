# Codex task — 0.2

Continue the existing prototype. Do not rebuild it from scratch.

## Goal

Make composition real: users should be able to drag components from the palette, reorder them, and nest supported components inside VStack, HStack, and Section while preserving the typed CanvasDocument model.

## Required work

1. Read `README.md`, `AGENTS.md`, and the existing `src/types/document.ts` before editing.
2. Replace the palette's current click-only insertion with real dnd-kit dragging, while keeping click-to-add as an accessible fallback.
3. Add sortable behavior to nodes inside a container.
4. Allow drops into `vstack`, `hstack`, and `section` containers.
5. Add a compact document-tree view. It may replace part of the left panel; do not add another permanent wide panel.
6. Implement undo/redo for document mutations. Keep a bounded history (for example 50 states); do not persist the full history to localStorage.
7. Add keyboard shortcuts:
   - Cmd/Ctrl+Z: undo
   - Cmd/Ctrl+Shift+Z: redo
   - Delete/Backspace: delete selected node when an input is not focused
   - Escape: clear selection
8. Preserve the current HIG lint and SwiftUI/prompt export behavior.
9. Add unit tests for tree move/nesting logic and undo/redo.
10. Keep the UI visually restrained and consistent with the existing editor.

## Important constraints

- `CanvasDocument` remains the source of truth.
- Do not use absolute x/y positioning for SwiftUI content.
- Do not implement an infinite freeform canvas.
- Do not add AI APIs, authentication, databases, analytics, payments, collaboration, or a backend.
- Do not bundle Apple fonts or exported SF Symbols.
- Do not copy M3E Canvas source code. Concept attribution in README/ACKNOWLEDGEMENTS must remain.
- Do not commit or push unless separately instructed.

## Acceptance checks

Run and fix issues from:

```bash
npm run test
npm run lint
npm run build
```

Then manually verify:

- Text can be dragged from palette into the root screen.
- Button can be dragged into a VStack.
- Nodes can be reordered within a container.
- A nested node can be moved back to root.
- Undo/redo restores exact tree structure and selection remains sane.
- Exported SwiftUI reflects the new order/nesting.
- Existing persisted documents either migrate safely or fall back without crashing.

Keep the implementation focused on this milestone.
