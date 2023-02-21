import { k8sGetResource } from '@openshift/dynamic-plugin-sdk-utils';
import { RouteModel } from '~/api/models';
import { RouteKind } from '~/k8sTypes';

export const getRoute = (name: string, namespace: string): Promise<RouteKind> =>
  k8sGetResource<RouteKind>({ model: RouteModel, queryOptions: { name, ns: namespace } });
