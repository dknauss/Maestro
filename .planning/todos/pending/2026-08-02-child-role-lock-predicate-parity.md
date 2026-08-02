---
created: 2026-08-02T00:00:00.000Z
title: Popover inlines child-role lock check instead of calling tested predicate
area: tech-debt
files:
  - assets/maestro-logic.js (isChildRoleLockedByParent() ~lines 189-201)
  - assets/maestro.js (buildRoleGroup() isLocked inline check ~lines 1131-1133)
---

## Problem

Low severity, not user-facing.

`assets/maestro-logic.js` exports `isChildRoleLockedByParent()` (~lines 189-201)
as the unit-tested predicate for whether a child role row is locked by the
parent's own hidden_roles. But the visibility popover's `isLocked` callback
INLINES the same check (`assets/maestro.js` ~lines 1131-1133):

```js
isLocked: function ( roleKey ) {
    return model[ slug ].hiddenRoles.indexOf( roleKey ) !== -1;
},
```

So the code that is unit-tested is NOT the code that actually runs in the editor
— the two can drift.

## Recommended fix

Refactor the popover's `isLocked` callback to call
`window.maestroLogic.isChildRoleLockedByParent()` (matching how the rest of
`maestro.js` consumes `maestroLogic`), so the tested predicate is the one
exercised at runtime. Confirm the exported function's signature matches the
inline check's inputs (the parent's hiddenRoles set + the role key).

Not user-facing; parity / testability only.
