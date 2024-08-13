import React from 'react';
import { AcceleratorProfileKind } from '~/k8sTypes';
import useAcceleratorProfiles from '~/pages/notebookController/screens/server/useAcceleratorProfiles';
import { useDashboardNamespace } from '~/redux/selectors';
import {
  ContainerResourceAttributes,
  ContainerResources,
  Toleration,
  TolerationEffect,
  TolerationOperator,
} from '~/types';
import useGenericObjectState, { GenericObjectState } from '~/utilities/useGenericObjectState';
import { getAcceleratorProfileCount, isEnumMember } from '~/utilities/utils';

export type AcceleratorProfileState = {
  acceleratorProfile?: AcceleratorProfileKind;
  acceleratorProfiles: AcceleratorProfileKind[];
  initialAcceleratorProfile?: AcceleratorProfileKind;
  useExisting: boolean;
  count: number;
  additionalOptions?: {
    useExisting?: boolean;
    useDisabled?: AcceleratorProfileKind;
  };
};

const useAcceleratorProfileState = (
  resources?: ContainerResources,
  tolerations?: Toleration[],
  existingAcceleratorProfileName?: string,
): GenericObjectState<AcceleratorProfileState> => {
  const [acceleratorProfileState, setData, resetData] =
    useGenericObjectState<AcceleratorProfileState>({
      acceleratorProfile: undefined,
      acceleratorProfiles: [],
      initialAcceleratorProfile: undefined,
      count: 0,
      useExisting: false,
    });

  const { dashboardNamespace } = useDashboardNamespace();
  const [acceleratorProfiles, loaded, loadError, refresh] =
    useAcceleratorProfiles(dashboardNamespace);

  React.useEffect(() => {
    if (loaded && !loadError) {
      setData('acceleratorProfiles', acceleratorProfiles);

      // Exit early if no resources = not in edit mode
      if (!resources) {
        return;
      }

      const acceleratorProfile = acceleratorProfiles.find(
        (cr) => cr.metadata.name === existingAcceleratorProfileName,
      );

      if (acceleratorProfile) {
        setData('acceleratorProfile', acceleratorProfile);
        setData('initialAcceleratorProfile', acceleratorProfile);
        setData('count', getAcceleratorProfileCount(acceleratorProfile, resources));
        if (!acceleratorProfile.spec.enabled) {
          setData('additionalOptions', { useDisabled: acceleratorProfile });
        }
      } else {
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
              setData('acceleratorProfile', migratedAcceleratorProfile);
              setData('initialAcceleratorProfile', migratedAcceleratorProfile);
              setData('count', Number(nvidiaAcceleratorRequests.count ?? 0));
              if (!migratedAcceleratorProfile.spec.enabled) {
                setData('additionalOptions', { useDisabled: acceleratorProfile });
              }
            } else {
              // create a fake accelerator to use
              const fakeAcceleratorProfile: AcceleratorProfileKind = {
                apiVersion: 'dashboard.opendatahub.io/v1',
                kind: 'AcceleratorProfile',
                metadata: {
                  name: 'migrated-gpu',
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

              setData('acceleratorProfile', fakeAcceleratorProfile);
              setData('acceleratorProfiles', [fakeAcceleratorProfile, ...acceleratorProfiles]);
              setData('initialAcceleratorProfile', fakeAcceleratorProfile);
              setData('count', Number(nvidiaAcceleratorRequests.count ?? 0));
            }
          } else {
            // fallback to using the existing accelerator
            setData('useExisting', true);
            setData('additionalOptions', { useExisting: true });
          }
        }
      }
    }
  }, [
    acceleratorProfiles,
    loaded,
    loadError,
    resources,
    tolerations,
    existingAcceleratorProfileName,
    setData,
  ]);

  const resetDataAndRefresh = React.useCallback(() => {
    resetData();
    refresh();
  }, [refresh, resetData]);

  return [acceleratorProfileState, setData, resetDataAndRefresh];
};

export default useAcceleratorProfileState;
