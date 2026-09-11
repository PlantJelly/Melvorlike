# Significant decisions

## D001 — 2026-09-11: Portable development workflow (applied 1.1.0)

- Decision: AGENTS.md is canonical; CLAUDE.md imports it via @AGENTS.md. HANDOFF is a replaceable recovery snapshot, PROGRESS holds requirements/milestones, DECISIONS holds consequential choices.
- Rationale: resume in Codex Desktop or Claude Code Desktop without relying on prior chats or the installed skill path.
- Alternatives: duplicate rules in both agent files or use hooks/services. Rejected to avoid drift and hidden dependencies.
- Caution: this is an instruction workflow, not an enforced Git hook or background scheduler. Semantic checkpoints occur during active work. Abrupt interruption can lose work after the last pushed checkpoint.

## D002 — 2026-09-11: Feature checkpoints and explicit integration

- Decision: use verified origin feature branches for atomic Stable/WIP checkpoints, recheck remote state before each push and compare live remote SHA afterward. Independent review is tied to exact feature/target SHAs; merge requires explicit user request.
- Rationale: prevent unrelated changes or other sessions' remote commits being overwritten and make work recoverable.
- Alternatives: continue earlier direct main pushes or automatically merge after tests. Not selected for future workflow.
- Caution: remote required-check/branch-protection policy is not yet verified. Do not infer merge readiness from local tests or HANDOFF. No force push or automatic divergence reconciliation.

## D003 — Existing implementation, documented 2026-09-11: Elapsed-time simulation and versioned saves

- Evidence: c44ea7e, src/engine/model.ts, src/engine/save.ts, src/engine/food.test.ts.
- Decision: one active production action; deterministic elapsed-time batches, segmented at food expiry; base-work progress survives speed changes. Local save schema v3 migrates v1/v2.
- Rationale: background timer delays must not discard earned production or apply expired food to the entire offline period.
- Alternatives: depend on UI frame callbacks or count one completed action per timer event. Earlier implementation demonstrated why those cannot be the authoritative clock.
- Caution: passive farm/ranch production with shared resources will require chronological event ordering; simply running each subsystem for the whole interval can violate resource availability. Preserve existing regression coverage when extending.

## D004 — Product direction, documented 2026-09-11

- Decision: retain combat-free progression; no durability, prestige or mastery-pool loop. Planned accessories use reroll stones and material-dependent option caps rather than duplicate random equipment inventories.
- Rationale: reduce repeated early-game work and inventory/maintenance burden while retaining crafting progression and optional randomness.
- Alternatives: reset-based longevity, mastery pools, disposable tools and many unique equipment instances were discussed but not selected.
- Caution: exact level/cost tables and settlers were suggestions, not newly confirmed requirements. Historical docs remain preserved; reconcile with implementation_status and user direction before expansion.

## D005 — 2026-09-11: Farming reuses the skill/tool engine instead of a bespoke passive system

- Decision: `farming` is a normal `SkillId` included in `playable` (level/exp curve, tool tier, sidebar entry all come free from existing generic code). Only the *content page* is special-cased: `App.tsx` routes `farming` to a dedicated `FarmingView` instead of the generic `ProductionView`, because farming's plant/wait/harvest interaction doesn't fit the single active-action-slot pattern the other skills share. A new `Model.farmPlot` field (one plot) advances every tick via `advanceFarm`, independent of `currentAction`, and caps at the crop's grow duration until manually harvested — matching the game design's "passive skills run in parallel with the one active skill" rule.
- Rationale: reusing `toolTiers`/`skills`/`speedMultiplier` for farming means tool crafting, leveling and future food/tool bonuses work for free with zero new code, consistent with the project's stated principle of reusing existing level/tier systems instead of inventing parallel ones (see game_design.md's rejection of a separate mastery system).
- Alternatives considered: a fully separate `CropDB`/plot-tools schema outside `ResourceDB`/`SkillId` (rejected — duplicates the tool-tier and leveling code for no benefit); auto-repeating plant+harvest like the active-action loop (rejected — the requested "최소 루프" is explicitly plant→wait→harvest as three manual steps; auto-cycling is listed as a later upgrade in content_spec.md, not part of this task).
- Caution: `begin()`/`ProductionView` are never called with a farming crop id by any current UI path (the farming page renders `FarmingView`, not `ProductionView`), but the engine does not defensively block it — if a future UI change accidentally renders `ProductionView` for `farming`, a crop could be "gathered" via the single active-action slot in addition to the plot, double-counting production. Keep the `page() !== 'farming'` guard in `App.tsx` if `ProductionView` is ever refactored.

## D006 — 2026-09-11: Farming seed/produce simplification for the minimal loop

- Decision: each crop is a single `ResourceDB` item that is both the purchasable "seed" (via the pre-existing but previously unused `buy` price field) and the harvested produce — planting consumes 1, harvesting returns a fixed yield (3) of the same item. One plot only; no fertilizers; no auto-plant/auto-harvest.
- Rationale: content_spec.md's separate seed-item + fertilizer + multi-plot design is explicitly marked as a later-upgrade layer ("업그레이드로 자동 파종/수확 해금"), not part of the requested minimal loop. Reusing one item avoids a second inventory-item family (seed vs. produce) for a feature whose acceptance criteria only asked for the four-step loop to work end-to-end with save migration and offline/online equivalence.
- Alternatives considered: distinct seed items with partial-return-on-harvest (closer to content_spec's long-term vision) — deferred because it requires the fertilizer system (회수비료) to be meaningful and would otherwise just be a seed you always have to rebuy at a loss; multiple concurrent plots — deferred as an explicit non-goal of "최소 루프".
- Caution: when farming/ranching output is connected to cooking (PROGRESS Planned item 3), revisit whether "seed = produce" still holds once crops are consumed by recipes at a different rate than they're replanted — may need to split seed and produce at that point. This is a provisional-balance decision, not a confirmed requirement (see D004's caution about docs/content_spec.md).
