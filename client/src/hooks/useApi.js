import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';

// ── Generic fetch hook ────────────────────────────────────────
export function useApi(url, options = {}) {
  const [data, setData] = useState(options.initialData ?? null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const fetch = useCallback(async (overrideUrl) => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);
    try {
      const res = await api.get(overrideUrl || url, {
        signal: abortRef.current.signal,
      });
      setData(res.data);
      return res.data;
    } catch (err) {
      if (err.name !== 'CanceledError') {
        setError(err.response?.data?.error || err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    if (url) fetch();
    return () => abortRef.current?.abort();
  }, [url]);

  return { data, loading, error, refetch: fetch, setData };
}

// ── Mutation hook ─────────────────────────────────────────────
export function useMutation(method = 'post') {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mutate = useCallback(async (url, data) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api[method](url, data);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, [method]);

  return { mutate, loading, error };
}

// ── Pagination hook ───────────────────────────────────────────
export function usePagination(items, perPage = 20) {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(items.length / perPage);
  const paged = items.slice((page - 1) * perPage, page * perPage);
  return { paged, page, setPage, totalPages, total: items.length };
}
