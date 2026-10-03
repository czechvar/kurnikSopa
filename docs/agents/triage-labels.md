# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those
roles to the actual labels used in this repo's issue tracker — **Workstreams**
(team `S_ZYh417Os`, board `QKLCFY`). See `issue-tracker.md`.

Workstreams labels are **team-wide, not per-board**, and tasks carry them as
uuids, never as names. Resolve a name to its `labelId` with `list_labels`
(`pathParams: {teamId: "S_ZYh417Os"}`) before writing, and apply them with
`update_task` `{labels: [<labelId>, ...]}` — which replaces the whole array, so
send the full intended set.

| Label in mattpocock/skills | Label in our tracker | `labelId` | Meaning |
| -------------------------- | -------------------- | --------- | ------- |
| `needs-triage`             | `needs-triage`       | _create on first use_ | Maintainer needs to evaluate this task |
| `needs-info`               | `needs-info`         | _create on first use_ | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | `a6d16a06-339f-4495-9694-8ab607b7e1c5` | Fully specified, ready for an AFK agent |
| `ready-for-human`          | `ready-for-human`    | _create on first use_ | Requires human implementation |
| `wontfix`                  | `wontfix`            | _create on first use_ | Will not be actioned |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the
corresponding label from this table.

Edit the right-hand columns to match whatever vocabulary you actually use.

## State on the workspace

Of the five canonical roles, exactly one already exists on team `S_ZYh417Os`:
**`ready-for-agent`** (`a6d16a06-339f-4495-9694-8ab607b7e1c5`, green `#2D7A4D`)
— reuse it, don't create a duplicate.

The other four do not exist yet. Create them on first use with `create_label`
(`pathParams: {teamId: "S_ZYh417Os"}`), one call each, and record the returned
`labelId` in the table above:

```jsonc
// needs-triage
{ "textValue": "needs-triage",    "color": "#D93F0B", "kind": "default", "teamId": "S_ZYh417Os" }
// needs-info
{ "textValue": "needs-info",      "color": "#FBCA04", "kind": "default", "teamId": "S_ZYh417Os" }
// ready-for-human
{ "textValue": "ready-for-human", "color": "#1D76DB", "kind": "default", "teamId": "S_ZYh417Os" }
// wontfix
{ "textValue": "wontfix",         "color": "#9E9E9E", "kind": "default", "teamId": "S_ZYh417Os" }
```

Because labels are team-wide, these will also appear on the other boards in the
workspace (RF-website, rastasita WEB, the Rockbusters / Snowbusters boards).
That's expected — keep the names generic, and don't prefix them per project.

The workspace's other existing labels (`bug`, `cms`, `infra`, `data`, `UX`,
`major`, `v1.1`, `auto-claude`, `mailing`, `Payload MCP`, …) are orthogonal to
triage state and can coexist on a triaged task.

## Status vs. label

Triage state is a **label**; progress is the board's **status/step**
(`planned` → `progress` → `completed`). They are independent axes: a task can be
`planned` + `needs-info`, or `progress` + `ready-for-agent`. Don't encode triage
roles as board steps.
