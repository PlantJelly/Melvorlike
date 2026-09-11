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
