import React from 'react';
import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { FeatureStoreKind } from '#~/k8sTypes';
import { FeatureStoreModel } from '#~/api/models/odh';
import { FetchStateCallbackPromise } from '#~/utilities/useFetchState';
import useFetch, { FetchStateObject } from '#~/utilities/useFetch';
import {
  FEATURE_STORE_UI_LABEL_KEY,
  FEATURE_STORE_UI_LABEL_VALUE,
} from '#~/pages/featureStore/const';

const listFeatureStoreCR = async (): Promise<FeatureStoreKind | null> => {
  const labelSelector = `${FEATURE_STORE_UI_LABEL_KEY}=${FEATURE_STORE_UI_LABEL_VALUE}`;

  const featureStoreCRs = await k8sListResource<FeatureStoreKind>({
    model: FeatureStoreModel,
    queryOptions: {
      queryParams: { labelSelector },
    },
  });

  return featureStoreCRs.items[0] || null;
};

export const useFeatureStoreCR: () => FetchStateObject<FeatureStoreKind | null> = () => {
  const callback = React.useCallback<FetchStateCallbackPromise<FeatureStoreKind | null>>(
    () => listFeatureStoreCR(),
    [],
  );

  return useFetch(callback, null, {
    initialPromisePurity: true,
  });
};
