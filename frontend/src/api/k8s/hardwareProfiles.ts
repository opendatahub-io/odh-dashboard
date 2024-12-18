import * as _ from 'lodash-es';
import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sListResource,
  k8sPatchResource,
  K8sStatus,
  k8sUpdateResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { HardwareProfileKind, K8sAPIOptions } from '~/k8sTypes';
import { HardwareProfileModel } from '~/api/models';
import { applyK8sAPIOptions } from '~/api/apiMergeUtils';
import { translateDisplayNameForK8s } from '~/concepts/k8s/utils';

export const listHardwareProfiles = async (namespace: string): Promise<HardwareProfileKind[]> =>
  k8sListResource<HardwareProfileKind>({
    model: HardwareProfileModel,
    queryOptions: {
      ns: namespace,
    },
  }).then((listResource) => listResource.items);

export const getHardwareProfile = (name: string, namespace: string): Promise<HardwareProfileKind> =>
  k8sGetResource<HardwareProfileKind>({
    model: HardwareProfileModel,
    queryOptions: { name, ns: namespace },
  });

export const assembleHardwareProfile = (
  hardwareProfileName: string,
  data: HardwareProfileKind['spec'],
  namespace: string,
): HardwareProfileKind => ({
  apiVersion: `${HardwareProfileModel.apiGroup}/${HardwareProfileModel.apiVersion}`,
  kind: HardwareProfileModel.kind,
  metadata: {
    name: hardwareProfileName || translateDisplayNameForK8s(data.displayName),
    namespace,
  },
  spec: data,
});

export const createHardwareProfile = (
  hardwareProfileName: string,
  data: HardwareProfileKind['spec'],
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<HardwareProfileKind> => {
  const resource = assembleHardwareProfile(hardwareProfileName, data, namespace);
  return k8sCreateResource<HardwareProfileKind>(
    applyK8sAPIOptions(
      {
        model: HardwareProfileModel,
        resource,
      },
      opts,
    ),
  );
};

export const updateHardwareProfile = (
  data: HardwareProfileKind['spec'],
  existingHardwareProfile: HardwareProfileKind,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<HardwareProfileKind> => {
  const resource = assembleHardwareProfile(existingHardwareProfile.metadata.name, data, namespace);
  const hardwareProfileResource = _.merge({}, existingHardwareProfile, resource);

  return k8sUpdateResource<HardwareProfileKind>(
    applyK8sAPIOptions({ model: HardwareProfileModel, resource: hardwareProfileResource }, opts),
  );
};

export const toggleHardwareProfileEnablement = (
  name: string,
  namespace: string,
  enabled: boolean,
  opts?: K8sAPIOptions,
): Promise<HardwareProfileKind> =>
  k8sPatchResource<HardwareProfileKind>(
    applyK8sAPIOptions(
      {
        model: HardwareProfileModel,
        queryOptions: { name, ns: namespace },
        patches: [
          {
            op: 'replace',
            path: '/spec/enabled',
            value: enabled,
          },
        ],
      },
      opts,
    ),
  );

export const deleteHardwareProfile = (
  hardwareProfileName: string,
  namespace: string,
): Promise<K8sStatus> =>
  k8sDeleteResource<HardwareProfileKind, K8sStatus>({
    model: HardwareProfileModel,
    queryOptions: { name: hardwareProfileName, ns: namespace },
  });
