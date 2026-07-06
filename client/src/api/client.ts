export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  if (!res.ok) {
    const body = isJson ? await res.json().catch(() => ({})) : {};
    const message =
      typeof body.error === "string"
        ? body.error
        : isJson
          ? `Request failed (${res.status})`
          : `Request failed (${res.status}) — restart the API server if Reference/Match features were recently added`;
    throw new ApiError(message, res.status);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  if (!isJson) {
    throw new ApiError(
      "Server returned a non-JSON response — restart the API server (npm run dev) after pulling Reference tab changes",
      res.status,
    );
  }
  return res.json() as Promise<T>;
}

export async function apiFetchOptional<T>(url: string, init?: RequestInit): Promise<T | null> {
  const res = await fetch(url, {
    credentials: "include",
    ...init,
  });
  if (res.status === 401) return null;
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      typeof body.error === "string" ? body.error : `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }
  return res.json() as Promise<T>;
}
