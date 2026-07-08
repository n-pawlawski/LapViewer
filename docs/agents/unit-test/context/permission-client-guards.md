# Context: Client permission helpers + route guards (WO-unit-test-gate-02)

**Work item:** WO-unit-test-gate-02  
**Blocked by:** WO-unit-test-gate-00 (Vitest)  
**Files under test:**

- `client/src/lib/permissions.ts`
- `client/src/components/RequirePermission.tsx`

---

## Test files to create

| File | Scope |
|------|--------|
| `client/src/lib/permissions.test.ts` | Pure functions |
| `client/src/components/RequirePermission.test.tsx` | Redirect behavior |

---

## `permissions.test.ts` cases

```typescript
// hasPermission
// - returns false for null user
// - returns true when key in user.permissions
// - returns false when key missing

// canViewStats
// - true when stats.view granted
// - true when user.canManagePermissions (even without stats.view)
// - false otherwise
```

Use minimal `AuthUser` fixtures matching `client/src/api/auth.ts` shape:

```typescript
const baseUser = {
  id: "u1",
  email: "a@b.com",
  displayName: "Test",
  isDevAccount: false,
  canManagePermissions: false,
  permissions: [] as string[],
};
```

---

## `RequirePermission.test.tsx` setup

Mock dependencies:

```typescript
vi.mock("../context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("../lib/router", () => ({ useRouter: vi.fn() }));
```

Provide `navigate` spy; render child `<div data-testid="child" />`.

### Cases

| Props | User state | Expect |
|-------|------------|--------|
| `permission="tracks.manage"` | no permission | `navigate("/")` called; child not rendered |
| `permission="tracks.manage"` | has permission | child rendered; no navigate |
| `requireStatsAccess` | no stats.view | `navigate("/account")` |
| `requireStatsAccess` | canManagePermissions true | child rendered |
| `status="loading"` | — | child not rendered; no navigate yet |

Default `redirectTo` is `/`; stats uses `/account` via props in `App.tsx`.

---

## Out of scope

- Full `App.tsx` routing integration (browser-qa item 04)
- E2E with real login

---

## Verification

```bash
npm run test --prefix client
npm run check
```
