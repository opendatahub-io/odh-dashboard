import React from 'react';
import { AcceleratorKind } from '~/k8sTypes';
import useAccelerators from '~/pages/notebookController/screens/server/useAccelerators';
import { useDashboardNamespace } from '~/redux/selectors';
import { ContainerResourceAttributes, ContainerResources, PodToleration } from '~/types';
import useGenericObjectState, { GenericObjectState } from '~/utilities/useGenericObjectState';

export type AcceleratorState = {
  accelerator?: AcceleratorKind;
  accelerators: AcceleratorKind[];
  initialAccelerator?: AcceleratorKind;
  useExisting: boolean;
  count: number;
  additionalOptions?: {
    useExisting?: boolean;
    useDisabled?: AcceleratorKind;
  };
};

const useAcceleratorState = (
  resources?: ContainerResources,
  tolerations?: PodToleration[],
  existingAcceleratorName?: string,
): GenericObjectState<AcceleratorState> => {
  const [acceleratorState, setData, resetData] = useGenericObjectState<AcceleratorState>({
    accelerator: undefined,
    accelerators: [],
    initialAccelerator: undefined,
    count: 0,
    useExisting: false,
  });

  const { dashboardNamespace } = useDashboardNamespace();
  const [accelerators, loaded, loadError, refresh] = useAccelerators(dashboardNamespace);

  React.useEffect(() => {
    if (loaded && !loadError) {
      setData('accelerators', accelerators);

      // Exit early if no resources = not in edit mode
      if (!resources) {
        return;
      }

      const accelerator = accelerators.find(
        (accelerator) => accelerator.metadata.name === existingAcceleratorName,
      );

      if (accelerator) {
        setData('accelerator', accelerator);
        setData('initialAccelerator', accelerator);
        setData('count', Number(resources.requests?.[accelerator.spec.identifier] ?? 0));
        if (!accelerator.spec.enabled) {
          setData('additionalOptions', { useDisabled: accelerator });
        }
      } else {
        // check if there is accelerator usage in the container
        // this is to handle the case where the accelerator is disabled, deleted, or empty
        const containerResourceAttributes = Object.values(ContainerResourceAttributes) as string[];
        const possibleAcceleratorRequests = Object.entries(resources.requests ?? {})
          .filter(([key]) => !containerResourceAttributes.includes(key))
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
            const migratedAccelerator = accelerators.find(
              (accelerator) => accelerator.metadata.name === 'migrated-gpu',
            );

            if (migratedAccelerator) {
              setData('accelerator', migratedAccelerator);
              setData('initialAccelerator', migratedAccelerator);
              setData('count', Number(nvidiaAcceleratorRequests.count ?? 0));
              if (!migratedAccelerator.spec.enabled) {
                setData('additionalOptions', { useDisabled: accelerator });
              }
            } else {
              // create a fake accelerator to use
              const fakeAccelerator: AcceleratorKind = {
                apiVersion: 'dashboard.opendatahub.io/v1alpha',
                kind: 'AcceleratorProfile',
                metadata: {
                  name: 'migrated-gpu',
                },
                spec: {
                  identifier: 'nvidia.com/gpu',
                  displayName: 'Nvidia GPU',
                  enabled: true,
                  tolerations: [
                    {
                      key: 'nvidia.com/gpu',
                      operator: 'Exists',
                      effect: 'NoSchedule',
                    },
                  ],
                },
              };

              setData('accelerator', fakeAccelerator);
              setData('accelerators', [fakeAccelerator, ...accelerators]);
              setData('initialAccelerator', fakeAccelerator);
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
  }, [accelerators, loaded, loadError, resources, tolerations, existingAcceleratorName, setData]);

  const resetDataAndRefresh = React.useCallback(() => {
    resetData();
    refresh();
  }, [refresh, resetData]);

  return [acceleratorState, setData, resetDataAndRefresh];
};

export default useAcceleratorState;
