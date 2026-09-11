# Project development instructions

Development Workflow Version: 1.1.0 (applied project version)

AGENTS.md is the canonical operating policy. CLAUDE.md imports it. Code, tracked state documents and Git history are the source of truth. Do not require old chat history when the repository supplies the answer.

## Project profile

- Purpose: Melvorlike 왕국 재건 — 전투 없는 채집·제작 방치형. 구 프로토타입을 보존하며 TypeScript + Vite + SolidJS로 재작성 중.
- Default branch: `main`. Verified remote: `origin` = `https://github.com/PlantJelly/Melvorlike.git`. Feature pushes target this same remote; merge target is `origin/main`.
- Branch naming: `feature/<topic>`, `fix/<topic>`, `refactor/<topic>`. Workflow initialization uses `feature/development-workflow`. Use a separate meaningful feature branch for unrelated development; never silently move dirty work.
- Working directory for commands: repository root. Existing prerequisites: Node.js/npm and installed package-lock.json dependencies; initialization verified Node v24.19.0 / npm 11.17.0 on Windows PowerShell. Install with `npm ci` when needed. The workflow itself adds no runtime dependency.
- Required local checks for code changes and merge review: `npm test` (Vitest; currently 25 tests), `npm run build` (`tsc -b && vite build`, includes TypeScript checking). For UI changes also run a targeted browser interaction/visual check. Documentation-only checkpoints need document/import/diff checks; record any code test reuse with exact checked code state.
- Dev/preview: `npm run dev`, `npm run preview`. No lint script or tracked GitHub Actions workflow exists at initialization. Remote branch protection/required checks are UNKNOWN; verify for independent review/merge. Do not add CI or change hooks/settings as part of adopting this workflow.
- Architecture: pure content in `src/content`; simulation in `src/engine/model.ts` remains independent of Solid/DOM. `src/state` connects storage and UI, `src/ui` contains screens, App composes them. Keep interval scheduling separate from elapsed-time accounting; food expiration must split offline intervals. Test resource exhaustion and online/offline equivalence.
- Persistence: `src/engine/save.ts` validates save v3 and migrates v1/v2. Schema changes require explicit version migration and regression tests. Do not erase player saves; corrupt data currently blocks automatic writes. Avoid claiming multi-tab safety (not implemented).
- Preserve `legacy/`, existing design/history in `docs/`, `.claude/launch.json`, existing hooks and settings. Do not replace game code or redesign balance for workflow setup. Keep generated `node_modules/`, `dist/`, secrets and local review attestations out of commits. No enforced hooks/signing policy was found (only sample hooks; no configured core.hooksPath).
- Game constraints: no combat, durability, prestige/reset loop or Melvor mastery pool. Fixed main tools; accessory rerolls remain planned. `docs/content_spec.md` is provisional, not validated balance. Do not promote assistant suggestions such as settlers into user-approved scope. Preserve acceptance criteria in PROGRESS.
- Authorization: user's adoption request includes routine feature-branch commit/push checkpoints for requested work at the existing verified origin, including this initialization. New remote destinations, publication/deployment, and main integration require explicit user authorization. No automatic merge. Prior direct-main commits are history, not ongoing permission to bypass this workflow.
- Communication: Korean, concise outcomes and verified evidence. State proposed vs implemented vs tested distinctly. Use HANDOFF as the latest recovery snapshot, PROGRESS for milestones/requirements, DECISIONS for significant choices; keep detailed implementation status in `docs/implementation_status.md` without duplicating session logs.

## Restore before code edits

Read AGENTS.md and applicable parent/nested instructions, HANDOFF.md, PROGRESS.md, DECISIONS.md, README.md in that order. Then inspect current branch, git status, recent Git history and relevant actual code/tests. Verify document claims. Mark missing information unknown and derive it from repository evidence first. Identify the exact next action before implementation. If branch differs from HANDOFF, resolve the intended branch without blindly switching a dirty tree. Continue the existing feature branch; session changes never justify a new branch.

