import { useQuery } from '@tanstack/react-query';
import { useGenAiAPI } from '~/app/hooks/useGenAiAPI';
import { MLflowPrompt, MLflowPromptVersion } from '~/app/types';

type UsePromptsListOptions = {
  maxResults?: number;
  filterName?: string;
};

type UsePromptsListResult = {
  prompts: MLflowPrompt[];
  isLoading: boolean;
  error: Error | null;
};

export function usePromptsList(options: UsePromptsListOptions = {}): UsePromptsListResult {
  const { api, apiAvailable } = useGenAiAPI();
  const { maxResults, filterName } = options;

  const { data, isLoading, error } = useQuery({
    queryKey: ['prompts', 'list', { maxResults, filterName }],
    queryFn: async () => {
      const queryParams: Record<string, unknown> = {};
      if (maxResults !== undefined) {
        // eslint-disable-next-line camelcase -- MLflow API uses snake_case
        queryParams.max_results = maxResults;
      }
      if (filterName !== undefined) {
        // eslint-disable-next-line camelcase -- MLflow API uses snake_case
        queryParams.filter_name = filterName;
      }
      const response = await api.listMLflowPrompts(queryParams);
      return response.prompts;
    },
    enabled: apiAvailable,
    staleTime: 60000,
  });

  return {
    prompts: data ?? [],
    isLoading,
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
