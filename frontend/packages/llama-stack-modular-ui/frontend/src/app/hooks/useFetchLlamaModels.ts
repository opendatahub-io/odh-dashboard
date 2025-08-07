/* eslint-disable no-relative-import-paths/no-relative-import-paths */
import * as React from 'react';
import { getModels } from '../services/llamaStackService';
import { LlamaModel } from '../types';

const useFetchLlamaModels = (): {
  models: LlamaModel[];
  loading: boolean;
  error: Error | undefined;
  fetchLlamaModels: () => Promise<void>;
} => {
  const [models, setModels] = React.useState<LlamaModel[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | undefined>(undefined);

  const fetchLlamaModels = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(undefined);

      const modelList: LlamaModel[] = await getModels();

      setModels(modelList);
    } catch (err) {
      setError(new Error(`Failed to fetch models; ${err}`));
    } finally {
      setLoading(false);
    }
  }, []);

  // Automatically fetch models on hook initialization
  React.useEffect(() => {
    fetchLlamaModels();
  }, [fetchLlamaModels]);

  return { models, loading, error, fetchLlamaModels };
};

export default useFetchLlamaModels;
