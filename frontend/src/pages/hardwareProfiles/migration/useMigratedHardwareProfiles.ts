import React from 'react';
import { HardwareProfileKind, HardwareProfileFeatureVisibility } from '#~/k8sTypes';
import { deleteAcceleratorProfile, patchModelServingSizes, patchNotebookSizes } from '#~/api';
import useAcceleratorProfiles from '#~/pages/notebookController/screens/server/useAcceleratorProfiles';
import { SchedulingType, Toleration, TolerationEffect, TolerationOperator } from '#~/types';
import { DEFAULT_NOTEBOOK_SIZES } from '#~/pages/notebookController/const';
import { DEFAULT_MODEL_SERVER_SIZES } from '#~/concepts/modelServing/modelServingSizesUtils';

import { useApplicationSettings } from '#~/app/useApplicationSettings';
import {
  getMinMaxResourceSize,
  createAcceleratorHardwareProfiles,
  transformContainerSizeToHardwareProfile,
} from './utils';
import { MigrationAction, MigrationSourceType } from './types';

const useMigratedHardwareProfiles = (
  namespace: string,
): {
  data: HardwareProfileKind[];
  loaded: boolean;
  loadError?: Error;
  refresh: () => Promise<void>;
  getMigrationAction: (name: string) => MigrationAction | undefined;
} => {
  const {
    dashboardConfig,
    refresh: refreshDashboardConfig,
    loadError: loadErrorDashboardConfig,
  } = useApplicationSettings();

  const [
    acceleratorProfiles,
    loadedAcceleratorProfiles,
    loadErrorAcceleratorProfiles,
    refreshAcceleratorProfiles,
  ] = useAcceleratorProfiles(namespace);

  const [migratedHardwareProfiles, migrationMap] = React.useMemo<
    [HardwareProfileKind[] | null, Record<string, MigrationAction>]
  >(() => {
    if (!loadedAcceleratorProfiles || !dashboardConfig) {
      return [null, {}];
    }

    // map of source id to migration action
    const migrationMapBuilder: Record<string, MigrationAction> = {};

    const notebooksOnlyToleration: Toleration | undefined = dashboardConfig.spec.notebookController
      ?.notebookTolerationSettings?.enabled
      ? {
          key: dashboardConfig.spec.notebookController.notebookTolerationSettings.key,
          effect: TolerationEffect.NO_SCHEDULE,
          operator: TolerationOperator.EXISTS,
        }
      : undefined;

    // Get max resource sizes for notebooks and serving
    const notebookContainerSizes = dashboardConfig.spec.notebookSizes ?? [];
    const servingContainerSizes = dashboardConfig.spec.modelServerSizes ?? [];

    const notebookMaxSizes = getMinMaxResourceSize(
      dashboardConfig.spec.notebookSizes || DEFAULT_NOTEBOOK_SIZES,
    );
    const servingMaxSizes = getMinMaxResourceSize(
      dashboardConfig.spec.modelServerSizes || DEFAULT_MODEL_SERVER_SIZES,
    );

    const getUUIDSuffix = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return Math.abs(hash).toString(36).substring(0, 5);
    };

    // migrate accelerator profiles
    const migratedAcceleratorProfiles: HardwareProfileKind[] = [];
    acceleratorProfiles.forEach((acceleratorProfile) => {
      const { name: acceleratorProfileName } = acceleratorProfile.metadata;

      // find unique name
      const name = `${acceleratorProfileName}-${getUUIDSuffix(acceleratorProfileName)}`;

      const [newNotebooksProfile, newServingProfile] = createAcceleratorHardwareProfiles(
        acceleratorProfile,
        name,
        notebookMaxSizes,
        servingMaxSizes,
        notebooksOnlyToleration,
      );

      const migrationActionBase = (
        targetProfile: HardwareProfileKind,
        dependentProfiles: HardwareProfileKind[],
      ): MigrationAction => ({
        source: {
          type: MigrationSourceType.ACCELERATOR_PROFILE,
          resource: acceleratorProfile,
          label: acceleratorProfile.spec.displayName,
        },
        targetProfile,
        dependentProfiles,
        deleteSourceResource: async (opts) =>
          deleteAcceleratorProfile(
            acceleratorProfile.metadata.name,
            acceleratorProfile.metadata.namespace,
            opts,
          ).then(() => {
            refreshAcceleratorProfiles();
          }),
      });

      migrationMapBuilder[newNotebooksProfile.metadata.name] = migrationActionBase(
        newNotebooksProfile,
        [newServingProfile],
      );
      migrationMapBuilder[newServingProfile.metadata.name] = migrationActionBase(
        newServingProfile,
        [newNotebooksProfile],
      );

      migratedAcceleratorProfiles.push(newNotebooksProfile, newServingProfile);
    });

    // migrate notebook container sizes
    const migratedNotebookContainerSizes = notebookContainerSizes.map((size, index) => {
      const name = `${size.name}-notebooks-${getUUIDSuffix(size.name)}`;

      const newHardwareProfile = transformContainerSizeToHardwareProfile(
        size,
        name,
        namespace,
        {
          spec: {
            ...(notebooksOnlyToleration && {
              scheduling: {
                type: SchedulingType.NODE,
                node: {
                  tolerations: [notebooksOnlyToleration],
                },
              },
            }),
          },
        },
        [HardwareProfileFeatureVisibility.WORKBENCH],
      );

      const migrationAction: MigrationAction = {
        source: {
          type: MigrationSourceType.NOTEBOOK_CONTAINER_SIZE,
          resource: dashboardConfig,
          label: size.name,
        },
        targetProfile: newHardwareProfile,
        dependentProfiles: [],
        deleteSourceResource: async (opts) => {
          const newNotebookSizeArray = [...notebookContainerSizes];
          newNotebookSizeArray.splice(index, 1);
          return patchNotebookSizes(newNotebookSizeArray, namespace, opts).then(() => {
            refreshDashboardConfig();
          });
        },
      };

      migrationMapBuilder[newHardwareProfile.metadata.name] = migrationAction;

      return newHardwareProfile;
    });

    // migrate serving container sizes
    const migratedServingContainerSizes = servingContainerSizes.map((size, index) => {
      const name = `${size.name}-serving-${getUUIDSuffix(size.name)}`;

      const newHardwareProfile = transformContainerSizeToHardwareProfile(
        size,
        name,
        namespace,
        undefined,
        [HardwareProfileFeatureVisibility.MODEL_SERVING],
      );

      const migrationAction: MigrationAction = {
        source: {
          type: MigrationSourceType.SERVING_CONTAINER_SIZE,
          resource: dashboardConfig,
          label: size.name,
        },
        targetProfile: newHardwareProfile,
        dependentProfiles: [],
        deleteSourceResource: async (opts) => {
          const newServingSizeArray = [...servingContainerSizes];
          newServingSizeArray.splice(index, 1);
          return patchModelServingSizes(newServingSizeArray, namespace, opts).then(() => {
            refreshDashboardConfig();
          });
        },
      };

      migrationMapBuilder[newHardwareProfile.metadata.name] = migrationAction;

      return newHardwareProfile;
    });

    return [
      [
        ...migratedAcceleratorProfiles,
        ...migratedNotebookContainerSizes,
        ...migratedServingContainerSizes,
      ],
      migrationMapBuilder,
    ];
  }, [
    acceleratorProfiles,
    dashboardConfig,
    namespace,
    loadedAcceleratorProfiles,
    refreshAcceleratorProfiles,
    refreshDashboardConfig,
  ]);

  const getMigrationAction = (sourceName: string) => migrationMap[sourceName];

  const refresh = React.useCallback(async () => {
    await refreshAcceleratorProfiles();
    await refreshDashboardConfig();
  }, [refreshAcceleratorProfiles, refreshDashboardConfig]);

  const loaded = migratedHardwareProfiles !== null;
  const loadError = loadErrorAcceleratorProfiles || loadErrorDashboardConfig;

  return {
    data: migratedHardwareProfiles ?? [],
    loaded,
    loadError,
    refresh,
    getMigrationAction,
  };
};

export default useMigratedHardwareProfiles;
