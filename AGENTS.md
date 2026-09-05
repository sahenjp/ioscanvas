# AGENTS.md

## Product intent

This repository is a focused visual composer for SwiftUI. The key differentiator is semantic structure: edits must operate on the typed document tree, and generated SwiftUI/prompt output must come from that tree.

Do not turn the project into a generic AI website builder.

## Before changing code

1. Read README.md and this file.
2. Inspect the existing document model, store, generators, and tests.
3. Keep changes as small as possible for the requested milestone.
4. Do not delete or rewrite unrelated user changes.

## UI direction

The editor should feel like a serious native-development tool: quiet, precise and dense enough to work in.

Avoid:
- decorative gradients
- glass cards everywhere
- oversized rounded cards
- floating marketing-style panels
- tiny gray explanatory copy under every control
- random sparkle/AI icons
- excessive motion
- generic dashboard/bento layouts

Prefer:
- strong alignment
- thin separators
- clear selection states
- compact controls
- platform-like hierarchy
- motion only when it clarifies drag, selection or hierarchy

## Engineering rules

- TypeScript strict mode stays enabled.
- The CanvasDocument tree remains the source of truth.
- Prefer pure functions for lint and code generation.
- Validate user-controlled identifiers before generating Swift code.
- Do not add a backend until a feature genuinely requires one.
- Do not add an LLM dependency for deterministic tasks.
- Do not over-abstract small features.
- Accessibility is part of the product, not a later polish step.

## Verification

For code changes, run as applicable:

```bash
npm run test
npm run lint
npm run build
```

Do not disable checks to make them pass. Report any command you could not run.

## Git

Do not commit, push, create pull requests, rewrite history, or publish releases unless the user explicitly asks for that action.
