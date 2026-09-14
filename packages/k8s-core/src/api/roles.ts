import { k8sCreateResource, k8sGetResource } from '@openshift/dynamic-plugin-sdk-utils';
import { RoleModel } from './models';
import { applyK8sAPIOptions } from '../index';
import type { K8sAPIOptions, RoleKind } from '../k8sTypes';

export const getRole = (namespace: string, roleName: string): Promise<RoleKind> =>
  k8sGetResource({
    model: RoleModel,
    queryOptions: { name: roleName, ns: namespace },
  });

export const createRole = (data: RoleKind, opts?: K8sAPIOptions): Promise<RoleKind> =>
  k8sCreateResource(applyK8sAPIOptions({ model: RoleModel, resource: data }, opts));
