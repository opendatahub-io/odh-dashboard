import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useGenAiAPI } from '~/app/hooks/useGenAiAPI';
import {
  MLflowPrompt,
  MLflowPromptsResponse,
  MLflowPromptVersion,
  MLflowRegisterPromptRequest,
} from '~/app/types';

type UsePromptsListOptions = {
  maxResults?: number;
  filterName?: string;
};

type UsePromptsListResult = {
  prompts: MLflowPrompt[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  error: Error | null;
};

export function usePromptsList(options: UsePromptsListOptions = {}): UsePromptsListResult {
  const { api, apiAvailable } = useGenAiAPI();
  const { maxResults, filterName } = options;

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error } =
    useInfiniteQuery<
      MLflowPromptsResponse,
      Error,
      MLflowPrompt[],
      [string, string, { maxResults?: number; filterName?: string }],
      string | undefined
    >({
      queryKey: ['prompts', 'list', { maxResults, filterName }],
      queryFn: async ({ pageParam }) => {
        const queryParams: Record<string, unknown> = {};
        if (maxResults !== undefined) {
          // eslint-disable-next-line camelcase -- MLflow API uses snake_case
          queryParams.max_results = maxResults;
        }
        if (filterName !== undefined) {
          // eslint-disable-next-line camelcase -- MLflow API uses snake_case
          queryParams.filter_name = filterName;
        }
        if (pageParam) {
          // eslint-disable-next-line camelcase -- MLflow API uses snake_case
          queryParams.page_token = pageParam;
        }
        return api.listMLflowPrompts(queryParams);
      },
      initialPageParam: undefined,
      getNextPageParam: (lastPage) => lastPage.next_page_token,
      select: (queryData) => queryData.pages.flatMap((page) => page.prompts),
      enabled: apiAvailable,
      staleTime: 60000,
    });

  return {
    prompts: data ?? [],
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error: error ?? null,
  };
}

type UsePromptVersionsResult = {
  versions: MLflowPromptVersion[];
  isLoading: boolean;
  error: Error | null;
};

export function usePromptVersions(promptName: string | null): UsePromptVersionsResult {
  const { api, apiAvailable } = useGenAiAPI();

  const { data, isLoading, error } = useQuery({
    queryKey: ['prompts', promptName, 'versions'],
    queryFn: async () => {
      if (!promptName) {
        return [];
      }
      const versionsResponse = await api.listMLflowPromptVersions({ name: promptName });
      const versions = await Promise.all(
        versionsResponse.versions.map((v) =>
          api.getMLflowPrompt({ name: promptName, version: v.version }),
        ),
      );
      return versions.toSorted((a, b) => b.version - a.version);
    },
    enabled: !!promptName && apiAvailable,
    staleTime: 60000,
  });

  return {
    versions: data ?? [],
    isLoading,
    error: error ?? null,
  };
}

type UseCreatePromptOptions = {
  onSuccess?: (data: MLflowPromptVersion) => void;
  onError?: (error: Error) => void;
};

type UseCreatePromptResult = {
  createPrompt: (request: MLflowRegisterPromptRequest) => void;
  isCreating: boolean;
  error: Error | null;
};

export function useCreatePrompt(options: UseCreatePromptOptions = {}): UseCreatePromptResult {
  const { api, apiAvailable } = useGenAiAPI();
  const queryClient = useQueryClient();
  const { onSuccess, onError } = options;

  const { mutate, isPending, error } = useMutation<
    MLflowPromptVersion,
    Error,
    MLflowRegisterPromptRequest
  >({
    mutationFn: async (request) => {
      if (!apiAvailable) {
        throw new Error('API is not available');
      }
      return api.registerMLflowPrompt(request);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['prompts', 'list'] });
      onSuccess?.(data);
    },
    onError,
  });

  return {
    createPrompt: mutate,
    isCreating: isPending,
    error: error ?? null,
  };
}
