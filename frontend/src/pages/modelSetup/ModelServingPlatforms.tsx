import * as React from 'react';
import {
  AlertVariant,
  Button,
  EmptyState,
  EmptyStateVariant,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { QuestionCircleIcon } from '@patternfly/react-icons';
import { fetchClusterSettings, updateClusterSettings } from '~/services/clusterSettingsService';
import { ClusterSettingsType, ModelServingPlatformEnabled } from '~/types';
import { DeploymentMode } from '~/k8sTypes';
import { ProjectObjectType } from '~/concepts/design/utils';
import DetailsSection from '~/pages/projects/screens/detail/DetailsSection';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';
import ModelServingPlatformSettings from '~/pages/clusterSettings/ModelServingPlatformSettings';
import { DEFAULT_CONFIG } from '~/pages/clusterSettings/const';
import { useAppDispatch } from '~/redux/hooks';
import { addNotification } from '~/redux/actions/actions';
import { useKServeDeploymentMode } from '~/pages/modelServing/useKServeDeploymentMode';

const ModelServingPlatforms: React.FC = () => {
  const { defaultMode: defaultSingleModelDeploymentMode } = useKServeDeploymentMode();
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<Error>();
  const [saving, setSaving] = React.useState(false);
  const [clusterSettings, setClusterSettings] = React.useState(DEFAULT_CONFIG);
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
      clusterSettings.modelServingPlatformEnabled.kServe !== modelServingEnabledPlatforms.kServe ||
      clusterSettings.modelServingPlatformEnabled.modelMesh !==
        modelServingEnabledPlatforms.modelMesh,

    [clusterSettings, modelServingEnabledPlatforms],
  );

  const handleSaveButtonClicked = () => {
    const newClusterSettings: ClusterSettingsType = {
      ...clusterSettings,
      modelServingPlatformEnabled: modelServingEnabledPlatforms,
    };
    if (isSettingsChanged) {
      updateClusterSettings(newClusterSettings)
        .then((response) => {
          setSaving(false);
          if (response.success) {
            setClusterSettings(newClusterSettings);
            dispatch(
              addNotification({
                status: AlertVariant.success,
                title: 'Cluster settings changes saved',
                message: 'It may take up to 2 minutes for configuration changes to be applied.',
                timestamp: new Date(),
              }),
            );
          } else {
            throw new Error(response.error);
          }
        })
        .catch((e) => {
          setSaving(false);
          dispatch(
            addNotification({
              status: AlertVariant.danger,
              title: 'Error',
              message: e.message,
              timestamp: new Date(),
            }),
          );
        });
    }
  };

  return (
    <DetailsSection
      objectType={ProjectObjectType.modelServer}
      id={ProjectSectionID.MODEL_SERVER}
      title="Model serving platforms"
      isLoading={!loaded}
      isEmpty={false}
      loadError={loadError}
      emptyState={
        <EmptyState
          headingLevel="h1"
          icon={QuestionCircleIcon}
          titleText="No cluster settings found."
          variant={EmptyStateVariant.lg}
          data-id="empty-empty-state"
        />
      }
    >
      <Stack hasGutter>
        <StackItem>
          <ModelServingPlatformSettings
            initialValue={clusterSettings.modelServingPlatformEnabled}
            enabledPlatforms={modelServingEnabledPlatforms}
            setEnabledPlatforms={setModelServingEnabledPlatforms}
            defaultDeploymentMode={defaultDeploymentMode}
            setDefaultDeploymentMode={setDefaultDeploymentMode}
          />
        </StackItem>
        <StackItem>
          <Button
            data-testid="submit-cluster-settings"
            isDisabled={saving || !isSettingsChanged}
            variant="primary"
            isLoading={saving}
            onClick={handleSaveButtonClicked}
          >
            Save
          </Button>
        </StackItem>
      </Stack>
    </DetailsSection>
  );
};

export default ModelServingPlatforms;
