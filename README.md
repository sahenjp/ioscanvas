# S3E Canvas

**SwiftUI Experience Engineering Editor** — a browser-based canvas for composing iOS interfaces as a semantic SwiftUI-like tree, checking Human Interface Guidelines constraints, and exporting implementation-ready SwiftUI.

## What it does

- Build screens from semantic UI nodes instead of freeform coordinates.
- Preview iPhone-style layouts in the browser.
- Edit properties from an inspector.
- Drag components into the screen or into layout containers, then reorder or reparent them.
- Move the selected element up or down precisely from the Inspector when drag-and-drop is not convenient.
- Inspect the generated structure tree and use Undo/Redo or Delete/Backspace while editing.
- Group同士のまとまりを作成・解除し、Cmd/Ctrl+Shift+Gで元の階層へ戻す。
- Duplicate selected elements with Cmd/Ctrl+D, including nested children.
- Keep screen and element implementation notes alongside the semantic tree and include them in the exported brief.
- Save and open validated `.ioscanvas.json` project files.
- Open M3E Canvas JSON projects and convert their screens, bars, controls, links, palette, and font choices into a SwiftUI semantic tree without retaining absolute coordinates; actionable content and list rows become editable NavigationLinks, bottom navigation becomes native TabView tabs, screen body placement is preserved, and lossy or unresolved imports are reported.
- Export the semantic tree as a deterministic M3E JSON projection, then reopen it in iOSCanvas for a documented round trip; the source editor remains coordinate-free.
- Show M3E export compatibility diagnostics for flattened structure, approximate mappings, unresolved transitions, and device-preset normalization.
- Copy a local share link that reopens the validated document in another browser.
- Save the active iPhone preview as a PNG for review or handoff.
- Opt into iOS 26 Liquid Glass styles from the Inspector and export the corresponding SwiftUI modifiers.
- Choose native Button styles such as Plain, Bordered, and Bordered Prominent from the Inspector.
- Configure a Button as an on/off toggle with separate active label, SF Symbol, style, and initial state, then export the stateful SwiftUI implementation.
- Give icon-only Buttons a separate VoiceOver label while keeping the visual label empty.
- Apply Regular, Clear, Prominent, or Interactive Glass presets from the Parts library, then choose a capsule, rounded rectangle, or circle shape.
- Choose a system, rounded, serif, or monospaced text design and keep that choice in the generated SwiftUI.
- Edit Text alignment and maximum line count while keeping Dynamic Type warnings visible.
- Compose GroupBox and LazyVGrid layouts, Gauge metrics, and ContentUnavailableView empty states as semantic nodes.
- Set the app color scheme and tint once, then keep Preview, SwiftUI output, and the implementation brief aligned.
- Use one of the Apple-oriented accent presets or choose a custom accent color; the preview, generated SwiftUI, and implementation brief stay in sync.
- Choose a global system, rounded, serif, or monospaced text design; individual Text nodes can override it.
- See a material backdrop in the canvas when Liquid Glass is present, while keeping the exported view native SwiftUI.
- Add, duplicate, switch, and remove screens, then use Preview mode to try local control states without changing the document.
- Preview native Alert confirmation dialogs with primary and secondary actions, then export the corresponding `.alert` modifier.
- Preview multi-action ConfirmationDialog menus with an explicit cancel action, then export the native `.confirmationDialog` modifier.
- Follow outgoing NavigationLink relationships from the screen flow rail without leaving the canvas.
- Follow NavigationLink transitions directly in Preview to check the screen flow.
- Configure left, right, up, and down swipe destinations per screen and try them in Preview.
- Configure TabView item names and SF Symbols from the Inspector, then switch tabs in Preview and export `.tabItem` code.
- Preserve M3E screen body placement (`top`, `center`, `bottom`, or `spread`) as a semantic screen setting in Preview and SwiftUI output.
- Preserve M3E frame intent as an iPhone or iPad preview-device preset per screen instead of dropping the frame size during import.
- Preserve landscape M3E frames as landscape iPad previews, with the orientation included in the implementation brief.
- Use a Navigator and Parts library with filtering, canvas zoom, and guide visibility controls.
- Switch the preview between iPhone SE, iPhone 16, iPad mini, and iPad Pro 11-inch sizes without changing the semantic tree.
- Preview standard, large, and accessibility text sizes to catch Dynamic Type layout pressure before implementation.
- Compose an iPad-oriented NavigationSplitView with a sidebar and detail hierarchy, then preview and export it without an extra NavigationStack wrapper.
- Collapse the generated-code shelf when you need more vertical space for editing.
- Pin frequently used SwiftUI parts to a local Favorites row and inspect each screen's outgoing flow above its canvas.
- Use `+`, `-`, `0`, or Cmd/Ctrl+wheel to adjust or fit the canvas zoom without leaving the editor.
- Press Cmd/Ctrl+K to focus the SwiftUI parts search while composing.
- Normalize semantic stack spacing and minimum interaction heights with the `整える` action; it remains fully undoable.
- Compose native `List`, `Form`, and `NavigationLink` patterns across screens, then export the linked SwiftUI views together.
- Insert semantic SwiftUI patterns such as Glass Card, Settings Section, List Row, and Empty State in one step.
- Run lightweight HIG checks such as minimum tap-target sizing.
- Export SwiftUI code from the document tree.
- Export a structured implementation prompt when needed.
- Choose the active screen or the whole screen flow when exporting the implementation brief.
- Persist the current document locally in the browser.

