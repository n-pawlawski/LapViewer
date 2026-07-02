const STORAGE_KEY = "lapviewer:selectedSessionId";

export function getSelectedSessionId(): string | null {
  return sessionStorage.getItem(STORAGE_KEY);
}

export function setSelectedSessionId(id: string | null): void {
  if (id) {
    sessionStorage.setItem(STORAGE_KEY, id);
  } else {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}
