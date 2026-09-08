import { QueryClient } from '@tanstack/react-query';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

const defaultQueryClientOptions = {
  queries: {
    refetchOnWindowFocus: false,
    retry: 1,
    staleTime: 30000,
  },
  mutations: {
    gcTime: Infinity,
  },
} as const;

export const createAgentOpsQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: defaultQueryClientOptions,
  });

/** Workspaces UI uses a per-mount client so MF tab and breakout routes do not share stale cache. */
export const createWorkspacesQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      ...defaultQueryClientOptions,
      mutations: {
        gcTime: FIVE_MINUTES_MS,
      },
    },
  });
