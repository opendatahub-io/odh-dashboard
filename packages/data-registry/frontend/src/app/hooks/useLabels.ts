import React from 'react';
import { useFetchState, type APIOptions, type FetchStateCallbackPromise } from 'mod-arch-core';
import { fetchLabels } from '~/app/api/dataRegistry';

export const useLabels = (project: string): [string[], boolean, Error | undefined, () => void] => {
  const callback = React.useCallback<FetchStateCallbackPromise<string[]>>(
    async (opts: APIOptions) => {
      if (!project) {
        return [];
      }
      const response = await fetchLabels(project, opts);
      return response.labels;
    },
    [project],
  );

  return useFetchState(callback, [], { initialPromisePurity: true });
};
