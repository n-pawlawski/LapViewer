import { apiFetch } from "./client";

export interface PermissionDefinition {
  key: string;
  label: string;
}

export interface AccountResponse {
  user: {
    id: string;
    email: string;
    displayName: string;
    isDevAccount: boolean;
    canManagePermissions: boolean;
    permissions: string[];
  };
  permissionDefinitions: PermissionDefinition[];
}

export interface UserAdminRecord {
  id: string;
  email: string;
  displayName: string;
  isDevAccount: boolean;
  permissions: string[];
  createdAt: string;
}

export async function fetchAccount(): Promise<AccountResponse> {
  return apiFetch<AccountResponse>("/api/account");
}

export async function updateAccountDisplayName(displayName: string): Promise<AccountResponse["user"]> {
  return apiFetch<AccountResponse["user"]>("/api/account", {
    method: "PATCH",
    body: JSON.stringify({ displayName }),
  });
}

export async function fetchAdminUsers(): Promise<UserAdminRecord[]> {
  const response = await apiFetch<{ users: UserAdminRecord[] }>("/api/users");
  return response.users;
}

export async function updateUserPermissions(
  userId: string,
  permissions: string[],
): Promise<UserAdminRecord> {
  return apiFetch<UserAdminRecord>(`/api/users/${userId}/permissions`, {
    method: "PATCH",
    body: JSON.stringify({ permissions }),
  });
}
