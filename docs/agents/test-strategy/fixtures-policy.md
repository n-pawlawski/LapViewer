# Fixtures policy — LapViewer

Rules for test data in unit and integration tests.

## Principles

- No real user GoPro media in the repo
- No machine-specific absolute paths in committed tests
- Prefer small synthetic data and temp directories (`os.tmpdir()` / `DATA_DIR` overrides in scripts)

## Allowed fixtures

| Type | Location | Example |
|------|----------|---------|
| Temp SQLite DB | Script-created `DATA_DIR` | `auth-isolation-test.mjs`, `public-sessions-test.mjs` |
| In-memory markers/sessions | `*.test.ts` unit tests | Split detection math, lap helpers |
| Mock API modules | `client/src/**/*.test.ts` | Vitest `vi.mock` for split detection |

## Forbidden

- Committing `.MP4` or large binaries under `testdata/`
- Tests that depend on `E:\Racing Videos\...` or other local paths
- Shared production `DATA_DIR` or terraform state

## Integration scripts

Scripts under `server/scripts/*-test.mjs` must:

1. Set `process.env.DATA_DIR` to a unique temp folder
2. Call `closeDatabase()` and remove temp dir in `finally`
