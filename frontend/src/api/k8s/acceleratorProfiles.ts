import {
  k8sGetResource,
  k8sListResource,
  k8sDeleteResource,
  K8sStatus,
  k8sCreateResource,
  k8sUpdateResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { AcceleratorProfileKind, K8sAPIOptions } from '#~/k8sTypes';
import { AcceleratorProfileModel } from '#~/api/models';
import { applyK8sAPIOptions } from '#~/api/apiMergeUtils';
import { kindApiVersion, translateDisplayNameForK8s } from '#~/concepts/k8s/utils';

export const listAcceleratorProfiles = async (
  namespace: string,
): Promise<AcceleratorProfileKind[]> =>
  k8sListResource<AcceleratorProfileKind>({
    model: AcceleratorProfileModel,
    queryOptions: {
      ns: namespace,
    },
  }).then((listResource) => listResource.items);

export const getAcceleratorProfile = (
  name: string,
  namespace: string,
): Promise<AcceleratorProfileKind> =>
  k8sGetResource<AcceleratorProfileKind>({
    model: AcceleratorProfileModel,
    queryOptions: { name, ns: namespace },
  });

const assembleAcceleratorProfile = (
  spec: AcceleratorProfileKind['spec'],
  namespace: string,
  name?: string,
): AcceleratorProfileKind => ({
  apiVersion: kindApiVersion(AcceleratorProfileModel),
  kind: AcceleratorProfileModel.kind,
  metadata: {
    name: name || translateDisplayNameForK8s(spec.displayName),
    namespace,
    annotations: {
      'opendatahub.io/modified-date': new Date().toISOString(),
    },
  },
  spec,
});

export const createAcceleratorProfile = (
  acceleratorProfile: { name?: string } & AcceleratorProfileKind['spec'],
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<AcceleratorProfileKind> => {
  const { name, ...spec } = acceleratorProfile;
  const resource: AcceleratorProfileKind = assembleAcceleratorProfile(spec, namespace, name);
  return k8sCreateResource<AcceleratorProfileKind>(
    applyK8sAPIOptions(
      {
        model: AcceleratorProfileModel,
        resource,
      },
      opts,
    ),
  );
};

export const updateAcceleratorProfile = async (
  name: string,
  namespace: string,
  spec: Partial<AcceleratorProfileKind['spec']>,
  opts?: K8sAPIOptions,
): Promise<AcceleratorProfileKind> => {
  const oldAcceleratorProfile = await getAcceleratorProfile(name, namespace);
  const resource = {
    ...oldAcceleratorProfile,
    metadata: {
      ...oldAcceleratorProfile.metadata,
      annotations: {
        ...oldAcceleratorProfile.metadata.annotations,
        'opendatahub.io/modified-date': new Date().toISOString(),
      },
    },
    spec: {
      ...oldAcceleratorProfile.spec,
      ...spec,
    },
  };
  return k8sUpdateResource<AcceleratorProfileKind>(
    applyK8sAPIOptions(
      {
        model: AcceleratorProfileModel,
        resource,
      },
      opts,
    ),
  );
};

export const deleteAcceleratorProfile = (
  name: string,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<K8sStatus> =>
  k8sDeleteResource<AcceleratorProfileKind, K8sStatus>(
    applyK8sAPIOptions(
      {
        model: AcceleratorProfileModel,
        queryOptions: { name, ns: namespace },
      },
      opts,
    ),
  );