## Repository freshness and evidence

When facts conflict, use this evidence order: actual source/tests/configuration; local Git state/history; fresh remote repository state; HANDOFF; PROGRESS; DECISIONS/other supporting documents. This ranks factual evidence, not instruction authority, and never permits ignoring another session's remote commits. Correct inaccurate documents from verified evidence, including stale completion claims.

At session start, before code edits, capture branch, working tree/index state, local HEAD, upstream existence and its remote/ref mapping. Safely fetch the relevant remote and verify its live branch ref; distinguish absent branch from fetch/auth failure. Compare local and fetched branch using `git rev-list --left-right --count HEAD...<verified-remote-ref>` (left=ahead, right=behind). Record equal/ahead/behind/diverged, remote observation SHA/time and exact remote/ref. No upstream does not mean no remote branch: check the intended ref explicitly. If unavailable, freshness is unknown; stop dependent implementation/push and report the blocker while preserving local work.

Validate HANDOFF's branch and commit references against actual Git. A pre-snapshot anchor or older stable checkpoint legitimately differs from HEAD; verify it exists and its labelled relationship/ancestry, not naive equality. Missing/unrelated anchors and contradicted state require investigation and correction before resuming. Do not reset code to match prose.

Behind or diverged branches must not begin stale implementation or push. Inspect both sides and dirty changes, report the divergence, and establish a safe reconciliation plan. Do not automatically pull/merge/rebase, resolve conflicts, reset --hard, delete uncommitted work, or use force/force-with-lease. Preserve both sides. Perform reconciliation only within explicit user direction for the observed state; then revalidate documents, tests and review. An equal or ahead branch may proceed only after inspecting its unpushed commits and ownership. A verified absent remote branch may be created only at the authorized destination.

Keep a session baseline for each remote ref used. Immediately before EVERY push (checkpoint, handoff, review fixes, or main integration), fetch/re-query that ref and compare with its baseline. If changed, including deletion/creation, stop the push, inspect new commits and conflict risk, and resolve safely under the preceding rule. Do not merely replace the baseline to suppress the warning. Refresh the baseline only after verified successful push or deliberate safe reconciliation. For merge, recheck both feature and target; target movement invalidates review. Also recheck branch, HEAD and index for unexpected local session changes before staging/commit/push. Multiple writers in one worktree require coordination or separate worktrees/branches; these checks are not a lock. A race after the check can still reject an ordinary push: preserve local work and re-inspect, never force it through.

## Atomic development

Persist original user requirements, acceptance criteria and an ordered atomic-task plan in PROGRESS before implementation. Each task should be independently meaningful, testable, committable and understandable to a new session. Split before starting if unlikely to finish in one session, especially a five-hour usage window; this is a planning constraint, not a timer guarantee. Use separate branches for independent features, meaningful fixes/refactors, not every tiny change. Never implement a large feature on main. Preserve unrelated staged/unstaged work.

Before implementation ask: independently committable? understandable after interruption? multiple responsibilities mixed? divisible into testable portions? likely to consume much of a five-hour window? If oversized, split into smaller semantic checkpoint units first; reassess when scope expands.

After each meaningful atomic task, checkpoint automatically before starting the next. Do not delay all preservation until the full feature or entire test suite is perfect. When an unfinished task reaches a meaningful recoverable partial boundary, create a WIP checkpoint and then continue its remaining scope. Never checkpoint every file save or just because time passed. Keep HANDOFF current at each checkpoint for abrupt-stop recovery. Update PROGRESS from evidence. Record only significant technical/architecture decisions with rationale, alternatives and change cautions in DECISIONS.

## Checkpoint

Classify explicitly: **Stable** means the atomic task is meaningfully complete, relevant tests pass or proportionate alternative verification is justified and recorded, and the next task can safely start. Missing required verification cannot be waived as proportionate. **WIP** means unfinished but recoverable work with clear intent, remaining scope, failures and risks. WIP is valid preservation, not completion or merge readiness. Record type in HANDOFF and accurate progress in PROGRESS; retain the last verified Stable reference.

