import { k8sGetResource } from '@openshift/dynamic-plugin-sdk-utils';
import { ResourceClaimModel, ResourceClaimTemplateModel } from './models';
import { applyK8sAPIOptions } from '../apiMergeUtils';
import type { K8sAPIOptions } from '../k8sTypes';
import type { ResourceClaimKind, ResourceClaimTemplateKind } from '../dra/types';

export const getResourceClaimTemplate = (
  namespace: string,
  name: string,
  opts?: K8sAPIOptions,
): Promise<ResourceClaimTemplateKind> =>
  k8sGetResource<ResourceClaimTemplateKind>(
    applyK8sAPIOptions(
      {
        model: ResourceClaimTemplateModel,
        queryOptions: { name, ns: namespace },
      },
      opts,
    ),
  );

export const getResourceClaim = (
  namespace: string,
  name: string,
  opts?: K8sAPIOptions,
): Promise<ResourceClaimKind> =>
  k8sGetResource<ResourceClaimKind>(
    applyK8sAPIOptions(
      {
        model: ResourceClaimModel,
        queryOptions: { name, ns: namespace },
      },
      opts,
    ),
  );
