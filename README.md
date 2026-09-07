# S3E Canvas

**SwiftUI Experience Engineering Editor** — a browser-based canvas for composing iOS interfaces as a semantic SwiftUI-like tree, checking Human Interface Guidelines constraints, and exporting implementation-ready SwiftUI.

## What it does

- Build screens from semantic UI nodes instead of freeform coordinates.
- Preview iPhone-style layouts in the browser.
- Edit properties from an inspector.
- Drag components into the screen or into layout containers, then reorder or reparent them.
- Move the selected element up or down precisely from the Inspector when drag-and-drop is not convenient.
- Inspect the generated structure tree and use Undo/Redo or Delete/Backspace while editing.
- Duplicate selected elements with Cmd/Ctrl+D, including nested children.
- Save and open validated `.ioscanvas.json` project files.
- Opt into iOS 26 Liquid Glass styles from the Inspector and export the corresponding SwiftUI modifiers.
- Set the app color scheme and tint once, then keep Preview, SwiftUI output, and the implementation brief aligned.
- See a material backdrop in the canvas when Liquid Glass is present, while keeping the exported view native SwiftUI.
- Add, duplicate, switch, and remove screens, then inspect them in a read-only Preview mode.
- Follow NavigationLink transitions directly in Preview to check the screen flow.
- Use a Layers / Parts library with filtering, canvas zoom, and grid visibility controls.
- Compose native `List`, `Form`, and `NavigationLink` patterns across screens, then export the linked SwiftUI views together.
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
- List
- Form
- NavigationLink

The intent is to keep the model close to SwiftUI rather than reproduce a generic absolute-position design tool. Screens use a `NavigationStack` scaffold, while direct `List` and `Form` roots keep their native scrolling behavior; the editable document tree starts at the screen's content `VStack`.

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

S3E Canvas follows Semantic Versioning from `1.0.0`. Earlier `ioscanvas` tags remain as legacy project history.

## Inspiration

This project was inspired by **M3E Canvas by lnkiai** and explores a similar design-to-implementation workflow for SwiftUI and iOS-oriented interfaces.

It is an independent implementation. No M3E Canvas source code is currently copied into this repository.

See [`ACKNOWLEDGEMENTS.md`](./ACKNOWLEDGEMENTS.md) for attribution details.

## Status

Version 1.0.0. The semantic editor, multi-screen workspace, nested drag-and-drop, precise element ordering, structure tree, inspector, Appearance controls, Preview mode with screen flow, history controls, project files, SF Symbol images, Liquid Glass material preview, native List/Form/NavigationLink patterns, HIG checks, linked SwiftUI export, and an xtool SwiftUI target are present.
