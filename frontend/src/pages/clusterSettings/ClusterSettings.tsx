import * as React from 'react';
import * as _ from 'lodash-es';
import { AlertVariant, Button, Stack, StackItem } from '@patternfly/react-core';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import { useAppContext } from '#~/app/AppContext';
import { fetchClusterSettings, updateClusterSettings } from '#~/services/clusterSettingsService';
import {
  ClusterSettingsType,
  ModelServingPlatformEnabled,
  NotebookTolerationFormSettings,
} from '#~/types';
import { DeploymentMode } from '#~/k8sTypes';
import { addNotification } from '#~/redux/actions/actions';
import { useCheckJupyterEnabled } from '#~/utilities/notebookControllerUtils';
import { useAppDispatch } from '#~/redux/hooks';
import PVCSizeSettings from '#~/pages/clusterSettings/PVCSizeSettings';
import CullerSettings from '#~/pages/clusterSettings/CullerSettings';
import TelemetrySettings from '#~/pages/clusterSettings/TelemetrySettings';
import TolerationSettings from '#~/pages/clusterSettings/TolerationSettings';
import ModelServingPlatformSettings from '#~/pages/clusterSettings/ModelServingPlatformSettings';
import { useKServeDeploymentMode } from '#~/pages/modelServing/useKServeDeploymentMode';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import TitleWithIcon from '#~/concepts/design/TitleWithIcon';
import { ProjectObjectType } from '#~/concepts/design/utils';
import { patchDefaultDeploymentMode } from '#~/api';
import {
  DEFAULT_CONFIG,
  DEFAULT_PVC_SIZE,
  DEFAULT_CULLER_TIMEOUT,
  MIN_CULLER_TIMEOUT,
  DEFAULT_TOLERATION_VALUE,
} from './const';
import useDefaultDsc from './useDefaultDsc';

