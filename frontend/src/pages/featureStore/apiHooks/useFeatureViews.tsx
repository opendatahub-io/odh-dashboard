import * as React from 'react';
import { useFeatureStoreAPI } from '#~/pages/featureStore/FeatureStoreContext';
import useFetch, { FetchStateCallbackPromise, FetchStateObject } from '#~/utilities/useFetch';
import { FeatureViewsList } from '#~/pages/featureStore/types/featureView';

type UseFeatureViewsProps = {
  project?: string;
  entity?: string;
  featureService?: string;
};

const useFeatureViews = ({
  project,
  entity,
  featureService,
}: UseFeatureViewsProps): FetchStateObject<FeatureViewsList> => {
  const { api, apiAvailable } = useFeatureStoreAPI();

  const call = React.useCallback<FetchStateCallbackPromise<FeatureViewsList>>(
    (opts) => {
      if (!apiAvailable) {
        return Promise.reject(new Error('API not yet available'));
      }

      return api.getFeatureViews(opts, project, entity, featureService);
    },
    [api, apiAvailable, project, entity, featureService],
  );

  return useFetch(
    call,
    {
      featureViews: [],
      pagination: {
        totalCount: 0,
        totalPages: 0,
      },
    },
    { initialPromisePurity: true },
  );
};

export default useFeatureViews;
