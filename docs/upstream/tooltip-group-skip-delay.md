# Proposal: coordinated TooltipGroup skip-delay

**Status:** approved for local implementation; lane work is in progress. No upstream PR is required; upstream follow-up is optional.
**Affected package:** `@foldkit/ui@0.168.0`.

## Problem

Each Tooltip has its own configured show delay, but there is no group coordinator to suppress the delay when a user moves from one tooltip to another in the same group. Without shared coordination, sequential tooltips each wait through their individual delay, or consumers must coordinate their state outside the Tooltip model.

## Evidence (`@foldkit/ui@0.168.0`)

The installed package exports the individual `./tooltip` entry (`apps/gallery/node_modules/@foldkit/ui/package.json:122-125`), with no TooltipGroup export in its package export map. Tooltip's model owns its own `showDelay` and pending-show state (`apps/gallery/node_modules/@foldkit/ui/dist/tooltip/tooltip.d.ts:9-20`); its `InitConfig` configures an individual `showDelay` (`:26-32`). The public API provides no shared group state or skip-delay coordination.

## Local workaround

`packages/primitives/src/tooltip-group.ts:5-14,16-47` defines shared `isSkipping`/expiry-version state, schedules a skip-window command on tooltip open/close, ignores stale expiry messages, and reflects zero or configured open delay. A parent must forward group events and apply the reflected delay to each Tooltip; this recreates coordination outside the upstream Tooltip API.

## Proposed API

Add `TooltipGroup` with configurable `{ openDelay, skipDelay }`, group-owned model/update state, and a way for each Tooltip to consume the group's effective show delay. A tooltip opening or closing should update the shared skip window; expiration must be versioned/cancelable so an old timer cannot end a newer window. Group state should be explicitly scoped to the instance, not global across unrelated tooltips.

## Test ideas

- First hover in a group uses `openDelay`; after a tooltip opens, a second tooltip in the same group opens with zero delay during `skipDelay`.
- Expiration restores the configured delay, and a stale expiry does not end a later skip window.
- Separate groups do not affect one another; standalone Tooltip behavior and explicit per-tooltip delay remain available.
- Keyboard focus follows the same shared timing contract as pointer hover.
