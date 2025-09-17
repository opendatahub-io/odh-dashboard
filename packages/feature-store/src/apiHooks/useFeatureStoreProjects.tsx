/* eslint-disable camelcase */
import * as React from 'react';
import { FetchStateObject } from '@odh-dashboard/internal/utilities/useFetch';
import { FeatureStoreContext } from '../FeatureStoreContext';
import { ProjectList } from '../types/featureStoreProjects';

const useFeatureStoreProjects = (): FetchStateObject<ProjectList> => {
  const {
    featureStoreProjects,
    featureStoreProjectsLoaded,
    featureStoreProjectsError,
    refreshFeatureStoreProjects,
  } = React.useContext(FeatureStoreContext);

  const refreshCallback = React.useCallback(async (): Promise<ProjectList | undefined> => {
    try {
      await refreshFeatureStoreProjects();
      return featureStoreProjects;
    } catch (error) {
      return undefined;
    }
  }, [refreshFeatureStoreProjects, featureStoreProjects]);

  const result = React.useMemo(
    () => ({
      data: featureStoreProjects,
      loaded: featureStoreProjectsLoaded,
      error: featureStoreProjectsError,
      refresh: refreshCallback,
    }),
    [featureStoreProjects, featureStoreProjectsLoaded, featureStoreProjectsError, refreshCallback],
  );

  return result;
};

export default useFeatureStoreProjects;