## Current component set

The first prototype includes a small set of primitives such as:

- Text
- Image（SF Symbol・アセット・リモート画像）
- Button（SF Symbol付きラベル、状態切替にも対応）
- Alert（確認ダイアログ）
- ConfirmationDialog（選択肢ダイアログ）
- Toggle
- TextField
- SearchField（検索入力）
- SecureField
- TextEditor
- Picker
- ColorPicker
- Slider
- Stepper
- Menu
- ProgressView
- Gauge
- ContentUnavailableView
- VStack
- HStack
- LazyVStack / LazyHStack
- ZStack
- NavigationSplitView
- ScrollView
- Section
- List
- Form
- GroupBox
- LazyHGrid
- LazyVGrid
- NavigationLink
- Label
- Link
- DatePicker
- DisclosureGroup
- TabView
- Sheet
- GlassEffectContainer

The intent is to keep the model close to SwiftUI rather than reproduce a generic absolute-position design tool. Screens use a `NavigationStack` scaffold, while direct `List` and `Form` roots keep their native scrolling behavior; the editable document tree starts at the screen's content `VStack`. The generated-code shelf can be collapsed while composing a screen.

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

Version 1.50.15. The semantic editor, multi-screen flow workspace, nested drag-and-drop, precise element ordering, Navigator and Parts library with Favorites and semantic patterns, multi-selection style editing, inspector, NavigationStack and NavigationSplitView editing, Appearance controls with custom accent colors, interactive Preview mode with screen and swipe flow, TabView switching, Sheet, Alert, ConfirmationDialog, and SearchField presentation, interactive bottom-sheet presentation, interactive Snackbar actions, GroupBox and LazyVGrid / LazyHGrid layouts, M3E JSON import/export and share-link import into a semantic SwiftUI tree, actionable imported content and list rows, native top app bar and bottom navigation mapping, editable M3E screen parts, palette and font conversion, preserved control initial state, Picker selections, indeterminate and circular progress state, native expressive ProgressView styling, MapKit controls, M3E card image layouts, semantic text-size mapping, ColorPicker and other native controls, Gauge metrics, empty states, stateful toggle Buttons, VoiceOver labels for icon-only Buttons, history controls, semantic layout tidying, project files, share links, PNG preview export, SF Symbol images, Liquid Glass presets and shape preview, HIG checks, linked SwiftUI export, M3E export compatibility diagnostics with round-trip validation, classified compatibility anomalies, path-specific invalid-value and nested-structure diagnostics, duplicate-ID detection, invalid document metadata detection, multi-screen frame placement validation, original M3E icon and source-field retention, free-placement flattening diagnostics, inherited M3E list-icon styling, button trailing-icon editing and export, semantic trailing symbols in implementation briefs, split-button menu actions in Preview, Inspector, SwiftUI export, HIG checks, and implementation prompts, new SplitButton menu creation from Inspector, interactive FAB menus in Preview, M3E dialog actions preserved as semantic Alert actions, valid dialog and container navigation metadata remapping, functional camera capture scaffolding in generated SwiftUI, detailed M3E approximation reasons, preserved linked-card and list-item actions, structured approximation data for native SwiftUI controls, dropped-node and unknown-export-field diagnostics, expandable import compatibility anomalies, metadata navigation anomaly diagnostics, Alert action diagnostics, free-placement position validation, path-specific unresolved-navigation diagnostics, and an xtool SwiftUI target are present.
