import assert from "node:assert/strict";
import test from "node:test";
import {
  ALL_PERMISSION_KEYS,
  canManagePermissions,
  parsePermissionsJson,
  sanitizePermissionInput,
  userHasPermission,
} from "./permissions.js";
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

test("userHasPermission checks granted keys only", () => {
  const granted = ["tracks.manage", "stats.view"];
  assert.equal(userHasPermission(granted, "tracks.manage"), true);
  assert.equal(userHasPermission(granted, "sessions.delete"), false);
});

test("ALL_PERMISSION_KEYS lists every defined permission", () => {
  assert.equal(ALL_PERMISSION_KEYS.length, 4);
  assert.ok(ALL_PERMISSION_KEYS.includes("sessions.delete"));
  assert.ok(ALL_PERMISSION_KEYS.includes("tracks.manage"));
});