Before checkpoint or handoff, validate HANDOFF/PROGRESS against code: accurate branch, existing labelled commit anchors, current test evidence tied to checked state, resolved issues removed from open lists, unfinished work not marked done. Re-run affected checks if relevant code/config changed; otherwise label earlier results stale rather than silently reusing them.

1. Review changes/ownership; run relevant tests/checks. Record command, result and checks not run with reason. Failures do not automatically prohibit preservation, but label failing/incomplete work WIP, never stable.
2. Refresh HANDOFF's current snapshot and PROGRESS as needed; include next action, unresolved issues and last verified stable checkpoint. Record significant new decisions.
3. Inspect staged content for unrelated work, secrets and generated files. Stage explicit paths with `git add -- <paths>`. Never blindly stage all files. Preserve unrelated staging; if safe separation is impossible, retain files and report a blocker.
4. Commit on the feature branch with a natural development message, preferably Conventional Commits. Use feat/fix/test/refactor/docs for actual changes, wip/checkpoint for unfinished progress. Never mention AI authorship, session switches, tokens, quota or handoff logistics. Do not bypass hooks/signing or rewrite history.
5. Apply the immediate pre-push freshness gate above, then push explicitly to the verified feature remote/branch. Compare `git rev-parse HEAD` with a fresh `git ls-remote --heads <remote> refs/heads/<branch>` SHA. Missing ref, errors or mismatch mean unverified; successful push exit or stale remote-tracking refs alone are insufficient. Confirm local HEAD did not move during verification.
6. Only remote equality completes checkpoint and permits starting the next atomic task. On auth/network/rejected push, preserve local commit, report SHA/branch and blocker, and stop progression to the next task. Do not retry indefinitely, force push, store credentials or bypass security.

A tracked document cannot contain its own future commit SHA. Record the known pre-checkpoint parent as such and locate the containing snapshot commit with `git log -1 -- HANDOFF.md`. Record an earlier verified stable SHA separately from a current candidate with passing checks. Verify remote after commit, without falsely claiming advance verification or making an endless follow-up-commit loop. Recheck remote on resume.

`/checkpoint` means reach the nearest meaningful completion boundary, execute this procedure, then continue existing authorized work unless told otherwise. It is not blind immediate staging.

## Handoff

`/handoff` or equivalent is a session-ending request. Immediately stop new features, refactors, improvements and optional work. Do only the minimum needed for safe stopping, sooner than a checkpoint completion boundary if appropriate. Run relevant checks where feasible; preserve state regardless of failure/WIP. Fully update HANDOFF and PROGRESS; update DECISIONS only for consequential new decisions. Include failed tests, core error, confirmed/unknown causes, risks, incomplete work and exact next first action. Use checkpoint staging/commit/push/remote verification mechanics and honest WIP messages. Report remote success or local-only preservation accurately. End; no further code edits without new user instructions.

## Independent review

`/review` re-evaluates original requirements, complete feature diff, code, tests, configuration, migrations, docs and interaction with existing features. Do not trust implementation summaries or completion claims in PROGRESS/HANDOFF. Self-review is allowed; a new session can improve independence, but another LLM is not required.

Fetch the target; capture exact target/base SHA and feature HEAD. Review the full merge-base-to-HEAD change, not just last commit, and compatibility with latest target. Dirty work cannot be covered by exact-HEAD PASS: preserve first within authorization or report BLOCKED. Check requirements, logical errors, edge cases, error handling, regressions, missing tests, obvious security problems, dead/unnecessary code, missing migrations/env/config and convention violations. Run required checks.

Record PASS, FAIL or BLOCKED. Missing requirements, target evidence or essential executable checks means BLOCKED; discovered blocking defects means FAIL. Separate blocking/nonblocking findings with file/location, impact and correction. PASS requires no blockers and required checks passing. Record reviewed feature SHA, target SHA, requirements source, reviewer context and check evidence. Corrections require re-review. Any HEAD change, including docs, or target movement invalidates PASS.

