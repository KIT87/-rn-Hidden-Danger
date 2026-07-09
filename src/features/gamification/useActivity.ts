import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { productsApi } from '@/features/products/api';
import { useAuth } from '@/features/auth/AuthContext';
import { storage } from '@/lib/storage/secure';
import type { ActivityPayload } from '@/features/products/types';

// Refresh the profile-derived caches (points, rank, streak, leaderboard) after
// an activity mutates them server-side.
function invalidateGamification(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['profile'] });
  qc.invalidateQueries({ queryKey: ['leaderboard'] });
}

// Fire-and-forget recorder for `scan` / `search` activities. Pass a `query`
// (+ resolved product, for scans) to also populate search/scan history. Safe to
// call from any authenticated screen; failures are swallowed (best-effort).
export function useRecordActivity() {
  const qc = useQueryClient();
  return useCallback(
    (payload: ActivityPayload) => {
      productsApi
        .recordActivity(payload)
        .then((res) => {
          if (!res) return;
          invalidateGamification(qc);
          // A query means it also touched search/scan history.
          if (payload.query) qc.invalidateQueries({ queryKey: ['search', 'history'] });
        })
        .catch(() => {});
    },
    [qc],
  );
}

// Local calendar day, e.g. "2026-7-9". Streak buckets are per calendar day, and
// the server no-ops same-day repeats — this just avoids redundant calls.
function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// Records `app_open` at most once per local calendar day — on cold start and on
// every foreground transition. Calls `onStreak(current_streak)` only when a new
// day is actually recorded, so the caller can surface a streak toast.
export function useDailyAppOpen(onStreak?: (streak: number) => void) {
  const { token } = useAuth();
  const qc = useQueryClient();
  const cbRef = useRef(onStreak);
  cbRef.current = onStreak;

  const run = useCallback(async () => {
    if (!token) return;
    const today = todayKey();
    if ((await storage.getLastAppOpen()) === today) return;
    const res = await productsApi.recordActivity({ type: 'app_open' }).catch(() => null);
    if (!res) return; // offline/failed — retry on next foreground
    await storage.setLastAppOpen(today);
    invalidateGamification(qc);
    cbRef.current?.(res.current_streak);
  }, [token, qc]);

  useEffect(() => { run(); }, [run]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });
    return () => sub.remove();
  }, [run]);
}
