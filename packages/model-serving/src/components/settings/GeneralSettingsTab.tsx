import * as React from 'react';
import { isEqual } from 'lodash-es';
import { Button, Bullseye, PageSection, Spinner, Stack, StackItem } from '@patternfly/react-core';
import { TrackingOutcome, useNotification } from '@odh-dashboard/ui-core';
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
import {
  fireDeploymentStrategyChanged,
  firePlatformSettingChanged,
} from '../../shared/tracking/generalSettingsTracking';

const DEFAULT_DISTRIBUTED_INFERENCING = true;
const DEFAULT_ENABLED_PLATFORMS: ModelServingPlatformEnabled = { kServe: true, LLMd: true };

const isDeploymentStrategy = (value: string | undefined): value is DeploymentStrategy =>
  Object.values<string>(DeploymentStrategy).includes(value ?? '');

const GeneralSettingsTab: React.FC = () => {
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string>();
  const [saving, setSaving] = React.useState(false);

  const [baselineSettings, setBaselineSettings] = React.useState<ClusterSettingsType>();

  const [modelServingEnabledPlatforms, setModelServingEnabledPlatforms] =
    React.useState<ModelServingPlatformEnabled>(DEFAULT_ENABLED_PLATFORMS);
  const [isDistributedInferencingDefault, setIsDistributedInferencingDefault] = React.useState(
    DEFAULT_DISTRIBUTED_INFERENCING,
  );
  const [defaultDeploymentStrategy, setDefaultDeploymentStrategy] = React.useState(
    DeploymentStrategy.ROLLING,
  );

  const notification = useNotification();

  React.useEffect(() => {
    let cancelled = false;

    fetchClusterSettings()
      .then((settings) => {
        if (cancelled) {
          return;
        }

        const deploymentStrategy = isDeploymentStrategy(settings.defaultDeploymentStrategy)
          ? settings.defaultDeploymentStrategy
          : DeploymentStrategy.ROLLING;
        const distributedDefault =
          settings.isDistributedInferencingDefault ?? DEFAULT_DISTRIBUTED_INFERENCING;
        const enabledPlatforms = settings.modelServingPlatformEnabled;

        const normalizedSettings: ClusterSettingsType = {
          ...settings,
          modelServingPlatformEnabled: enabledPlatforms,
          isDistributedInferencingDefault: distributedDefault,
          defaultDeploymentStrategy: deploymentStrategy,
          globalMLflowNamespaces: settings.globalMLflowNamespaces ?? [],
        };

        setBaselineSettings(normalizedSettings);
        setModelServingEnabledPlatforms(enabledPlatforms);
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
  }, []);

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

      // Fire a tracking event per setting that actually changed, comparing the
      // saved payload against the pre-save baseline. No PII — booleans/enums only.
      const previous = baselineSettings;
      if (
        previous?.modelServingPlatformEnabled.kServe !== payload.modelServingPlatformEnabled.kServe
      ) {
        firePlatformSettingChanged({
          outcome: TrackingOutcome.submit,
          success: true,
          setting: 'model_serving_enabled',
          enabled: payload.modelServingPlatformEnabled.kServe,
        });
      }
      if (previous?.modelServingPlatformEnabled.LLMd !== payload.modelServingPlatformEnabled.LLMd) {
        firePlatformSettingChanged({
          outcome: TrackingOutcome.submit,
          success: true,
          setting: 'llmd_enabled',
          enabled: payload.modelServingPlatformEnabled.LLMd,
        });
      }
      if (previous?.isDistributedInferencingDefault !== payload.isDistributedInferencingDefault) {
        firePlatformSettingChanged({
          outcome: TrackingOutcome.submit,
          success: true,
          setting: 'llmd_default_for_generative',
          enabled: payload.isDistributedInferencingDefault ?? false,
        });
      }
      if (previous?.defaultDeploymentStrategy !== payload.defaultDeploymentStrategy) {
        fireDeploymentStrategyChanged({
          outcome: TrackingOutcome.submit,
          success: true,
          strategy: defaultDeploymentStrategy,
        });
      }

      setBaselineSettings(payload);
      notification.success(
        'Model deployment settings saved successfully.',
        'It can take up to 2 minutes for configuration changes to be applied.',
      );
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
