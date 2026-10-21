---
created: 2026-09-24T00:00:00.000Z
title: Network Admin menu editing — demand and feasibility research
area: research
files:
  - maestro-menu-editor.php (current outside-site-admin edit-mode gate)
  - includes/class-replay.php (current site-admin replay and ordering hooks)
  - includes/class-config.php (current per-site configuration storage)
  - tests/integration/NetworkAdminTest.php (current Network Admin exclusion contract)
  - .planning/ROADMAP.md (multisite/network backlog context)
---

## Problem

Maestro deliberately does not edit or reorder the WordPress Multisite Network
Admin menu. The current editor and config are site-scoped; Network Admin is a
separate menu surface with distinct hooks. Re-enabling the site editor there
could submit that menu model to the site's full-replacement config endpoint and
overwrite site settings. Determine whether network administrators have enough
need for a dedicated editor to justify a separate scope and data model.

## Deliverable: a research note, not an implementation commitment

Assess user demand and technical/product feasibility for editing the Network
Admin menu independently of individual site menus. Recommend go, defer, or no-go
with evidence and explicit scope boundaries. Do not relax the existing safety
gate as part of this research.

## Questions to answer

- Which Network Admin menu tasks are actually needed: reorder, rename, hide,
  per-role/per-user visibility, or something else?
- Is the intended configuration network-wide for all super admins, scoped by
  network, or does it need per-user variation? What should happen on
  multi-network installations and when a site is added or removed?
- What capability boundary is appropriate, and can the feature remain cosmetic
  without affecting authorization or URL access?
- Which hooks and menu globals are available for Network Admin, and what
  differs from the existing `admin_menu`/site-menu replay path?
- What separate storage and REST behavior prevent network saves from replacing
  per-site settings? Consider schema, migration, reset, multisite lifecycle, and
  authorization.
- What UI entry point makes the edited surface unambiguous, and how should
  existing site-level Maestro controls behave while in Network Admin?
- What tests are required to prove Network Admin edits work without changing any
  site's configuration or menu, including multisite and non-super-admin cases?
- How does this compare with existing multisite/network-menu tools, including
  Admin Menu Editor, and what is the smallest valuable first release?

## Exit criteria

- Evidence-backed problem statement and target user.
- A concise feature-surface and permission proposal, including explicit
  non-goals.
- Feasibility findings for hooks, storage, REST, and multisite lifecycle.
- Risks, test strategy, and a go/defer/no-go recommendation.
- If go: a follow-up implementation scope that preserves current site-level
  behavior and its regression tests. No code changes in this research item.
