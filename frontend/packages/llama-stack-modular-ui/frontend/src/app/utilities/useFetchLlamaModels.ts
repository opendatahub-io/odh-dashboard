/* eslint-disable no-relative-import-paths/no-relative-import-paths */
import * as React from 'react';
import type { Model as LlamaModel } from 'llama-stack-client/resources/models';
import { listModels } from '../services/llamaStackService';

const useFetchLlamaModels = (): {
  models: LlamaModel[];
  loading: boolean;
  error: string | null;
  fetchLlamaModels: () => Promise<void>;
} => {
  const [models, setModels] = React.useState<LlamaModel[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchLlamaModels = async () => {
    try {
      setLoading(true);
      setError(null);

      const modelList: LlamaModel[] = await listModels();

      setModels(modelList);
    } catch (err) {
      setError(`Failed to fetch models; ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return { models, loading, error, fetchLlamaModels };
};

export default useFetchLlamaModels;
