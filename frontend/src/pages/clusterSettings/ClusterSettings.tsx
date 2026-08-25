import * as React from 'react';
import * as _ from 'lodash-es';
import { AlertVariant, Button, Stack, StackItem } from '@patternfly/react-core';
import TitleWithIcon from '@odh-dashboard/ui-core/design/TitleWithIcon';
import { ApplicationsPage, TrackingOutcome } from '@odh-dashboard/ui-core';
import { useAppContext } from '#~/app/AppContext';
import { fireFormTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import { fetchClusterSettings, updateClusterSettings } from '#~/services/clusterSettingsService';
import { ClusterSettingsType, ModelServingPlatformEnabled } from '#~/types';
import { addNotification } from '#~/redux/actions/actions';
import { useAppDispatch } from '#~/redux/hooks';
import PVCSizeSettings from '#~/pages/clusterSettings/PVCSizeSettings';
import CullerSettings from '#~/pages/clusterSettings/CullerSettings';
import TelemetrySettings from '#~/pages/clusterSettings/TelemetrySettings';
import GlobalProjectSettings from '#~/pages/clusterSettings/GlobalProjectSettings';
import { ProjectObjectType } from '#~/concepts/design/utils';
import {
  DEFAULT_CONFIG,
  DEFAULT_PVC_SIZE,
  DEFAULT_CULLER_TIMEOUT,
  MIN_CULLER_TIMEOUT,
} from './const';

const DEFAULT_DISTRIBUTED_INFERENCING = DEFAULT_CONFIG.isDistributedInferencingDefault ?? true;

enum GlobalProjectState {
  added = 'Added',
  changed = 'Changed',
  unchanged = 'Unchanged',
  removed = 'Removed',
}

const ClusterSettings: React.FC = () => {
  const [loaded, setLoaded] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [loadError, setLoadError] = React.useState<Error>();
  const [clusterSettings, setClusterSettings] = React.useState(DEFAULT_CONFIG);
  const [pvcSize, setPvcSize] = React.useState<number>(DEFAULT_PVC_SIZE);
  const [userTrackingEnabled, setUserTrackingEnabled] = React.useState(false);
  const [cullerTimeout, setCullerTimeout] = React.useState(DEFAULT_CULLER_TIMEOUT);
  const [isDistributedInferencingDefault, setisDistributedInferencingDefault] = React.useState(
    DEFAULT_DISTRIBUTED_INFERENCING,
  );
  const [defaultDeploymentStrategy, setDefaultDeploymentStrategy] = React.useState('rolling');
  // "Global project" UI maps to globalMLflowNamespaces in the CR (spec.globalMLflowNamespaces).
  // The feature flag is globalProjectPrompts; the data is MLflow-specific.
  const [globalMLflowNamespace, setGlobalMLflowNamespace] = React.useState('');
  const { dashboardConfig } = useAppContext();
  const globalProjectPromptsEnabled = dashboardConfig.spec.dashboardConfig.globalProjectPrompts;

  const [modelServingEnabledPlatforms, setModelServingEnabledPlatforms] =
    React.useState<ModelServingPlatformEnabled>(clusterSettings.modelServingPlatformEnabled);

  const dispatch = useAppDispatch();

  React.useEffect(() => {
    fetchClusterSettings()
      .then((fetchedClusterSettings: ClusterSettingsType) => {
        // Get modelServing settings from dashboard config
        const modelServingConfig = dashboardConfig.spec.modelServing || {};
        const deploymentStrategy = modelServingConfig.deploymentStrategy ?? 'rolling';

        // API may omit optional fields (JSON drops undefined). Fill defaults so the
        // baseline matches form state and Save stays disabled until the user edits.
        const distributedInferencingDefault =
          fetchedClusterSettings.isDistributedInferencingDefault ?? DEFAULT_DISTRIBUTED_INFERENCING;
        const normalizedSettings: ClusterSettingsType = {
          ...fetchedClusterSettings,
          isDistributedInferencingDefault: distributedInferencingDefault,
          defaultDeploymentStrategy: deploymentStrategy,
          globalMLflowNamespaces: fetchedClusterSettings.globalMLflowNamespaces ?? [],
        };
        setClusterSettings(normalizedSettings);
        setPvcSize(normalizedSettings.pvcSize);
        setCullerTimeout(normalizedSettings.cullerTimeout);
        setUserTrackingEnabled(normalizedSettings.userTrackingEnabled);
        setModelServingEnabledPlatforms(normalizedSettings.modelServingPlatformEnabled);
        setisDistributedInferencingDefault(distributedInferencingDefault);
        setDefaultDeploymentStrategy(deploymentStrategy);
        setGlobalMLflowNamespace(normalizedSettings.globalMLflowNamespaces?.[0] ?? '');
        setLoaded(true);
        setLoadError(undefined);
      })
      .catch((e) => {
        setLoadError(e);
      });
  }, [dashboardConfig]);

  const globalMLflowNamespaces = React.useMemo(
    () => (globalMLflowNamespace ? [globalMLflowNamespace] : []),
    [globalMLflowNamespace],
  );

  const isSettingsChanged = React.useMemo(
    () =>
      !_.isEqual(clusterSettings, {
        pvcSize,
        cullerTimeout,
        userTrackingEnabled,
        modelServingPlatformEnabled: modelServingEnabledPlatforms,
        isDistributedInferencingDefault,
        defaultDeploymentStrategy,
        globalMLflowNamespaces,
      }),
    [
      clusterSettings,
      pvcSize,
      cullerTimeout,
      userTrackingEnabled,
      modelServingEnabledPlatforms,
      isDistributedInferencingDefault,
      defaultDeploymentStrategy,
      globalMLflowNamespaces,
    ],
  );

  const handleSaveButtonClicked = async () => {
    const newClusterSettings: ClusterSettingsType = {
      pvcSize,
      cullerTimeout,
      userTrackingEnabled,
      modelServingPlatformEnabled: modelServingEnabledPlatforms,
      isDistributedInferencingDefault,
      defaultDeploymentStrategy,
      globalMLflowNamespaces,
    };

    if (!isSettingsChanged) {
      return;
    }

    if (
      Number(newClusterSettings.pvcSize) === 0 ||
      Number(newClusterSettings.cullerTimeout) < MIN_CULLER_TIMEOUT
    ) {
      return;
    }

    const currentGlobalNamespace = clusterSettings.globalMLflowNamespaces?.[0];
    const newGlobalNamespace = newClusterSettings.globalMLflowNamespaces?.[0];
    let globalProjectName: GlobalProjectState;
    if (currentGlobalNamespace === newGlobalNamespace)
      globalProjectName = GlobalProjectState.unchanged;
    else if (!currentGlobalNamespace) globalProjectName = GlobalProjectState.added;
    else if (!newGlobalNamespace) globalProjectName = GlobalProjectState.removed;
    else globalProjectName = GlobalProjectState.changed;

    try {
      setSaving(true);
      const response = await updateClusterSettings(newClusterSettings);

      if (!response.success) {
        throw new Error(response.error);
      }

      setClusterSettings(newClusterSettings);

      if (globalProjectName !== GlobalProjectState.unchanged)
        fireFormTrackingEvent('Cluster Settings Global Project Selected', {
          outcome: TrackingOutcome.submit,
          success: true,
          globalProjectName,
        });

      dispatch(
        addNotification({
          status: AlertVariant.success,
          title: 'Cluster settings changes saved',
          message: 'It can take up to 2 minutes for configuration changes to be applied.',
          timestamp: new Date(),
        }),
      );
    } catch (error) {
      if (globalProjectName !== GlobalProjectState.unchanged) {
        fireFormTrackingEvent('Cluster Settings Global Project Selected', {
          outcome: TrackingOutcome.submit,
          success: false,
          globalProjectName,
          error: error instanceof Error ? error.message : 'unknown error',
        });
      }

      dispatch(
        addNotification({
          status: AlertVariant.danger,
          title: 'Error',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
        }),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ApplicationsPage
      title={
        <TitleWithIcon title="General settings" objectType={ProjectObjectType.clusterSettings} />
      }
      description="Manage global settings for all users."
      loaded={loaded}
      empty={false}
      loadError={loadError}
      errorMessage="Unable to load cluster settings."
      emptyMessage="No cluster settings found."
      provideChildrenPadding
    >
      <Stack hasGutter>
        <StackItem>
          <PVCSizeSettings
            initialValue={clusterSettings.pvcSize}
            pvcSize={pvcSize}
            setPvcSize={setPvcSize}
          />
        </StackItem>
        <StackItem>
          <CullerSettings
            initialValue={clusterSettings.cullerTimeout}
            cullerTimeout={cullerTimeout}
            setCullerTimeout={setCullerTimeout}
          />
        </StackItem>
        {!dashboardConfig.spec.dashboardConfig.disableTracking && (
          <StackItem>
            <TelemetrySettings
              initialValue={clusterSettings.userTrackingEnabled}
              enabled={userTrackingEnabled}
              setEnabled={setUserTrackingEnabled}
            />
          </StackItem>
        )}
        {globalProjectPromptsEnabled && (
          <StackItem>
            <GlobalProjectSettings
              selectedNamespace={globalMLflowNamespace}
              setSelectedNamespace={setGlobalMLflowNamespace}
            />
          </StackItem>
        )}
        <StackItem>
          <Button
            data-testid="submit-cluster-settings"
            isDisabled={
              saving || !pvcSize || cullerTimeout < MIN_CULLER_TIMEOUT || !isSettingsChanged
            }
            variant="primary"
            isLoading={saving}
            onClick={handleSaveButtonClicked}
          >
            Save changes
          </Button>
        </StackItem>
      </Stack>
    </ApplicationsPage>
  );
};

export default ClusterSettings;
