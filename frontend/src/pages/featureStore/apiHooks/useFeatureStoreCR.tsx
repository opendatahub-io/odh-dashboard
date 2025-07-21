import React from 'react';
import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { FeatureStoreKind } from '#~/k8sTypes';
import { FeatureStoreModel } from '#~/api/models/odh.ts';
import { FetchStateCallbackPromise } from '#~/utilities/useFetchState';
import useFetch from '#~/utilities/useFetch.ts';
import {
  FEATURE_STORE_UI_LABEL_KEY,
  FEATURE_STORE_UI_LABEL_VALUE,
} from '#~/pages/featureStore/const.ts';

type FeatureStoreCRResult = {
  featureStoreCR: FeatureStoreKind | null;
  isLoaded: boolean;
  error?: Error;
};

const listFeatureStoreCR = async (): Promise<FeatureStoreKind | null> => {
  const labelSelector = `${FEATURE_STORE_UI_LABEL_KEY}=${FEATURE_STORE_UI_LABEL_VALUE}`;

  const featureStoreCRs = await k8sListResource<FeatureStoreKind>({
    model: FeatureStoreModel,
    queryOptions: { queryParams: { labelSelector } },
  });

  const filteredFeatureStoreCR = featureStoreCRs.items.filter(
    (cr) => cr.metadata.labels?.[FEATURE_STORE_UI_LABEL_KEY] === FEATURE_STORE_UI_LABEL_VALUE,
  );

  return filteredFeatureStoreCR[0] || null;
};

export const useFeatureStoreCR: () => FeatureStoreCRResult = () => {
  const callback = React.useCallback<FetchStateCallbackPromise<FeatureStoreKind | null>>(
    () => listFeatureStoreCR(),
    [],
  );

  const {
    data: featureStoreCR,
    loaded: isLoaded,
    error,
  } = useFetch(callback, null, {
    initialPromisePurity: true,
  });

  return {
    featureStoreCR,
    isLoaded,
    error,
  };
};
