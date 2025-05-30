import React from 'react';
import { k8sGetResource } from '@openshift/dynamic-plugin-sdk-utils';
import useFetchState, {
  FetchStateCallbackPromise,
  NotReadyError,
} from '#~/utilities/useFetchState';
import { AccessReviewResourceAttributes, ServiceKind } from '#~/k8sTypes';
import { ServiceModel, useAccessReview, useRulesReview, listServices } from '#~/api';

const accessReviewResource: AccessReviewResourceAttributes = {
  group: 'user.openshift.io',
  resource: 'services',
  verb: 'list',
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
  namespace: string | undefined,
  serviceNames?: string[],
): Promise<ServiceKind[]> => {
  if (!namespace) {
    throw new NotReadyError('No registries namespace could be found');
  }

  if (!accessReviewLoaded || !rulesReviewLoaded) {
    throw new NotReadyError('Access review or Rules review not loaded');
  }

  const services = allowList
    ? await listServices(namespace)
    : await fetchServices(serviceNames || [], namespace);

  return services;
};

export type ModelRegistryServicesResult = {
  modelRegistryServices: ServiceKind[];
  isLoaded: boolean;
  error?: Error;
  refreshRulesReview: () => void;
};

export const useModelRegistryServices = (
  namespace: string | undefined,
): ModelRegistryServicesResult => {
  const [allowList, accessReviewLoaded] = useAccessReview(
    { ...accessReviewResource, namespace: namespace || '' },
    !!namespace,
  );
  const [rulesReviewStatus, rulesReviewLoaded, refreshRulesReview] = useRulesReview(namespace);

  const serviceNames = React.useMemo(() => {
    if (!rulesReviewLoaded) {
      return [];
    }
    return rulesReviewStatus?.resourceRules
      .filter(
        ({ resources, verbs }) =>
          resources?.includes('services') && verbs.some((verb) => verb === 'get'),
      )
      .flatMap((rule) => rule.resourceNames || []);
  }, [rulesReviewLoaded, rulesReviewStatus]);

  const callback = React.useCallback<FetchStateCallbackPromise<ServiceKind[]>>(
    () =>
      listServicesOrFetchThemByNames(
        allowList,
        accessReviewLoaded,
        rulesReviewLoaded,
        namespace,
        serviceNames,
      ),
    [allowList, accessReviewLoaded, rulesReviewLoaded, serviceNames, namespace],
  );

  const [modelRegistryServices, isLoaded, error] = useFetchState(callback, [], {
    initialPromisePurity: true,
  });

  return {
    modelRegistryServices,
    isLoaded,
    error,
    refreshRulesReview,
  };
};
