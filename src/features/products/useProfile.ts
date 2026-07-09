import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { productsApi } from './api';

// Signed-in user's gamification profile (points_total, rank, streaks). Powers the
// Hub header profile card. Auth-required, so only enable when a token is present.
export function useProfile(enabled = true) {
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => productsApi.profile(),
    staleTime: 1000 * 60,
    enabled,
  });
}

// First page (10) of the caller's picked products — the Profile screen shows a
// preview and links "See all" to the Hub's Picks tab.
export function useProfilePicks(enabled = true) {
  return useQuery({
    queryKey: ['profile', 'picks'],
    queryFn: () => productsApi.profilePicks(0),
    staleTime: 1000 * 60,
    enabled,
  });
}

// First page (10) of the caller's reviews (lighter summary shape).
export function useProfileReviews(enabled = true) {
  return useQuery({
    queryKey: ['profile', 'reviews'],
    queryFn: () => productsApi.profileReviews(0),
    staleTime: 1000 * 60,
    enabled,
  });
}

// ─── Another user's public profile (users/:id/*) ──────────────────────────────

export function useUserProfile(id: number, enabled = true) {
  return useQuery({
    queryKey: ['user', id, 'profile'],
    queryFn: () => productsApi.userProfile(id),
    staleTime: 1000 * 60,
    enabled: enabled && !Number.isNaN(id),
  });
}

export function useUserPicks(id: number, enabled = true) {
  return useQuery({
    queryKey: ['user', id, 'picks'],
    queryFn: () => productsApi.userPicks(id, 0),
    staleTime: 1000 * 60,
    enabled: enabled && !Number.isNaN(id),
  });
}

export function useUserReviews(id: number, enabled = true) {
  return useQuery({
    queryKey: ['user', id, 'reviews'],
    queryFn: () => productsApi.userReviews(id, 0),
    staleTime: 1000 * 60,
    enabled: enabled && !Number.isNaN(id),
  });
}

// Top players (page 1). Kept for callers that want a quick top-N snapshot.
export function useLeaderboard(enabled = true) {
  return useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => productsApi.leaderboard(0),
    staleTime: 1000 * 60,
    enabled,
  });
}

// The caller's own position window (a few above / more below). Powers the Hub
// Leaderboard tab.
export function useLeaderboardMe(enabled = true) {
  return useQuery({
    queryKey: ['leaderboard', 'me'],
    queryFn: () => productsApi.leaderboardMe(),
    staleTime: 1000 * 60,
    enabled,
  });
}

// Full leaderboard, paginated (10/page) for infinite scroll on the dedicated
// full-leaderboard screen. A short page (< 10) means we've reached the end.
const LEADERBOARD_PAGE = 10;
export function useLeaderboardInfinite(enabled = true) {
  return useInfiniteQuery({
    queryKey: ['leaderboard', 'full'],
    queryFn: ({ pageParam }) => productsApi.leaderboard(pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (last, allPages) => {
      const count = last?.length ?? 0;
      if (count < LEADERBOARD_PAGE) return undefined;
      return allPages.reduce((sum, p) => sum + (p?.length ?? 0), 0);
    },
    staleTime: 1000 * 60,
    enabled,
  });
}
