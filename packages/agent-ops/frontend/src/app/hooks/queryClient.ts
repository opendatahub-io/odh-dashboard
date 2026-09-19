import { QueryClient } from '@tanstack/react-query';

const THIRTY_SECONDS_MS = 30000;
const FIVE_MINUTES_MS = 300000;

const defaultQueryClientOptions = {
  queries: {
    refetchOnWindowFocus: false,
    retry: 1,
    staleTime: THIRTY_SECONDS_MS,
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
