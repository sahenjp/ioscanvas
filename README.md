# ioscanvas

A browser-based canvas for composing iOS-style interfaces as a semantic SwiftUI-like tree, checking basic Human Interface Guidelines constraints, and exporting implementation-ready SwiftUI.

## What it does

- Build screens from semantic UI nodes instead of freeform coordinates.
- Preview iPhone-style layouts in the browser.
- Edit properties from an inspector.
- Drag components into the screen or into layout containers, then reorder or reparent them.
- Inspect the generated structure tree and use Undo/Redo or Delete/Backspace while editing.
- Duplicate selected elements with Cmd/Ctrl+D, including nested children.
- Save and open validated `.ioscanvas.json` project files.
- Opt into iOS 26 Liquid Glass styles from the Inspector and export the corresponding SwiftUI modifiers.
- Add, duplicate, switch, and remove screens, then inspect them in a read-only Preview mode.
- Use a Layers / Components library with component filtering, canvas zoom, and grid visibility controls.
- Run lightweight HIG checks such as minimum tap-target sizing.
- Export SwiftUI code from the document tree.
- Export a structured implementation prompt when needed.
- Persist the current document locally in the browser.

## Current component set

The first prototype includes a small set of primitives such as:

- Text
- Image (SF Symbol)
- Button
- Toggle
- TextField
- VStack
- HStack
- Section

The intent is to keep the model close to SwiftUI rather than reproduce a generic absolute-position design tool. The preview uses a fixed `NavigationStack` → `ScrollView` screen scaffold; the editable document tree starts at the screen's content `VStack`.

## Architecture

```text
CanvasDocument
├── Screen[]
│   └── CanvasNode[]
│       └── children[]
├── preview
├── HIG checks
├── SwiftUI generator
└── prompt generator
```

The document tree is the source of truth for editing, previewing, validation, and export.

## Development

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run test
npm run lint
npm run build
```

The repository also contains an iOS SwiftUI target under [`ios/`](./ios), built with [xtool](https://github.com/xtool-org/xtool):

```bash
npm run build:ios
```

The first xtool build requires Swift, an iOS Swift SDK, and the one-time xtool setup described in its documentation. `npm run build:all` runs both the browser build and the xtool iOS build.

## Versioning

The project follows Semantic Versioning. The current release line is `1.3.0`.

## Inspiration

This project was inspired by **M3E Canvas by lnkiai** and explores a similar design-to-implementation workflow for SwiftUI and iOS-oriented interfaces.

It is an independent implementation. No M3E Canvas source code is currently copied into this repository.

See [`ACKNOWLEDGEMENTS.md`](./ACKNOWLEDGEMENTS.md) for attribution details.

## Status

Version 1.3.0. The semantic editor, multi-screen workspace, nested drag-and-drop, structure tree, inspector, Preview mode, history controls, project files, SF Symbol images, Liquid Glass styles, HIG checks, SwiftUI export, and an xtool SwiftUI target are present; component coverage is still limited.
