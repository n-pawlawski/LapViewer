# Agent platform blueprint

Specification for a **separate repository** that owns the generic agent operating system. LapViewer is the **first project** that uses it; all LapViewer-specific truth stays in the LapViewer repo.

Copy this document into the platform repo as `VISION.md` or `README.md` when you create it.

---

## Goals

1. **Platform repo** — canonical base agents, work-order system, lifecycle, hygiene, dispatch patterns (no product domain).
2. **Project repos** — product code + product docs + a **project agent workspace** (copied/customized agents + work orders + manifest).
3. **Work from either place** — you (or Cursor) open the platform repo to improve the system, or open a project repo to build features using that project’s agent workspace.
4. **Later** — platform tooling reads another repo path and scaffolds/updates work orders (CLI or scripts); not required for v0.

---

## Two repositories

```text
┌──────────────────────────────┐     ┌──────────────────────────────┐
│  agent-platform (new repo)   │     │  LapViewer (project repo)    │
│  Generic process & templates │     │  App + domain docs           │
│  packs/default-web-app/…   │────▶│  .agent-project.yaml         │
│  core/WORK_ORDERS.md …       │ copy│  docs/agents/  (instance)    │
└──────────────────────────────┘     │  docs/work-orders/           │
                                     │  docs/UI_DESIGN.md …         │
                                     └──────────────────────────────┘
```

**Rule:** If it mentions GoPro, laps, sessions, or LapViewer screens, it **never** lives in the platform repo.

---

## Platform repository layout (v0)

Suggested name: `agent-platform` or `forge-agents` (your choice).

```text
agent-platform/
  README.md                 # what this repo is; how to adopt a project
  VISION.md                 # principles (optional duplicate of README sections)

  core/                     # framework docs (project-agnostic)
    BASE_AGENT.md           # read first in any project (generic)
    WORK_ORDERS.md
    AGENT_LAYOUT.md
    FEATURE_LIFECYCLE.md
    PROCESS_HYGIENE.md
    DEVELOPMENT.md            # generic verify/git; projects override commands
    DISPATCH_PROMPTS.md       # copy-paste prompts by work type
    DECISIONS_TEMPLATE.md     # how projects use their own DECISIONS.md

  packs/
    default-web-app/          # first pack (matches LapViewer stack)
      pack.yaml               # id, version, description, work types included
      agents/
        documentation/BASE.md
        architecture/BASE.md
        test-strategy/
        persistence/
        api/
        client/
        unit-test/
        review/
        maintenance/
        implementation/
      templates/
        work-order/_TEMPLATE.md
        project-manifest.agent-project.yaml

    # future: default-cli, default-library, …

  examples/
    adopting-lapviewer.md     # how LapViewer maps to this model

  tooling/                    # future: empty or placeholder README
    README.md                 # scaffold, diff review, prompt emitters
```

### `pack.yaml` (platform)

```yaml
id: default-web-app
version: 0.1.0
description: Monorepo with client, API, persistence, test-strategy, review.
work_types:
  - docs
  - architecture
  - test-strategy
  - persistence
  - api
  - client
  - unit-test
  - review
  - maintenance
  - full-stack
```

---

## Project repository layout (every app, including LapViewer)

All **project-specific** material stays inside the project repo.

```text
lapviewer/
  .agent-project.yaml       # manifest: points at agent workspace + commands

  docs/                     # product & process (project-owned)
    PROJECT_OVERVIEW.md
    FEATURES.md
    UI_DESIGN.md
    DECISIONS.md
    …

  docs/agents/              # PROJECT AGENT WORKSPACE (instance of a pack)
    BASE_AGENT.md           # extends core: links pack version, project paths
    WORK_QUEUE.md           # global/tooling for this project
    README.md
    client/                 # may customize BASE + page-flows.md
    api/
    …

  docs/work-orders/
    WO-ui-shell.md

  client/
  server/
```

### Alternative: single top-level folder

If you prefer one obvious tree:

```text
.agent-workspace/
  manifest.yaml             # same as .agent-project.yaml
  agents/
  work-orders/
  PROJECT_AGENT_README.md   # links to docs/
```

LapViewer already uses `docs/agents/` + `docs/work-orders/` — **keep that** for v0 to avoid churn. The manifest documents those paths.

---

## `.agent-project.yaml` (in each project repo)

Lives at **project root**. Tells humans and future tooling where the workspace is and how to verify.

