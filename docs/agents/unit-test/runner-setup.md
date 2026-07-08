# Test runner setup — LapViewer

## Commands

| Scope | Command | Runner |
|-------|---------|--------|
| Repo (CI gate) | `npm test` | Chains server + integration scripts (see root `package.json`) |
| Server unit | `npm run test --prefix server` | Node built-in test runner + `tsx` |
| Server scripts | `npm run test:auth --prefix server`, `test:public`, `test:permissions` | `tsx` / `node` scripts |
| Client unit | `npm run test --prefix client` | Vitest (see WO-unit-test-gate-00) |
| Typecheck | `npm run check` | `tsc` both packages |

## Layout

| Package | Test glob / pattern |
|---------|---------------------|
| `server/src` | `**/*.test.ts` |
| `server/scripts` | `*-test.mjs` (integration) |
| `client/src` | `**/*.test.{ts,tsx}` (when Vitest installed) |

## CI

`.github/workflows/ci.yml` runs `npm run check`, `npm test`, and `npm run build` on push/PR to `dev` / `master`.

## Adding tests

- Colocate `*.test.ts` next to the module under test when practical
- Ask before adding new test dependencies ([D-012](../DECISIONS.md))
- See [TESTING_STRATEGY.md](../../TESTING_STRATEGY.md) and [WO-unit-test-gate.md](../../work-orders/WO-unit-test-gate.md)
