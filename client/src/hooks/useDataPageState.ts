import { useCallback, useEffect, useState } from "react";
import {
  fetchPublicSessions,
  fetchSession,
  fetchSessions,
  type SessionDetail,
  type SessionSummary,
} from "../api/sessions";
import { setSelectedSessionId } from "../lib/selectedSession";

export type SessionListScope = "mine" | "public";

export function useDataPageState(sessionFromUrl: string | null) {
  const [scope, setScope] = useState<SessionListScope>("mine");
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reloadSessions = useCallback(async (activeScope: SessionListScope = scope) => {
    const list =
      activeScope === "public" ? await fetchPublicSessions() : await fetchSessions();
    setSessions(list);
    return list;
  }, [scope]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const load = scope === "public" ? fetchPublicSessions() : fetchSessions();

    load
      .then((list) => {
        if (cancelled) return;
        setSessions(list);
        if (list.length > 0) {
          setSelectedId((prev) => {
            if (sessionFromUrl && list.some((s) => s.id === sessionFromUrl)) {
              return sessionFromUrl;
            }
            return prev && list.some((s) => s.id === prev) ? prev : list[0].id;
          });
        } else {
          setSelectedId(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load sessions");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sessionFromUrl, scope]);

  useEffect(() => {
    setSelectedSessionId(selectedId);
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }

    let cancelled = false;
    fetchSession(selectedId)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load session");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const changeScope = useCallback((next: SessionListScope) => {
    setScope(next);
    setSelectedId(null);
    setDetail(null);
  }, []);

  const refreshDetail = useCallback(async () => {
    if (!selectedId) return null;
    const data = await fetchSession(selectedId);
    setDetail(data);
    await reloadSessions();
    return data;
  }, [selectedId, reloadSessions]);

  const removeSessionFromList = useCallback(
    (id: string) => {
      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== id);
        if (selectedId === id) {
          setSelectedId(next[0]?.id ?? null);
          setDetail(null);
        }
        return next;
      });
    },
    [selectedId],
  );

  return {
    scope,
    setScope: changeScope,
    sessions,
    setSessions,
    selectedId,
    setSelectedId,
    detail,
    setDetail,
    loading,
    error,
    setError,
    reloadSessions,
    refreshDetail,
    removeSessionFromList,
  };
}
