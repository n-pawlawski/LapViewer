# LapViewer

A personal web application for uploading racing footage, marking lap boundaries, tracking lap times, and comparing laps across one or more sessions.

## What this project does

1. **Import** — Register race videos from your library drive (path in DB, no copy).
2. **Review** — Scrub through footage with a standard video player experience.
3. **Mark laps** — Place markers on the timeline where each lap begins (and optionally ends) to derive lap times.
4. **Compare** — Browse lap times across sessions and play selected laps side-by-side or in a grid (e.g. 2×2).

## Documentation

| Document | Purpose |
|----------|---------|
| [Project Overview](docs/PROJECT_OVERVIEW.md) | Vision, users, core workflow, and success criteria |
| [Documentation System](docs/DOCUMENTATION_SYSTEM.md) | Scalable map for product, architecture, testing, communication, and agent docs |
| [Feature Lifecycle](docs/FEATURE_LIFECYCLE.md) | Gates for feature readiness, implementation, verification, traceability, and done |
| [Decisions](docs/DECISIONS.md) | Project decision log for architecture, product, testing, and workflow choices |
| [Process Hygiene](docs/PROCESS_HYGIENE.md) | Git workflow, verification ladder, definition of done, scaling practices |
| [Development Guide](docs/DEVELOPMENT.md) | Local setup, `npm run check`, branching |
| [Process & Tooling Gaps](docs/PROCESS_TOOLING_GAPS.md) | Prioritized gaps for git, testing, verification, linting, CI, and workflow automation |
| [Features](docs/FEATURES.md) | Feature breakdown with acceptance criteria |
| [Architecture](docs/ARCHITECTURE.md) | Monorepo layout, local vs Docker, how to run the app |
| [Persistence](docs/PERSISTENCE.md) | How sessions, markers, cache, and Docker volumes persist |
| [Open Questions](docs/OPEN_QUESTIONS.md) | Decisions you need to make before implementation |
| [Video Library](docs/VIDEO_LIBRARY.md) | How added videos are tracked, listed, selected, and relinked |
| [Intake Flow](docs/INTAKE_FLOW.md) | Video import workflow design (GoPro, path registration) |
| [UI Forms](docs/UI_FORMS.md) | Three main screens: Data, Intake, Comparison |
| [UI Design](docs/UI_DESIGN.md) | Visual direction, layouts, interaction behavior, and UI states |
| [Working Agreement](docs/WORKING_AGREEMENT.md) | How we collaborate — boundaries, scope, and process |
| [Agent Workflow](docs/AGENT_WORKFLOW.md) | How documentation, implementation, review, and future automation agents coordinate |
| [Agent Contexts](docs/agents/README.md) | Role-specific instructions and work queue for specialized agents |

## Status

**Phase:** Video playback spike — minimal React + Node app.

### Quick start

Prerequisites: [Node.js](https://nodejs.org/) LTS.

```bash
npm run install:all
npm run dev
```

Before merging or marking work complete:

```bash
npm run check
```

See [Development Guide](docs/DEVELOPMENT.md) and [Process Hygiene](docs/PROCESS_HYGIENE.md).

Open **http://localhost:5173** — click **Start** to play the hardcoded demo clip (`GX010012.MP4` from `E:\Racing Videos\2-19 racing league`).

API health check: http://localhost:3000/api/health

For planning docs, see [Open Questions](docs/OPEN_QUESTIONS.md).
