# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

This is a Breakout (Arkanoid-style) game project in an early stage. There is no game source code, package manifest, README, or build, lint, or test tooling yet. Do not invent commands. When a toolchain is added, document its build, lint, and single-test commands here.

The git repository root is the parent folder `C:\Users\Vinicio Herrarte\Desktop\projects`, not this folder. Paths in git commands are relative to that root, and this project shows up as untracked (`?? ./`) in its `git status`.

## Spec-driven workflow

Features are developed through specs before code. The two skills that drive this are the core process of the repo.

- `.agents/skills/spec/` and `.agents/skills/spec-impl/` are the source of truth. `.claude/skills/` and `.aider-desk/skills/` contain symlinks to them, so edit only the `.agents` copies.
- These skills came from the upstream `Klerith/fernando-skills` repo and are pinned in `skills-lock.json` by hash. Local edits drift from that lock, which is acceptable but should be intentional.
- `/spec <description>` interviews the user and writes `specs/NN-slug.md` following `template.md`. The `specs/` folder does not exist yet and is created on first use. Phase 2 (clarifying questions) must not be skipped.
- `/spec-impl NN-slug` only proceeds when the spec's status line means "Approved" in any language. Only a human changes that status. Claude must never set it.
- `/spec-impl` creates and switches to branch `spec-NN-slug`, then implements the plan one step at a time, pausing for review after each step.
- Commit behavior is controlled by `specs/.spec-config.yml`. `AutoCreateBranch` defaults to `true`. `AutoCommitSteps` defaults to `false`, so do not commit unless the user asks. When enabled, each step is committed as `spec-NN-step-MM` with only that step's files staged. Never use `git add -A` or `git add .`, never use `--no-verify`, and never push.
- Specs are written in the language of the user's request (the skills are bilingual English/Spanish). Match that language in replies during `/spec`.

## Game assets

- `assets/spritesheet-breakout.png` is a single atlas. `assets/spritesheet.js` holds the source rectangles and a loader. It is a classic global script, not a module.
- Load order: call `loadSpritesheet(cb)` first. The draw helpers `drawSprite(ctx, name, x, y, w, h)` and `drawFrame(ctx, frame, x, y, w, h)` do nothing until the image is loaded.
- `drawSprite` accepts `'paddle'`, `'ball'`, or `'block_<color>'` (colors: gray, red, yellow, cyan, magenta, hotpink, green).
- Explosions use `EXPLOSION_FRAMES[color]` (four 32x16 frames per color) and `EXPLOSION_DURATION` (150 ms). The `gray` explosion frames currently reuse the `red` coordinates. Confirm whether that is intended before relying on it.
- The image path `'assets/spritesheet-breakout.png'` is relative to the page, so the game's HTML entry point must sit at the repo root or the path must be adjusted.
- Sounds are in `assets/sounds/`: `ball-bounce.mp3` and `break-sound.mp3`.
- `.DS_Store` files are macOS artifacts and should not be committed or referenced.
