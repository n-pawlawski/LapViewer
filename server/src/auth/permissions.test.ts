import assert from "node:assert/strict";
import test from "node:test";
import { canManagePermissions, parsePermissionsJson, sanitizePermissionInput } from "./permissions.js";
import { DEV_USER_ID } from "../db/users.js";

test("canManagePermissions allows root and nick.pawlawski@gmail.com", () => {
  assert.equal(
    canManagePermissions({ id: DEV_USER_ID, email: "root" }),
    true,
  );
  assert.equal(
    canManagePermissions({ id: "other-id", email: "nick.pawlawski@gmail.com" }),
    true,
  );
  assert.equal(
    canManagePermissions({ id: "other-id", email: "Nick.Pawlawski@gmail.com" }),
    true,
  );
  assert.equal(
    canManagePermissions({ id: "other-id", email: "someone@example.com" }),
    false,
  );
});

test("parsePermissionsJson keeps only known permission keys", () => {
  assert.deepEqual(
    parsePermissionsJson(JSON.stringify(["tracks.manage", "unknown", "sessions.delete"])),
    ["tracks.manage", "sessions.delete"],
  );
});

test("sanitizePermissionInput filters unknown keys", () => {
  assert.deepEqual(sanitizePermissionInput(["users.manage", "bogus"]), ["users.manage"]);
});
