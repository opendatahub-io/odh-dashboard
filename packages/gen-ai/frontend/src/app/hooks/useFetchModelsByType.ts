/* eslint-disable no-relative-import-paths/no-relative-import-paths */
import * as React from 'react';
import { getModelsByType } from '../services/llamaStackService';
import { LlamaModel, LlamaModelType } from '../types';

const useFetchModelsByType = (
  modelType: LlamaModelType,
): {
  embeddingModels: LlamaModel[];
  loading: boolean;
  error: string | null;
  fetchModels: () => Promise<void>;
} => {
  const [embeddingModels, setEmbeddingModels] = React.useState<LlamaModel[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchModels = async () => {
    try {
      setLoading(true);
      setError(null);

      const modelList: LlamaModel[] = await getModelsByType(modelType);

      setEmbeddingModels(modelList);
    } catch (err) {
      setError(`Failed to fetch ${modelType} models; ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return { embeddingModels, loading, error, fetchModels };
};

export default useFetchModelsByType;
