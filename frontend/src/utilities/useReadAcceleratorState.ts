import React from 'react';
import { AcceleratorProfileKind } from '#~/k8sTypes';
import useAcceleratorProfiles from '#~/pages/notebookController/screens/server/useAcceleratorProfiles';
import { useDashboardNamespace } from '#~/redux/selectors';
import {
  ContainerResourceAttributes,
  ContainerResources,
  Toleration,
  TolerationEffect,
  TolerationOperator,
} from '#~/types';
import { getAcceleratorProfileCount, isEnumMember } from '#~/utilities/utils';
import useFetchState, { FetchState } from '#~/utilities/useFetchState';

export type AcceleratorProfileState = {
  acceleratorProfiles: AcceleratorProfileKind[];
  count: number;
} & (
  | { acceleratorProfile?: AcceleratorProfileKind; unknownProfileDetected: false }
  | {
      acceleratorProfile: undefined;
      unknownProfileDetected: true;
    }
);

const useReadAcceleratorState = (
  resources?: ContainerResources,
  tolerations?: Toleration[],
  existingAcceleratorProfileName?: string,
  namespace?: string,
  acceleratorProfileNamespace?: string,
): FetchState<AcceleratorProfileState> => {
  const { dashboardNamespace } = useDashboardNamespace();
  const [acceleratorProfiles, loaded, loadError] = useAcceleratorProfiles(
    namespace ?? dashboardNamespace,
  );

  const fetchAcceleratorState = React.useCallback((): Promise<AcceleratorProfileState> => {
    if (!loaded || loadError) {
      return Promise.resolve({
        acceleratorProfiles: [],
        acceleratorProfile: undefined,
        count: 0,
        unknownProfileDetected: false,
      });
    }
    // Exit early if no resources = not in edit mode
    if (resources) {
      let acceleratorProfile: AcceleratorProfileKind | undefined;
      if (namespace) {
        acceleratorProfile = acceleratorProfiles.find(
          (cr) =>
            cr.metadata.name === existingAcceleratorProfileName &&
            cr.metadata.namespace === acceleratorProfileNamespace,
        );
      } else {
        acceleratorProfile = acceleratorProfiles.find(
          (cr) => cr.metadata.name === existingAcceleratorProfileName,
        );
      }

      if (acceleratorProfile) {
        return Promise.resolve({
          acceleratorProfiles,
          acceleratorProfile,
          count: getAcceleratorProfileCount(acceleratorProfile, resources),
          unknownProfileDetected: false,
        });
      }

      // check if there is accelerator usage in the container
      // this is to handle the case where the accelerator is disabled, deleted, or empty
      const possibleAcceleratorRequests = Object.entries(resources.requests ?? {})
        .filter(([key]) => !isEnumMember(key, ContainerResourceAttributes))
        .map(([key, value]) => ({ identifier: key, count: value }));

      if (possibleAcceleratorRequests.length > 0) {
        // check if they are just using the nvidia.com/gpu
        // if so, lets migrate them over to using the migrated-gpu accelerator profile if it exists
        const nvidiaAcceleratorRequests = possibleAcceleratorRequests.find(
          (request) => request.identifier === 'nvidia.com/gpu',
        );

        if (
          nvidiaAcceleratorRequests &&
          tolerations?.some(
            (toleration) =>
              toleration.key === 'nvidia.com/gpu' &&
              toleration.operator === 'Exists' &&
              toleration.effect === 'NoSchedule',
          )
        ) {
          const migratedAcceleratorProfile = acceleratorProfiles.find(
            (cr) => cr.metadata.name === 'migrated-gpu',
          );

          if (migratedAcceleratorProfile) {
            return Promise.resolve({
              acceleratorProfiles,
              acceleratorProfile: migratedAcceleratorProfile,
              count: getAcceleratorProfileCount(migratedAcceleratorProfile, resources),
              unknownProfileDetected: false,
            });
          }
          // create a fake accelerator to use
          const fakeAcceleratorProfile: AcceleratorProfileKind = {
            apiVersion: 'dashboard.opendatahub.io/v1',
            kind: 'AcceleratorProfile',
            metadata: {
              name: 'migrated-gpu',
              namespace: dashboardNamespace,
            },
            spec: {
              identifier: 'nvidia.com/gpu',
              displayName: 'NVIDIA GPU',
              enabled: true,
              tolerations: [
                {
                  key: 'nvidia.com/gpu',
                  operator: TolerationOperator.EXISTS,
                  effect: TolerationEffect.NO_SCHEDULE,
                },
              ],
            },
          };

          return Promise.resolve({
            acceleratorProfiles: [fakeAcceleratorProfile, ...acceleratorProfiles],
            acceleratorProfile: fakeAcceleratorProfile,
            count: Number(nvidiaAcceleratorRequests.count ?? 0),
            unknownProfileDetected: false,
          });
        }
        return Promise.resolve({
          acceleratorProfiles,
          acceleratorProfile: undefined,
          count: 0,
          unknownProfileDetected: true,
        });
      }
    }

    return Promise.resolve({
      acceleratorProfiles,
      acceleratorProfile: undefined,
      count: 0,
      unknownProfileDetected: false,
    });
  }, [
    loaded,
    loadError,
    resources,
    acceleratorProfiles,
    namespace,
    existingAcceleratorProfileName,
    acceleratorProfileNamespace,
    tolerations,
    dashboardNamespace,
  ]);

  return useFetchState<AcceleratorProfileState>(
    fetchAcceleratorState,
    {
      acceleratorProfiles: [],
      acceleratorProfile: undefined,
      count: 0,
      unknownProfileDetected: false,
    },
    { initialPromisePurity: true },
  );
};

export default useReadAcceleratorState;
