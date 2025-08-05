/* eslint-disable no-relative-import-paths/no-relative-import-paths */
import * as React from 'react';
import { getVectorDBs } from '../services/llamaStackService';
import { VectorDB } from '../types';

const useFetchVectorDBs = (): {
  vectorDBs: VectorDB[];
  loading: boolean;
  error: string | null;
  fetchVectorDBs: () => Promise<void>;
} => {
  const [vectorDBs, setVectorDBs] = React.useState<VectorDB[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchVectorDBs = async () => {
    try {
      setLoading(true);
      setError(null);

      const vectorDbs: VectorDB[] = await getVectorDBs();
      setVectorDBs(vectorDbs);
    } catch (err) {
      setError(`Failed to fetch models; ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return { vectorDBs, loading, error, fetchVectorDBs };
};

export default useFetchVectorDBs;
