import React from 'react';
import { HardwareProfileKind, HardwareProfileVisibleIn } from '~/k8sTypes';
import { deleteAcceleratorProfile, patchModelServingSizes, patchNotebookSizes } from '~/api';
import useAcceleratorProfiles from '~/pages/notebookController/screens/server/useAcceleratorProfiles';
import { useDashboardNamespace } from '~/redux/selectors';
import { Toleration, TolerationEffect, TolerationOperator } from '~/types';
import { DEFAULT_NOTEBOOK_SIZES } from '~/pages/notebookController/const';
import { DEFAULT_MODEL_SERVER_SIZES } from '~/pages/modelServing/screens/const';
import { useWatchHardwareProfiles } from '~/utilities/useWatchHardwareProfiles';

import { useApplicationSettings } from '~/app/useApplicationSettings';
import {
  getMinMaxResourceSize,
  createAcceleratorHardwareProfiles,
  transformContainerSizeToHardwareProfile,
} from './utils';
import { MigrationAction, MigrationSourceType } from './types';

const useMigratedHardwareProfiles = (): {
  data: HardwareProfileKind[];
  loaded: boolean;
  loadError?: Error;
  refresh: () => Promise<void>;
  getMigrationAction: (name: string) => MigrationAction | undefined;
} => {
  const { dashboardNamespace } = useDashboardNamespace();
  const { dashboardConfig, refresh: refreshDashboardConfig } = useApplicationSettings();

  const [
    acceleratorProfiles,
    loadedAcceleratorProfiles,
    loadErrorAcceleratorProfiles,
    refreshAcceleratorProfiles,
  ] = useAcceleratorProfiles(dashboardNamespace);

  const [hardwareProfiles, loadedHardwareProfiles, loadErrorHardwareProfiles] =
    useWatchHardwareProfiles(dashboardNamespace);

  const [migratedHardwareProfiles, migrationMap] = React.useMemo<
    [HardwareProfileKind[] | null, Record<string, MigrationAction>]
  >(() => {
    if (!loadedAcceleratorProfiles || !loadedHardwareProfiles || !dashboardConfig) {
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

      const newHardwareProfiles = createAcceleratorHardwareProfiles(
        acceleratorProfile,
        name,
        notebookMaxSizes,
        servingMaxSizes,
        notebooksOnlyToleration,
      );

      const migrationAction: MigrationAction = {
        source: {
          type: MigrationSourceType.ACCELERATOR_PROFILE,
          resource: acceleratorProfile,
          label: acceleratorProfile.spec.displayName,
        },
        targetProfiles: newHardwareProfiles,
        deleteSourceResource: async (opts) =>
          deleteAcceleratorProfile(
            acceleratorProfile.metadata.name,
            acceleratorProfile.metadata.namespace,
            opts,
          ).then(() => {
            refreshAcceleratorProfiles();
          }),
      };

      newHardwareProfiles.forEach((profile) => {
        migrationMapBuilder[profile.metadata.name] = migrationAction;
      });

      migratedAcceleratorProfiles.push(...newHardwareProfiles);
    });

    // migrate notebook container sizes
    const migratedNotebookContainerSizes = notebookContainerSizes.map((size, index) => {
      const name = `${size.name}-notebooks-${getUUIDSuffix(size.name)}`;

      const newHardwareProfile = transformContainerSizeToHardwareProfile(
        size,
        name,
        dashboardNamespace,
        {
          spec: {
            tolerations: notebooksOnlyToleration ? [notebooksOnlyToleration] : undefined,
          },
        },
        [HardwareProfileVisibleIn.NOTEBOOKS],
      );

      const migrationAction: MigrationAction = {
        source: {
          type: MigrationSourceType.NOTEBOOK_CONTAINER_SIZE,
          resource: dashboardConfig,
          label: size.name,
        },
        targetProfiles: [newHardwareProfile],
        deleteSourceResource: async (opts) => {
          const newNotebookSizeArray = [...notebookContainerSizes];
          newNotebookSizeArray.splice(index, 1);
          return patchNotebookSizes(newNotebookSizeArray, dashboardNamespace, opts).then(() => {
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
        dashboardNamespace,
        undefined,
        [HardwareProfileVisibleIn.SERVING],
      );

      const migrationAction: MigrationAction = {
        source: {
          type: MigrationSourceType.SERVING_CONTAINER_SIZE,
          resource: dashboardConfig,
          label: size.name,
        },
        targetProfiles: [newHardwareProfile],
        deleteSourceResource: async (opts) => {
          const newServingSizeArray = [...servingContainerSizes];
          newServingSizeArray.splice(index, 1);
          return patchModelServingSizes(newServingSizeArray, dashboardNamespace, opts).then(() => {
            refreshDashboardConfig();
          });
        },
      };

      migrationMapBuilder[newHardwareProfile.metadata.name] = migrationAction;

      return newHardwareProfile;
    });

    return [
      [
        ...hardwareProfiles,
        ...migratedAcceleratorProfiles,
        ...migratedNotebookContainerSizes,
        ...migratedServingContainerSizes,
      ],
      migrationMapBuilder,
    ];
  }, [
    acceleratorProfiles,
    dashboardConfig,
    dashboardNamespace,
    hardwareProfiles,
    loadedAcceleratorProfiles,
    loadedHardwareProfiles,
    refreshAcceleratorProfiles,
    refreshDashboardConfig,
  ]);

  const getMigrationAction = (sourceName: string) => migrationMap[sourceName];

  const refresh = React.useCallback(async () => {
    await refreshAcceleratorProfiles();
    await refreshDashboardConfig();
  }, [refreshAcceleratorProfiles, refreshDashboardConfig]);

  const loaded = migratedHardwareProfiles !== null;
  const loadError = loadErrorAcceleratorProfiles || loadErrorHardwareProfiles;

  return {
    data: migratedHardwareProfiles ?? [],
    loaded,
    loadError,
    refresh,
    getMigrationAction,
  };
};

export default useMigratedHardwareProfiles;