```yaml
# LapViewer — first consumer (example)
platform_pack: default-web-app
platform_pack_version: "0.1.0"
# platform_repo: https://github.com/you/agent-platform  # optional reference

project_name: LapViewer

paths:
  agents: docs/agents
  work_orders: docs/work-orders
  decisions: docs/DECISIONS.md
  features: docs/FEATURES.md

git:
  default_branch: dev

verify:
  check: npm run check
  test: npm test
  build: npm run build

cursor:
  rules_file: .cursor/rules/lapviewer-base-agent.mdc
```

Platform repo documents this schema in `core/PROJECT_MANIFEST.md`.

---

## How agents are copied vs updated

| Action | Who |
|--------|-----|
| Improve **generic** checklist / WORK_ORDERS | Edit **platform** repo `packs/…/agents/…/BASE.md` |
| Improve **LapViewer** client flows | Edit **LapViewer** `docs/agents/client/page-flows.md` only |
| Upgrade pack version | Maintenance task in project: merge template changes, bump `platform_pack_version` |

Projects are **forks of a pack**, not live dependencies on day one (no submodule required for v0).

---

## Workflow you described

### Working on the **platform**

1. Open `agent-platform` repo.
2. Edit `core/` or `packs/default-web-app/agents/client/BASE.md`.
3. Tag pack release `0.1.1`.
4. Document upgrade notes in platform `CHANGELOG.md`.

### Working on **LapViewer features**

1. Open `LapViewer` repo.
2. Read `docs/agents/BASE_AGENT.md` + project docs.
3. Documentation designer updates specs → work order in `docs/work-orders/`.
4. Dispatch client/api/… agents against **this repo’s** work orders.
5. All code and product docs change only in LapViewer.

### Platform “looks at” another repo (later)

Tooling in platform repo (future):

```bash
# illustrative
agent-platform scaffold-work-order --repo ../LapViewer --id ui-shell-2
agent-platform dispatch-prompt --repo ../LapViewer --work-type client
```

v0: you do this manually with Cursor by opening the project repo and using prompts from `core/DISPATCH_PROMPTS.md`.

---

## Migration plan for LapViewer

| Step | Action |
|------|--------|
| 1 | Create empty **agent-platform** GitHub repo. |
| 2 | Copy generic files from LapViewer → platform `core/` + `packs/default-web-app/` (strip LapViewer references). |
| 3 | Add LapViewer `.agent-project.yaml` at repo root. |
| 4 | Trim LapViewer `docs/agents/BASE_AGENT.md` to “project entry” that references pack version + `docs/` map. |
| 5 | Add `examples/adopting-lapviewer.md` in platform repo. |
| 6 | Continue `WO-ui-shell` in LapViewer only. |

**Do not** delete LapViewer agent docs until platform repo exists and copy is verified.

---

## What to extract from LapViewer first (generic → platform)

| LapViewer path | Platform destination |
|----------------|----------------------|
| `docs/agents/WORK_ORDERS.md` | `core/WORK_ORDERS.md` (genericize examples) |
| `docs/agents/AGENT_LAYOUT.md` | `core/AGENT_LAYOUT.md` |
| `docs/FEATURE_LIFECYCLE.md` | `core/FEATURE_LIFECYCLE.md` |
| `docs/PROCESS_HYGIENE.md` | `core/PROCESS_HYGIENE.md` |
| `docs/agents/*/BASE.md` (minus LapViewer-only aux) | `packs/default-web-app/agents/` |
| `docs/work-orders/_TEMPLATE.md` | `packs/.../templates/work-order/` |
| `docs/agents/TEMPLATES.md` | `core/TEMPLATES.md` |

**Stays in LapViewer only:** `UI_*`, `FEATURES`, `PERSISTENCE`, `VIDEO_LIBRARY`, `DECISIONS` content, `client/page-flows.md`, `WO-*.md`, app code, `.cursor/rules` (project-specific paths).

---

## Open choices (you decide when creating platform repo)

1. **Repo name** — `agent-platform`, `dev-agent-os`, etc.
2. **Pack name** — `default-web-app` vs `typescript-fullstack`.
3. **Manifest filename** — `.agent-project.yaml` vs `agent.project.yaml`.
4. **When to add CLI** — after second project adopts the pack.

---

## Success criteria for v0

- [ ] Platform repo exists with `core/` + one pack.
- [ ] LapViewer has `.agent-project.yaml` and unchanged paths (`docs/agents`, `docs/work-orders`).
- [ ] You can explain in one sentence: “Platform owns templates; LapViewer owns instances and product.”
- [ ] One feature (`WO-ui-shell`) completed using only LapViewer workspace without editing platform repo.
