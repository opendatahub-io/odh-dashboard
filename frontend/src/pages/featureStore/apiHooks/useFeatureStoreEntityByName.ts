/* eslint-disable camelcase */
import * as React from 'react';
import { useFeatureStoreAPI } from '#~/pages/featureStore/FeatureStoreContext';
import useFetch, { FetchStateCallbackPromise, FetchStateObject } from '#~/utilities/useFetch';
import { Entity } from '#~/pages/featureStore/types/entities';

const useFeatureStoreEntityByName = (
  project?: string,
  entityName?: string,
): FetchStateObject<Entity> => {
  const { api, apiAvailable } = useFeatureStoreAPI();

  const call = React.useCallback<FetchStateCallbackPromise<Entity>>(
    (opts) => {
      if (!apiAvailable) {
        return Promise.reject(new Error('API not yet available'));
      }

      if (!project) {
        return Promise.reject(new Error('Project is required'));
      }

      if (!entityName) {
        return Promise.reject(new Error('Entity name is required'));
      }

      return api.getEntityByName(opts, project, entityName);
    },
    [api, apiAvailable, project, entityName],
  );

  return useFetch(
    call,
    {
      spec: {
        name: '',
        valueType: '',
        description: '',
        joinKey: '',
        tags: {},
        owner: '',
      },
      meta: {
        createdTimestamp: '',
        lastUpdatedTimestamp: '',
      },
      project: '',
      featureDefinition: '',
      dataSources: [],
    },
    { initialPromisePurity: true },
  );
};

export default useFeatureStoreEntityByName;
