---
phase: 12
slug: release-assets-refresh
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-22
---

# Phase 12 — Validation Strategy

> Per-phase validation contract. This is an **assets-only** phase (banner + screenshots),
> so validation is two-layered: **deterministic checks** (image dimensions, file size,
> file presence, readme/caption consistency) that gate automatically, plus **human visual
> review** for the design/quality outcomes that no script can judge.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Deterministic checks** | Python/Pillow (`Image.open(...).size`) for dimensions; `ls`/`stat` for presence + byte size; `grep` for readme `== Screenshots ==` caption count |
| **Screenshot capture** | Playwright (`npm run screenshots`), MAESTRO_CAPTURE-gated, against wp-env (Docker) |
| **Banner regen** | `npm run assets:banners` (build_final.py → Inkscape → Pillow); `VARIANT_SUFFIX=-v2` for non-destructive staging |
| **Quick check command** | `python3 -c "from PIL import Image; [print(p, Image.open(p).size) for p in ['.wordpress-org/banner-772x250.png','.wordpress-org/banner-1544x500.png']]"` |
| **Full check** | dimensions (772×250 + 1544×500) + screenshot count == readme caption count + each asset ≤ wp.org limit |
| **Estimated runtime** | banner regen ~10s; screenshot capture ~30s (Docker up) |

---

## Sampling Rate

- **After banner regen:** assert both banners are exactly 772×250 and 1544×500 and ≤4 MB
- **After screenshot capture:** assert N committed `screenshot-*.png` exist, each ≤10 MB, and the readme `== Screenshots ==` list has exactly N captions
- **Before the visual-review checkpoint:** all deterministic checks green
- **Max feedback latency:** ~30s (with Docker running)

---

## Per-Task Verification Map

*(Planner fills exact task IDs. Requirement → check mapping:)*

| Requirement | Deterministic gate | Human gate |
|-------------|--------------------|-----------|
| REL-07 (banner) | both PNGs exactly 772×250 / 1544×500, ≤4 MB, regenerated from source (not hand-edited) | balanced common-measure design approved on visual review |
| REL-08 (screenshots) | N `screenshot-*.png` present, ≤10 MB each, captured against the **post-11.2** editor UI; readme caption count == screenshot count | screenshots are high-quality, show the redesigned toolbar, captions read well |

---

## Wave 0 Requirements

- Existing infrastructure covers this phase: the REL-06 banner pipeline (`build_final.py` +
  `assets:banners`) and the MAESTRO_CAPTURE-gated Playwright capture pattern both already
  exist. The only new artifact is a `capture-directory-screenshots.spec.ts` modeled on the
  existing `capture-screenshots.spec.ts` (gated, writes committed PNGs) — authored in the
  REL-08 plan, not a separate Wave 0.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Banner reads as balanced (wordmark / subtitle / tagline / gold rule on ~one measure) | REL-07 | Visual design judgment | Regen with `VARIANT_SUFFIX=-v2`; open staging PNGs; approve before overwriting live `.wordpress-org/banner-*.png` |
| Screenshots are clear, current (show the 11.2 toolbar), and well-captioned | REL-08 | Image quality + workflow-explanation judgment | Capture to the planning screenshots dir; review; approve before overwriting `.wordpress-org/screenshot-*.png` |

---

## Pre-flight (REL-08)

- [ ] **Phase 11.2 merged to `main`** before capture — otherwise screenshots show the old
  toolbar. (Confirmed merged via PR #50 on 2026-06-22; this branch is cut from post-merge `main`.)
- [ ] **Docker/Colima + wp-env running** for capture (known Maestro test-execution sandbox gap —
  capture step runs sandbox-disabled or behind a human-verify checkpoint).

---

## Validation Sign-Off

- [ ] Each requirement has a deterministic gate AND (where design/quality is involved) a human gate
- [ ] Banner dimensions + byte-size checks automated
- [ ] Screenshot count ↔ readme caption count check automated
- [ ] Visual-review checkpoints explicit before any live-asset overwrite
- [ ] `nyquist_compliant: true` set once the planner wires the gates into tasks

**Approval:** pending
