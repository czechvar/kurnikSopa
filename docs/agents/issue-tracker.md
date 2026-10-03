# Issue tracker: Workstreams

Issues and specs for this repo live as **Workstreams tasks**, not GitHub issues.
All operations go through the `claude_ai_workstreams` MCP server
(`mcp__claude_ai_workstreams__*` tools).

GitHub (`czechvar/kurnikSopa`) is still used for **code**: branches, pull requests,
code review. It is not the ticket surface.

## This repo's board

| Thing | Value |
|-------|-------|
| Team id | `S_ZYh417Os` |
| Board (channel) id | `QKLCFY` — name `kurnikSopa`, topic "farm" |
| Stream id | `S_ZYh417Os-QKLCFY` |
| Board URL | <https://app.workstreams.ai/teams/S_ZYh417Os/board/QKLCFY/> |
| Default assignee | `SU_yWzWbWTa` (Jan Antl) |

Every task this repo creates goes in channel `QKLCFY` unless the user names
another board. Don't fall back to "My personal tasks" or any MCP default.

### Workflow states

The board's statuses and their step ids — a task needs a `statusId`, and a
`stepId` when the status has more than one step:

| `statusId` | `stepId` | Step title |
|------------|----------|------------|
| `planned` | `new` | Planned (source) |
| `progress` | `8b2d3338-dd33-4be9-af28-1709b4c164b4` | design |
| `progress` | `765b1616-c09f-4a79-b790-d1b85378e2e6` | review |
| `completed` | `deployed` | Completed (sink) |

Re-read these with `get_stream_config` (`pathParams: {teamId, channelIds}`)
before moving state — the user edits the board's steps in the UI, and the
uuid step ids change when they do.

### MCP tools are deferred

The Workstreams tools are not loaded at session start. Load the ones you need in
**one** `ToolSearch` call, e.g.:

```
ToolSearch "select:mcp__claude_ai_workstreams__create_task,mcp__claude_ai_workstreams__get_task,mcp__claude_ai_workstreams__update_task,mcp__claude_ai_workstreams__search_tasks,mcp__claude_ai_workstreams__create_task_comment,mcp__claude_ai_workstreams__list_task_comments,mcp__claude_ai_workstreams__list_labels,mcp__claude_ai_workstreams__get_stream_config"
```

### Instruction profile

This repo opts into the Workstreams MCP instruction profile
**`managed_task_workflow`** with `defaultChannelId: QKLCFY`: update the task's
status when work starts and when it finishes, reuse any task context you were
handed, and keep descriptions concrete. Read it with
`read_resource "workstreams://server/instruction-profiles"` if you need the
full text.

## Conventions

- **Create a ticket**: `create_task` — `pathParams: {teamId: "S_ZYh417Os", channelId: "QKLCFY"}`,
  body `{teamId, channelId, title, description, statusId: "planned", stepId: "new", labels: [...]}`.
  `teamId` and `channelId` are required in the **body** as well as the path.
  `description` is plain markdown text.
- **Read a ticket**: `get_task` (`pathParams: {taskId}`), plus `list_task_comments`
  (`pathParams: {taskId}`) for the discussion. Pass `metadataOnly=true` in `query`
  when you only need comment counts/authors.
- **List tickets**: prefer `search_tasks` (`POST /tasks/search`) with a `limit` —
  body `{text, template: "list", filters: [...], limit: 25, page: 1, excludeArchived: true}`.
  Filters are `{key, operator, value}` objects, e.g. `{key: "name", operator: "contains", value: "stripe"}`.
  **Avoid bare `list_channel_tasks`** on a populated board: it returns every task
  with full checklists and blew past the tool-output limit (>500 KB) on a
  comparable board. If you must use it, expect to grep the spilled result file.
