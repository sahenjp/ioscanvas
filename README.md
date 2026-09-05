# ioscanvas

Visual interface composition for SwiftUI.

The editor treats an interface as a structured SwiftUI-oriented document instead of a loose screenshot. Compose a screen, inspect its semantic tree, catch obvious Apple HIG issues, then export SwiftUI or a precise implementation prompt for a coding agent.

> Status: early prototype. The current build proves the document model → preview → HIG lint → SwiftUI/prompt export loop. It is not yet a production UI builder.

## Why

Visual UI tools often optimize for pixels first and leave implementation semantics to guesswork. This approach does the opposite: the editor stores layout and controls as a small typed tree so the generated implementation can preserve intent.

The first milestone intentionally stays narrow:

- SwiftUI-oriented node tree
- iPhone screen preview
- editable text, buttons, toggles, text fields, stacks and sections
- basic HIG linting
- SwiftUI export
- coding-agent prompt export
- local persistence

## Inspiration

This project was inspired by **M3E Canvas by lnkiai**, a browser tool for sketching Material 3 Expressive screens and turning them into prompts for coding tools:

- https://github.com/lnkiai/m3e-canvas
- https://lnkiai.github.io/m3e-canvas/

M3E Canvas is MIT licensed. This is an independent implementation for SwiftUI and Apple-platform semantics. No M3E Canvas source code is copied into this prototype.

Thank you to lnkiai for the original idea and for publishing the project openly.

## Development

```bash
npm install
npm run dev
```

Checks:

```bash
npm run test
npm run lint
npm run build
```

## Architecture

```text
CanvasDocument
└── CanvasScreen[]
    └── root: VStack
        └── CanvasNode[]
            ├── Text
            ├── Button
            ├── Toggle
            ├── TextField
            ├── Section
            ├── VStack / HStack
            ├── Divider
            └── Spacer

CanvasDocument
├── browser preview
├── HIG linter
├── SwiftUI generator
└── implementation-prompt generator
```

The document model is the source of truth. The canvas is a view of that model, not the model itself.

## Design constraints

- Prefer native SwiftUI semantics over reproducing Apple UI with custom web/CSS concepts.
- Do not bundle or redistribute Apple font files or exported SF Symbols assets.
- Generated SwiftUI may reference system-provided symbols and components through Apple APIs.
- Keep the editor visually restrained: this is a tool, not a marketing dashboard.
- Accessibility warnings should be actionable and traceable to a document node.

## Roadmap

### 0.1 — editor loop

Current prototype.

### 0.2 — real composition

- drag from palette and reorder nodes
- drop into stacks and sections
- undo / redo
- document tree panel
- multiple screens
- navigation links / sheets / tabs

### 0.3 — Apple-aware preview

- light / dark appearance
- Dynamic Type sizes
- iPhone / iPad presets
- safe-area visualization
- richer HIG checks

### 0.4 — generation

- deterministic SwiftUI formatting
- navigation/state generation
- JSON document import/export
- optional project template export

## Attribution policy

If the public project continues to draw from M3E Canvas at the concept level, keep the Inspiration section visible in the README and launch post. If source code is ever reused, preserve the relevant MIT copyright and license notice as required by that source.