CI-aware review: inspect existing CI definitions and, through available authenticated tools, current branch checks for the exact reviewed SHA and required-check policy. Cover the project's actual required build/test/lint/type/security/static checks; do not add CI to a project without it. Report CI as PASS / FAIL / PENDING / NOT CONFIGURED / UNAVAILABLE, with required-check names, run/check identifiers or URLs, SHA and observation time. A missing expected required run is PENDING, not NOT CONFIGURED. Unknown required-check policy or inaccessible essential CI evidence is UNAVAILABLE. Required FAIL makes review FAIL; required PENDING or UNAVAILABLE makes review BLOCKED. Optional failures must be disclosed and assessed; substantive defects still block. NOT CONFIGURED is valid only when absence is established. Never substitute a green check from another commit. Re-query required checks at merge, including reruns/cancellations and changed policy; only required PASS satisfies the gate.

Review provenance must contain Reviewed branch, Merge target (remote/ref and SHA), Reviewed commit SHA, Review status, Tests (commands/results/checked state), CI status and required evidence if configured, applied project Workflow version, timestamp, requirements source, reviewer context and relevant configuration (tracked CI/test/build config paths at reviewed SHA, required-check policy and relevant non-secret environment facts). A changed relevant configuration/policy invalidates evidence even if HEAD is unchanged. Do not infer project version from the installed Skill.

Avoid a self-referencing review commit: store the final report outside the worktree at the path from `git rev-parse --git-path development-workflow-review.md`, or use an authorized GitHub PR review tied to the SHA. A local report does not travel with a clone: without trusted matching review evidence, the next session must re-review. Never infer PASS from HANDOFF. If a tracked report is wanted, commit it, then re-review resulting HEAD and store final attestation outside the worktree. Never transfer PASS silently to a later commit. A status file alone is not proof: verify SHA/base and actual recorded findings/checks.

## Explicit merge gates

Only `/merge` or equivalent explicit user merge instruction permits considering main integration. Completion and PASS never auto-authorize merge.

Require ALL before mutating main:
- Current branch is intended feature branch, not main/default.
- Latest review PASS has exactly current HEAD.
- Fresh target SHA equals reviewed target SHA.
- Required tests pass for that HEAD and integration checks where needed. If required CI/checks exist, freshly verified PASS for that exact SHA is mandatory; FAIL/PENDING/UNAVAILABLE blocks merge. If no CI is configured, do not invent this requirement. Review provenance and relevant configuration/policy must still match.
- Working tree/index clean; no unfinished Git operation.
- Fresh remote verification proves pushed feature HEAD equality.
- Conflict check succeeds using isolated worktree or supported read-only merge preview; project branch protection/merge policy satisfied.

If any gate fails, do not merge; explain blocker. Do not fix/rebase/commit and reuse stale PASS. If all pass, use established merge strategy/authorized PR flow and push as applicable. If no policy, prefer ordinary non-rewriting merge within authorization. Never bypass required CI/review/protection. Verify remote main contains expected result: ancestry for normal merge/fast-forward; for squash/rebase verify result SHA and reviewed resulting changes since feature ancestry is not retained. A target race or rejected push requires fresh inspection/review, never force push. Local-only merge is not remote success.

## Safety and limits

Never commit credentials/tokens, copy .env secret values into docs, overwrite hooks/settings, use destructive Git commands, force push without explicit permission or rewrite main. Preserve user changes, disclose failures and respect host approvals. A missing tool/remote/authentication is a reported blocker, not a security bypass reason.

Slash labels are workflow intent aliases, not native command registration. If intercepted, request the action in plain language naming Development Workflow. No agent CLI, Node.js or background service is required. Optional quota detection uses only available official APIs/hooks; never UI scrape, OCR or reverse engineer internal files. Otherwise users check Desktop usage and request handoff around 20% remaining. Checkpoints happen during active work at semantic boundaries; abrupt interruption can lose work after the last pushed checkpoint.
