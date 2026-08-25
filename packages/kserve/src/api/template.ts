import React from 'react';
import { TemplateModel } from '@odh-dashboard/internal/api/index';
import { TemplateKind } from '@odh-dashboard/k8s-core';
import useFetch, { FetchStateObject, NotReadyError } from '@odh-dashboard/ui-core/hooks/useFetch';
import { k8sGetResource, k8sListResourceItems } from '@openshift/dynamic-plugin-sdk-utils';

export const useFetchTemplates = (namespace?: string): FetchStateObject<TemplateKind[]> => {
  const fetchCallbackPromise = React.useCallback(async () => {
    if (!namespace) {
      return Promise.reject(new NotReadyError('Namespace required to fetch templates'));
    }
    return k8sListResourceItems<TemplateKind>({
      model: TemplateModel,
      queryOptions: {
        ns: namespace,
      },
    });
  }, [namespace]);

  return useFetch(fetchCallbackPromise, []);
};

export const useFetchTemplate = (
  name?: string,
  namespace?: string,
  shouldFetch?: boolean,
): FetchStateObject<TemplateKind | undefined> => {
  const fetchCallbackPromise = React.useCallback(async () => {
    if (!shouldFetch) {
      return Promise.reject(new NotReadyError('Project template fetch disabled'));
    }
    if (!name) {
      return Promise.reject(new NotReadyError('Name required to fetch template'));
    }
    if (!namespace) {
      return Promise.reject(new NotReadyError('Namespace required to fetch template'));
    }
    return k8sGetResource<TemplateKind>({
      model: TemplateModel,
      queryOptions: {
        ns: namespace,
        name,
      },
    });
  }, [name, namespace, shouldFetch]);

  return useFetch(fetchCallbackPromise, undefined);
};