const ClusterSettings: React.FC = () => {
  const { defaultMode } = useKServeDeploymentMode();
  const [defaultSingleModelDeploymentMode, setDefaultSingleModelDeploymentMode] =
    React.useState<DeploymentMode>(defaultMode);
  const [dsc, dscLoaded, dscError, refreshDsc] = useDefaultDsc();
  const [loaded, setLoaded] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [loadError, setLoadError] = React.useState<Error>();
  const [clusterSettings, setClusterSettings] = React.useState(DEFAULT_CONFIG);
  const [pvcSize, setPvcSize] = React.useState<number>(DEFAULT_PVC_SIZE);
  const [userTrackingEnabled, setUserTrackingEnabled] = React.useState(false);
  const [cullerTimeout, setCullerTimeout] = React.useState(DEFAULT_CULLER_TIMEOUT);
  const { dashboardConfig } = useAppContext();
  const modelServingEnabled = useIsAreaAvailable(SupportedArea.MODEL_SERVING).status;
  const isJupyterEnabled = useCheckJupyterEnabled();
  const isHardwareProfileEnabled = useIsAreaAvailable(SupportedArea.HARDWARE_PROFILES).status;
  const [notebookTolerationSettings, setNotebookTolerationSettings] =
    React.useState<NotebookTolerationFormSettings>({
      enabled: false,
      key: isJupyterEnabled ? DEFAULT_TOLERATION_VALUE : '',
    });
  const [modelServingEnabledPlatforms, setModelServingEnabledPlatforms] =
    React.useState<ModelServingPlatformEnabled>(clusterSettings.modelServingPlatformEnabled);
  const [defaultDeploymentMode, setDefaultDeploymentMode] = React.useState<DeploymentMode>(
    defaultSingleModelDeploymentMode,
  );

  const dispatch = useAppDispatch();

  React.useEffect(() => {
    fetchClusterSettings()
      .then((fetchedClusterSettings: ClusterSettingsType) => {
        setClusterSettings(fetchedClusterSettings);
        setModelServingEnabledPlatforms(fetchedClusterSettings.modelServingPlatformEnabled);
        setLoaded(true);
        setLoadError(undefined);
      })
      .catch((e) => {
        setLoadError(e);
      });
  }, []);

  const isSettingsChanged = React.useMemo(
    () =>
      !_.isEqual(clusterSettings, {
        pvcSize,
        cullerTimeout,
        userTrackingEnabled,
        notebookTolerationSettings: {
          enabled: notebookTolerationSettings.enabled,
          key: notebookTolerationSettings.key,
        },
        modelServingPlatformEnabled: modelServingEnabledPlatforms,
      }) || defaultDeploymentMode !== defaultSingleModelDeploymentMode,
    [
      clusterSettings,
      pvcSize,
      cullerTimeout,
      userTrackingEnabled,
      notebookTolerationSettings.enabled,
      notebookTolerationSettings.key,
      modelServingEnabledPlatforms,
      defaultDeploymentMode,
      defaultSingleModelDeploymentMode,
    ],
  );

  const handleSaveButtonClicked = () => {
    const newClusterSettings: ClusterSettingsType = {
      pvcSize,
      cullerTimeout,
      userTrackingEnabled,
      notebookTolerationSettings: {
        enabled: notebookTolerationSettings.enabled,
        key: notebookTolerationSettings.key,
      },
      modelServingPlatformEnabled: modelServingEnabledPlatforms,
    };

    const clusterSettingsUnchanged = _.isEqual(clusterSettings, newClusterSettings);
    const defaultDeploymentModeUnchanged =
      defaultDeploymentMode === defaultSingleModelDeploymentMode;

    if (clusterSettingsUnchanged && defaultDeploymentModeUnchanged) {
      return;
    }

    if (
      Number(newClusterSettings.pvcSize) === 0 ||
      Number(newClusterSettings.cullerTimeout) < MIN_CULLER_TIMEOUT
    ) {
      return;
    }

    setSaving(true);

    const clusterSettingsPromise = clusterSettingsUnchanged
      ? Promise.resolve()
      : updateClusterSettings(newClusterSettings).then((response) => {
          if (!response.success) {
            throw new Error(response.error);
          }
          setClusterSettings(newClusterSettings);
        });

    const defaultDeploymentModePromise = defaultDeploymentModeUnchanged
      ? Promise.resolve()
      : dsc &&
        patchDefaultDeploymentMode(defaultDeploymentMode, dsc.metadata.name).then(() => {
          setDefaultSingleModelDeploymentMode(defaultDeploymentMode);
          refreshDsc();
        });

    Promise.all([clusterSettingsPromise, defaultDeploymentModePromise])
      .then(() => {
        dispatch(
          addNotification({
            status: AlertVariant.success,
            title: 'Cluster settings changes saved',
            message: 'It may take up to 2 minutes for configuration changes to be applied.',
            timestamp: new Date(),
          }),
        );
      })
      .catch((error) => {
        dispatch(
          addNotification({
            status: AlertVariant.danger,
            title: 'Error',
            message: error.message,
            timestamp: new Date(),
          }),
        );
      })
      .finally(() => {
        setSaving(false);
      });
  };

  return (
    <ApplicationsPage
      title={
        <TitleWithIcon title="Cluster settings" objectType={ProjectObjectType.clusterSettings} />
      }
      description="Manage global settings for all users."
      loaded={loaded && dscLoaded}
      empty={false}
      loadError={loadError || dscError}
      errorMessage="Unable to load cluster settings."
      emptyMessage="No cluster settings found."
      provideChildrenPadding
    >
      <Stack hasGutter>
        {modelServingEnabled && (
          <StackItem>
            <ModelServingPlatformSettings
              initialValue={clusterSettings.modelServingPlatformEnabled}
              enabledPlatforms={modelServingEnabledPlatforms}
              setEnabledPlatforms={setModelServingEnabledPlatforms}
              defaultDeploymentMode={defaultDeploymentMode}
              setDefaultDeploymentMode={setDefaultDeploymentMode}
            />
          </StackItem>
        )}
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
        {isJupyterEnabled && !isHardwareProfileEnabled && (
          <StackItem>
            <TolerationSettings
              initialValue={clusterSettings.notebookTolerationSettings}
              tolerationSettings={notebookTolerationSettings}
              setTolerationSettings={setNotebookTolerationSettings}
            />
          </StackItem>
        )}
        <StackItem>
          <Button
            data-testid="submit-cluster-settings"
            isDisabled={
              saving ||
              !pvcSize ||
              cullerTimeout < MIN_CULLER_TIMEOUT ||
              !isSettingsChanged ||
              !!notebookTolerationSettings.error
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
