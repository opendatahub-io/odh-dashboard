import * as React from 'react';
import type { Model as LlamaModel } from 'llama-stack-client/resources/models';
import { listModels } from '@app/services/llamaStackService';

const useFetchLlamaModels = (): {
  models: LlamaModel[];
  loading: boolean;
  error: string | null;
  isPermissionError: boolean;
  fetchLlamaModels: () => Promise<void>;
} => {
  const [models, setModels] = React.useState<LlamaModel[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isPermissionError, setIsPermissionError] = React.useState(false);

  const fetchLlamaModels = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setIsPermissionError(false);

      const modelList: LlamaModel[] = await listModels();

      setModels(modelList);
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any
      const isError = (err as any)?.status === 401 || (err as any)?.status === 403;

      if (isError) {
        setIsPermissionError(true);
        setError(err instanceof Error ? err.message : 'Permission denied');
      } else {
        setIsPermissionError(false);
        setError(err instanceof Error ? err.message : 'Failed to fetch models');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  return { models, loading, error, isPermissionError, fetchLlamaModels };
};

export default useFetchLlamaModels;
