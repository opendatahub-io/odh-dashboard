import * as React from 'react';
import useFetch, {
  FetchStateCallbackPromise,
  FetchStateObject,
} from '@odh-dashboard/internal/utilities/useFetch';
import { useFeatureStoreAPI } from '../FeatureStoreContext';
import { FeatureViewsList } from '../types/featureView';

type UseFeatureViewsProps = {
  project?: string;
  entity?: string;
  featureService?: string;
  feature?: string;
};

const useFeatureViews = ({
  project,
  entity,
  featureService,
  feature,
}: UseFeatureViewsProps): FetchStateObject<FeatureViewsList> => {
  const { api, apiAvailable } = useFeatureStoreAPI();

  const call = React.useCallback<FetchStateCallbackPromise<FeatureViewsList>>(
    (opts) => {
      if (!apiAvailable) {
        return Promise.reject(new Error('API not yet available'));
      }

      return api.getFeatureViews(opts, project, entity, featureService, feature);
    },
    [api, apiAvailable, project, entity, featureService, feature],
  );

  return useFetch(
    call,
    {
      featureViews: [],
      relationships: {},
      pagination: {
        totalCount: 0,
        totalPages: 0,
      },
    },
    { initialPromisePurity: true },
  );
};

export default useFeatureViews;
