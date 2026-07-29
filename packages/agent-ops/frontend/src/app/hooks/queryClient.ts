import { QueryClient } from '@tanstack/react-query';

export const createAgentOpsQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 30000,
      },
      mutations: {
        gcTime: Infinity,
      },
    },
  });
