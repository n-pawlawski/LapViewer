# Context: Root test script aggregation (WO-unit-test-gate-05)

**Work item:** WO-unit-test-gate-05  
**Touches:** Root `package.json` only (prefer not to edit `server/package.json` — that's item 01)

---

## Current state

| Command | What runs |
|---------|-----------|
| `npm test` (root) | `npm run test --prefix server` only |
| `npm run test:auth --prefix server` | Auth isolation script (manual) |
| `npm run test:public --prefix server` | Public sessions script (manual) |

CI (`.github/workflows/ci.yml`) runs `npm test` + `npm run check` + `npm run build`.

---

## Target `test` script

Chain with `&&` (fail fast):

```json
"test": "npm run test --prefix server && npm run test:auth --prefix server && npm run test:public --prefix server"
```

After WO-unit-test-gate-01 merges:

```json
"test": "npm run test --prefix server && npm run test:auth --prefix server && npm run test:public --prefix server && npm run test:permissions --prefix server"
```

After WO-unit-test-gate-00 merges, prepend or append client:

```json
"test": "npm run test --prefix server && npm run test --prefix client && ..."
```

**Coordinator:** If 00 and 05 run in parallel, 05 agent should leave a `TODO` comment in package.json for client chain or re-run after 00.

---

## Optional convenience scripts

```json
"test:integration": "npm run test:auth --prefix server && npm run test:public --prefix server && npm run test:permissions --prefix server"
```

---

## Do not

- Change CI workflow unless root script name changes
- Add dependencies

---

## Verification

```bash
npm test
npm run check
```

---

## Docs

Update `docs/TESTING_STRATEGY.md` verification ladder table.
