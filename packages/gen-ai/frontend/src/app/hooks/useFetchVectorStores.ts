import * as React from 'react';
import { FetchState, useFetchState } from 'mod-arch-core';
import { getVectorStores } from '~/app/services/llamaStackService';
import { VectorStore } from '~/app/types';

const useFetchVectorStores = (): FetchState<VectorStore[]> => {
  const fetchData = React.useCallback(() => getVectorStores(), []);

  return useFetchState<VectorStore[]>(fetchData, []);
};

export default useFetchVectorStores;
