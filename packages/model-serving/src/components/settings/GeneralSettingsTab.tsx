import * as React from 'react';
import { isEqual } from 'lodash-es';
import { Button, Bullseye, PageSection, Spinner, Stack, StackItem } from '@patternfly/react-core';
import { useNotification } from '@odh-dashboard/ui-core';
import { useHostApi } from '@odh-dashboard/plugin-core/host-api';
import type {
  ClusterSettingsType,
  ModelServingPlatformEnabled,
} from '@odh-dashboard/internal/types';
import {
  fetchClusterSettings,
  updateClusterSettings,
} from '@odh-dashboard/internal/services/clusterSettingsService';
import ModelServingPlatformSettings from './ModelServingPlatformSettings';
import DeploymentStrategySettings, { DeploymentStrategy } from './DeploymentStrategySettings';

const DEFAULT_DISTRIBUTED_INFERENCING = true;

const GeneralSettingsTab: React.FC = () => {
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string>();
  const [saving, setSaving] = React.useState(false);

  const [baselineSettings, setBaselineSettings] = React.useState<ClusterSettingsType>();

  const [modelServingEnabledPlatforms, setModelServingEnabledPlatforms] =
    React.useState<ModelServingPlatformEnabled>({ kServe: true, LLMd: true });
  const [isDistributedInferencingDefault, setIsDistributedInferencingDefault] = React.useState(
    DEFAULT_DISTRIBUTED_INFERENCING,
  );
  const [defaultDeploymentStrategy, setDefaultDeploymentStrategy] = React.useState(
    DeploymentStrategy.ROLLING,
  );

  const { fetchDashboardConfig } = useHostApi();
  const notification = useNotification();

  React.useEffect(() => {
    let cancelled = false;

    Promise.all([fetchClusterSettings(), fetchDashboardConfig()])
      .then(([settings, config]) => {
        if (cancelled) {
          return;
        }

        const deploymentStrategy =
          (config.spec.modelServing?.deploymentStrategy as DeploymentStrategy) ??
          DeploymentStrategy.ROLLING;
        const distributedDefault =
          settings.isDistributedInferencingDefault ?? DEFAULT_DISTRIBUTED_INFERENCING;

        const normalizedSettings: ClusterSettingsType = {
          ...settings,
          isDistributedInferencingDefault: distributedDefault,
          defaultDeploymentStrategy: deploymentStrategy,
          globalMLflowNamespaces: settings.globalMLflowNamespaces ?? [],
        };

        setBaselineSettings(normalizedSettings);
        setModelServingEnabledPlatforms(normalizedSettings.modelServingPlatformEnabled);
        setIsDistributedInferencingDefault(distributedDefault);
        setDefaultDeploymentStrategy(deploymentStrategy);
        setLoaded(true);
        setLoadError(undefined);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'Unable to load settings.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fetchDashboardConfig]);

  const isSettingsChanged = React.useMemo(() => {
    if (!baselineSettings) {
      return false;
    }
    return (
      !isEqual(baselineSettings.modelServingPlatformEnabled, modelServingEnabledPlatforms) ||
      baselineSettings.isDistributedInferencingDefault !== isDistributedInferencingDefault ||
      baselineSettings.defaultDeploymentStrategy !== defaultDeploymentStrategy
    );
  }, [
    baselineSettings,
    modelServingEnabledPlatforms,
    isDistributedInferencingDefault,
    defaultDeploymentStrategy,
  ]);

  const handleSave = async () => {
    if (!isSettingsChanged) {
      return;
    }

    try {
      setSaving(true);

      // Re-fetch current settings so non-model-serving fields (PVC size, culler
      // timeout, telemetry, etc.) are never stale if changed elsewhere since load.
      const freshSettings = await fetchClusterSettings();

      const payload: ClusterSettingsType = {
        ...freshSettings,
        globalMLflowNamespaces: freshSettings.globalMLflowNamespaces ?? [],
        modelServingPlatformEnabled: modelServingEnabledPlatforms,
        isDistributedInferencingDefault,
        defaultDeploymentStrategy,
      };

      const response = await updateClusterSettings(payload);

      if (!response.success) {
        throw new Error(response.error);
      }

      setBaselineSettings(payload);
      notification.success('Model deployment settings saved successfully.');
    } catch (error) {
      notification.error(
        'Error saving settings',
        error instanceof Error ? error.message : 'Unknown error',
      );
    } finally {
      setSaving(false);
    }
  };

  if (loadError) {
    return (
      <PageSection hasBodyWrapper={false}>
        <p>{loadError}</p>
      </PageSection>
    );
  }

  if (!loaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  return (
    <PageSection hasBodyWrapper={false}>
      <Stack hasGutter>
        <StackItem>
          <ModelServingPlatformSettings
            initialValue={
              baselineSettings?.modelServingPlatformEnabled ?? { kServe: true, LLMd: true }
            }
            enabledPlatforms={modelServingEnabledPlatforms}
            setEnabledPlatforms={setModelServingEnabledPlatforms}
            isDistributedInferencingDefault={isDistributedInferencingDefault}
            setIsDistributedInferencingDefault={setIsDistributedInferencingDefault}
          />
        </StackItem>
        <StackItem>
          <DeploymentStrategySettings
            defaultDeploymentStrategy={defaultDeploymentStrategy}
            setDefaultDeploymentStrategy={setDefaultDeploymentStrategy}
          />
        </StackItem>
        <StackItem>
          <Button
            data-testid="save-general-settings"
            isDisabled={saving || !isSettingsChanged}
            variant="primary"
            isLoading={saving}
            onClick={handleSave}
          >
            Save changes
          </Button>
        </StackItem>
      </Stack>
    </PageSection>
  );
};

export default GeneralSettingsTab;
