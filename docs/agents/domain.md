# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

**Layout: single-context.** Paths below are relative to the git root, `repo/`
(one level below the workspace directory that holds `CLAUDE.md`).

## Before exploring, read these

- **`CONTEXT.md`** at the repo root, and
- **`docs/adr/`** — read ADRs that touch the area you're about to work in.

Neither exists yet in this repo. If they don't exist, **proceed silently**. Don't
flag their absence; don't suggest creating them upfront. The `/domain-modeling`
skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`)
creates them lazily when terms or decisions actually get resolved.

Also worth reading, and already present:

- **`CLAUDE.md`** (workspace root) — architecture, stack, conventions, deployment gotchas.
- **`docs/superpowers/specs/`** and **`docs/superpowers/plans/`** — prior design
  decisions captured by `/to-spec` and the planning skills. These are historical
  records of specific pieces of work, not a glossary; an ADR still belongs in
  `docs/adr/` when a decision is durable.

## File structure

```
repo/
├── CONTEXT.md                         ← glossary / domain vocabulary
├── docs/
│   ├── adr/
│   │   ├── 0001-....md
│   │   └── 0002-....md
│   ├── agents/                        ← this directory
│   └── superpowers/{specs,plans,tickets}/
└── src/
```

If this ever grows into a genuine multi-package repo, switch to a root
`CONTEXT-MAP.md` pointing at one `CONTEXT.md` per context, with context-scoped
ADRs under `src/<context>/docs/adr/`.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

Note that this project's domain is partly Czech: `balikovna`, units `kg | ks | l | balení`,
and Czech route slugs are domain terms, not typos. Keep them as spelled.

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders) — but worth reopening because…_
