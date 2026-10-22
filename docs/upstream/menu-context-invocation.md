# Proposal: invoke Menu from a context target

**Status:** local proposal draft; not submitted upstream.  
**Affected package:** `@foldkit/ui@0.168.0`.

## Problem

The Menu model represents pointer/keyboard activation of its button, and its standard view anchors to that button. A context menu instead opens on a right-click or keyboard context-menu command at a source element or pointer coordinate. Consumers need to combine Menu behavior with separate invocation, anchoring, and focus-restoration state to support that interaction reliably.

## Evidence (`@foldkit/ui@0.168.0`)

The installed Menu's activation trigger is only `Pointer` or `Keyboard`, and its model tracks normal menu state and the last button pointer data (`apps/gallery/node_modules/@foldkit/ui/dist/menu/index.d.ts:10-39`). Its exported API includes `AnchorMenu` and button-centric messages such as `PressedPointerOnButton` (`apps/gallery/node_modules/@foldkit/ui/dist/menu/public.d.ts:1-3`). There is no context invocation or point/source-target API in these declarations. The installed package version is `0.168.0` (`apps/gallery/node_modules/@foldkit/ui/package.json:1-4`).

## Local workaround

`packages/primitives/src/context-menu.ts:20-47,84-115` layers invocation/source-token state and touch long-press expiry over `Menu.Model` and Menu updates. Its source Mount handles contextmenu and touch pointer events (`:132-163`), while its anchor Mount uses a virtual pointer reference or the source element (`:164-197`). This preserves Foldkit Menu selection/navigation but duplicates context invocation, position, and safe source-focus restoration locally.

## Proposed API

Expose a context invocation path that reuses Menu's model and navigation while accepting a serializable invocation target: `{ kind: 'pointer' | 'keyboard' | 'touch'; sourceId: string; sourceToken: string; point?: { x: number; y: number } }`. A programmatic `openAt(target)`/corresponding `OpenedAt` message should select the first enabled item when appropriate, resolve the mounted source for anchoring/focus, and restore focus only if the same source token is still mounted on close. Keep ordinary button-open behavior and its defaults unchanged.

## Test ideas

- Right-click opens at the pointer coordinates and suppresses the native context menu.
- Keyboard ContextMenu/Shift+F10 opens at the source, focuses an enabled item, and Escape restores focus to the original source.
- A touch long-press opens at its initial point; movement, release, or stale timer cancels it correctly.
- If the source unmounts or is replaced with a different identity, closing never focuses the replacement.
- Existing button-anchored Menu open/close behavior remains unchanged.
