import { k8sGetResource } from '@openshift/dynamic-plugin-sdk-utils';
import { applyK8sAPIOptions, type K8sAPIOptions } from '@odh-dashboard/k8s-core';
import { ServingRuntimeModel } from './models';
import type { ServingRuntimeKind } from '../types';

export const getServingRuntime = (
  name: string,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<ServingRuntimeKind> =>
  k8sGetResource<ServingRuntimeKind>(
    applyK8sAPIOptions(
      {
        model: ServingRuntimeModel,
        queryOptions: { name, ns: namespace },
      },
      opts,
    ),
  );
