import React from 'react';
import { k8sGetResource } from '@openshift/dynamic-plugin-sdk-utils';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '~/utilities/useFetchState';
import { AccessReviewResourceAttributes, ServiceKind } from '~/k8sTypes';
import { ServiceModel, useAccessReview, useRulesReview, listServices } from '~/api';
import { MODEL_REGISTRY_DEFAULT_NAMESPACE } from '~/concepts/modelRegistry/const';

const accessReviewResource: AccessReviewResourceAttributes = {
  group: 'user.openshift.io',
  resource: 'services',
  verb: 'list',
  namespace: MODEL_REGISTRY_DEFAULT_NAMESPACE,
};

const getServiceByName = (name: string, namespace: string): Promise<ServiceKind> =>
  k8sGetResource<ServiceKind>({
    model: ServiceModel,
    queryOptions: { name, ns: namespace },
  });

const fetchServices = async (names: string[], namespace: string): Promise<ServiceKind[]> => {
  if (!namespace) {
    throw new NotReadyError('No namespace');
  }

  if (names.length === 0) {
    return [];
  }

  const servicePromises = names.map((name) => getServiceByName(name, namespace));
  const services = await Promise.all(servicePromises);

  return services;
};

const listServicesOrFetchThemByNames = async (
  allowList: boolean,
  accessReviewLoaded: boolean,
  rulesReviewLoaded: boolean,
  serviceNames?: string[],
): Promise<ServiceKind[]> => {
  if (!accessReviewLoaded || !rulesReviewLoaded) {
    throw new NotReadyError('Access review or Rules review not loaded');
  }

  const services = allowList
    ? await listServices(MODEL_REGISTRY_DEFAULT_NAMESPACE)
    : await fetchServices(serviceNames || [], MODEL_REGISTRY_DEFAULT_NAMESPACE);

  return services;
};

export const useModelRegistryServices = (): FetchState<ServiceKind[]> => {
  const [allowList, accessReviewLoaded] = useAccessReview(accessReviewResource);
  const [statuses, rulesReviewLoaded] = useRulesReview(MODEL_REGISTRY_DEFAULT_NAMESPACE);

  const serviceNames = React.useMemo(() => {
    if (!rulesReviewLoaded) {
      return [];
    }
    return statuses?.resourceRules
      .filter(
        ({ resources, verbs }) =>
          resources?.includes('services') && verbs.some((verb) => verb === 'get'),
      )
      .flatMap((rule) => rule.resourceNames || []);
  }, [rulesReviewLoaded, statuses]);

  const callback = React.useCallback<FetchStateCallbackPromise<ServiceKind[]>>(
    () =>
      listServicesOrFetchThemByNames(
        allowList,
        accessReviewLoaded,
        rulesReviewLoaded,
        serviceNames,
      ),
    [allowList, accessReviewLoaded, rulesReviewLoaded, serviceNames],
  );

  return useFetchState(callback, [], {
    initialPromisePurity: true,
  });
};
