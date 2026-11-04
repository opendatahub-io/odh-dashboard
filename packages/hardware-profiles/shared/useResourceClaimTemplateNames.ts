import * as React from 'react';
import type { ResourceClaimTemplateKind } from '@odh-dashboard/k8s-core';
import { groupVersionKind } from '@odh-dashboard/k8s-core/api/k8sUtils';
import { ResourceClaimTemplateModel } from '@odh-dashboard/k8s-core/api/models';
import useK8sWatchResourceList from '@odh-dashboard/ui-core/hooks/useK8sWatchResourceList';

export type ResourceClaimTemplateNamesResult =
  | { status: 'unavailable' }
  | { status: 'loading' }
  | { status: 'ready'; names: Set<string> };

export const useResourceClaimTemplateNames = (
  namespace?: string,
): ResourceClaimTemplateNamesResult => {
  const resource = React.useMemo(
    () =>
      namespace
        ? {
            isList: true,
            groupVersionKind: groupVersionKind(ResourceClaimTemplateModel),
            namespace,
          }
        : null,
    [namespace],
  );

  const [templates, loaded, error] = useK8sWatchResourceList<ResourceClaimTemplateKind[]>(
    resource,
    ResourceClaimTemplateModel,
  );

  return React.useMemo(() => {
    if (!namespace || error) {
      return { status: 'unavailable' };
    }
    if (!loaded) {
      return { status: 'loading' };
    }
    return {
      status: 'ready',
      names: new Set(templates.map((template) => template.metadata.name)),
    };
  }, [namespace, templates, loaded, error]);
};
