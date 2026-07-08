# Context: Client Vitest setup (WO-unit-test-gate-00)

**Work item:** WO-unit-test-gate-00  
**Goal:** Enable `npm run test --prefix client` for hook and component unit tests.

---

## Suggested stack

| Package | Purpose |
|---------|---------|
| `vitest` | Test runner (Vite-native) |
| `jsdom` | DOM for React |
| `@testing-library/react` | `render`, `renderHook` |
| `@testing-library/jest-dom` | Matchers (optional) |

Ask before adding packages ([D-012](DECISIONS.md) / agent rules).

---

## Config sketch

`client/vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: false,
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
```

---

## package.json scripts

```json
"test": "vitest run",
"test:watch": "vitest"
```

---

## Root integration

After WO-05 or in this item, extend root `package.json`:

```json
"test": "npm run test --prefix server && npm run test --prefix client && npm run test:auth --prefix server && ..."
```

Order: server unit tests first (fast), then client, then integration scripts.

---

## Smoke test

Add `client/src/lib/permissions.test.ts` with one trivial test **or** leave for WO-02.

---

## CI

`.github/workflows/ci.yml` already runs `npm test` — no workflow change needed if root script chains client tests.

---

## Verification

```bash
npm run test --prefix client
npm run build --prefix client
npm run check
```

---

## Docs

- `docs/TESTING_STRATEGY.md` — client runner row
- `docs/agents/unit-test/runner-setup.md` — Vitest notes