- **Comment on a ticket**: `create_task_comment` — `pathParams: {taskId}`, body `{textValue: "..."}`.
- **Apply / remove labels**: `update_task` (`PATCH /tasks/{taskId}`) with
  `{labels: [<labelId>, ...]}`. Labels are **team-wide** and addressed by uuid,
  never by name — resolve names with `list_labels` (`pathParams: {teamId}`) first.
  `update_task` replaces the array, so send the full intended set.
- **Move state**: `update_task` with `{statusId, stepId}` from the table above.
- **Close**: `update_task` with `{statusId: "completed", stepId: "deployed"}`,
  after a closing comment. Closing is a state move — do **not** `delete_task`
  or archive to close.
- **Claim**: `update_task` with `{assignee: "SU_yWzWbWTa"}`.

### Ticket identity

Workstreams has no issue numbers. `humanTaskId` is `null` on this workspace, so a
ticket is identified by its **`taskId` uuid** plus its title. There is no `#42`
to write — reference a ticket from a commit or PR body with a trailer:

```
Ticket: aa75e046-54f9-49e4-98a4-88891a14e085
```

and resolve it with `get_task`. Quote the title in prose so a human can find it
on the board.

### No subtask or dependency graph

Workstreams tasks are flat: there is no parent/child task relationship and no
native blocking edge.

- **Breakdown inside one ticket** → `checklist` items (`{text, checked, assignee, dueDate}`),
  which is what the "subtasks" views list.
- **Breakdown across tickets** → separate tasks, with a `Part of: <taskId>` line
  at the top of each child's description.
- **Blocking** → a `Blocked by: <taskId>, <taskId>` line at the top of the
  description. A ticket is unblocked when every blocker sits in `completed`.
  Nothing enforces this; it is a convention agents and humans both read.

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Set to `yes` if this repo treats external PRs as feature requests; `/triage` reads this flag.)_

PRs live on GitHub and are reviewed there. They never enter the Workstreams
triage queue. Run `gh` from the clone root, `repo/` — `CLAUDE.md`, `.claude/`
and `.agents/` sit one level above in a directory that is not a git repo, so
`gh` cannot infer the remote from there. `gh` is also slow against this remote
(the first call in a session has taken over two minutes); allow a generous
timeout rather than treating a slow call as a failure.

## When a skill says "publish to the issue tracker"

Create a Workstreams task in channel `QKLCFY` with `create_task`, then report
the `taskId` and the board URL.

## When a skill says "fetch the relevant ticket"

`get_task` on the `taskId`, then `list_task_comments` for the discussion.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single task; its tickets are sibling tasks
pointing back at it (Workstreams has no sub-task hierarchy).

- **Map**: one task in `QKLCFY` titled `Wayfinder map: <destination>`, labelled
  `wayfinder:map`, holding the Notes / Decisions-so-far / Fog body in its
  `description`. Keep the roster of child tickets as a `checklist` on the map,
  one item per ticket, so the map stays readable in the UI.
- **Child ticket**: a separate task in `QKLCFY` with `Part of: <map taskId>` as
  the first line of its description, labelled `wayfinder:<type>`
  (`research` / `prototype` / `grilling` / `task`). Create the team labels on
  first use with `create_label` (`pathParams: {teamId}`, body `{textValue, color, kind: "default", teamId}`).
- **Blocking**: a `Blocked by: <taskId>, <taskId>` line at the top of the child's
  description. Unblocked when every listed blocker is in `statusId: completed`.
- **Frontier query**: `search_tasks` scoped to the board for tasks not in
  `completed`, keep those listed on the map's checklist, drop any with an open
  blocker or an `assignee`; first in map order wins.
- **Claim**: `update_task` with `{assignee: <userId>}` and a move to
  `statusId: progress` — the session's first write.
- **Resolve**: `create_task_comment` with the answer, `update_task` to
  `{statusId: "completed", stepId: "deployed"}`, then append a context pointer
  to the map's Decisions-so-far via `update_task` on the map's `description`.
