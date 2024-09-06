import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ActionList,
  ActionListItem,
  Alert,
  AlertActionLink,
  Button,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import {
  assembleSecret,
  createNotebook,
  createSecret,
  K8sStatusError,
  mergePatchUpdateNotebook,
  updateNotebook,
} from '~/api';
import {
  DataConnectionData,
  EnvVariable,
  StartNotebookData,
  StorageData,
} from '~/pages/projects/types';
import { useUser } from '~/redux/selectors';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { AppContext } from '~/app/AppContext';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';
import { fireFormTrackingEvent } from '~/concepts/analyticsTracking/segmentIOUtils';
import {
  FormTrackingEventProperties,
  TrackingOutcome,
} from '~/concepts/analyticsTracking/trackingProperties';
import {
  createConfigMapsAndSecretsForNotebook,
  createPvcDataForNotebook,
  replaceRootVolumesForNotebook,
  updateConfigMapsAndSecretsForNotebook,
} from './service';
import { checkRequiredFieldsForNotebookStart } from './spawnerUtils';
import { getNotebookDataConnection } from './dataConnection/useNotebookDataConnection';

type SpawnerFooterProps = {
  startNotebookData: StartNotebookData;
  storageData: StorageData;
  envVariables: EnvVariable[];
  dataConnection: DataConnectionData;
  canEnablePipelines: boolean;
};

const SpawnerFooter: React.FC<SpawnerFooterProps> = ({
  startNotebookData,
  storageData,
  envVariables,
  dataConnection,
  canEnablePipelines,
}) => {
  const [error, setError] = React.useState<K8sStatusError>();

  const {
    dashboardConfig: {
      spec: { notebookController },
    },
  } = React.useContext(AppContext);
  const tolerationSettings = notebookController?.notebookTolerationSettings;
  const {
    notebooks: { data },
    dataConnections: { data: existingDataConnections },
    refreshAllProjectData,
  } = React.useContext(ProjectDetailsContext);
  const { notebookName } = useParams();
  const notebookState = data.find(
    (currentNotebookState) => currentNotebookState.notebook.metadata.name === notebookName,
  );
  const editNotebook = notebookState?.notebook;
  const { projectName } = startNotebookData;
  const navigate = useNavigate();
  const [createInProgress, setCreateInProgress] = React.useState(false);
  const isButtonDisabled =
    createInProgress ||
    !checkRequiredFieldsForNotebookStart(
      startNotebookData,
      storageData,
      envVariables,
      dataConnection,
    );
  const { username } = useUser();
  const existingNotebookDataConnection = getNotebookDataConnection(
    editNotebook,
    existingDataConnections,
  );
  const afterStart = (name: string, type: 'created' | 'updated') => {
    const { selectedAcceleratorProfile, notebookSize, image } = startNotebookData;
    const tep: FormTrackingEventProperties = {
      acceleratorCount: selectedAcceleratorProfile.useExistingSettings
        ? undefined
        : selectedAcceleratorProfile.count,
      accelerator: selectedAcceleratorProfile.profile
        ? `${selectedAcceleratorProfile.profile.spec.displayName} (${selectedAcceleratorProfile.profile.metadata.name}): ${selectedAcceleratorProfile.profile.spec.identifier}`
        : selectedAcceleratorProfile.useExistingSettings
        ? 'Unknown'
        : 'None',
      lastSelectedSize: notebookSize.name,
      lastSelectedImage: image.imageVersion?.from
        ? `${image.imageVersion.from.name}`
        : `${image.imageStream?.metadata.name || 'unknown image'} - ${
            image.imageVersion?.name || 'unknown version'
          }`,
      imageName: image.imageStream?.metadata.name,
      projectName,
      notebookName: name,
      storageType: storageData.storageType,
      storageDataSize: storageData.creating.size,
      dataConnectionType: dataConnection.creating?.type?.toString(),
      dataConnectionCategory: dataConnection.creating?.values?.category?.toString(),
      dataConnectionEnabled: dataConnection.enabled,
      outcome: TrackingOutcome.submit,
      success: true,
    };
    fireFormTrackingEvent(`Workbench ${type === 'created' ? 'Created' : 'Updated'}`, tep);
    refreshAllProjectData();
    navigate(`/projects/${projectName}?section=${ProjectSectionID.WORKBENCHES}`);
  };
  const handleError = (e: K8sStatusError) => {
    fireFormTrackingEvent('Workbench Created', {
      outcome: TrackingOutcome.submit,
      success: false,
      error: e.message,
    });
    setError(e);
    setCreateInProgress(false);
  };
  const handleStart = () => {
    setError(undefined);
    setCreateInProgress(true);
  };

  const updateNotebookPromise = async (dryRun: boolean) => {
    if (!editNotebook) {
      return;
    }

    const pvcDetails = await replaceRootVolumesForNotebook(
      projectName,
      editNotebook,
      storageData,
      dryRun,
    ).catch(handleError);

    const envFrom = await updateConfigMapsAndSecretsForNotebook(
      projectName,
      editNotebook,
      envVariables,
      dataConnection,
      existingNotebookDataConnection,
      dryRun,
    ).catch(handleError);

    if (!pvcDetails || !envFrom) {
      return;
    }

    const annotations = { ...editNotebook.metadata.annotations };
    if (envFrom.length > 0) {
      annotations['notebooks.opendatahub.io/notebook-restart'] = 'true';
    }

    const { volumes, volumeMounts } = pvcDetails;
    const newStartNotebookData: StartNotebookData = {
      ...startNotebookData,
      volumes,
      volumeMounts,
      envFrom,
      tolerationSettings,
    };
    if (dryRun) {
      return updateNotebook(editNotebook, newStartNotebookData, username, { dryRun });
    }
    return mergePatchUpdateNotebook(newStartNotebookData, username);
  };

  const onUpdateNotebook = async () => {
    if (dataConnection.type === 'creating') {
      const dataAsRecord = dataConnection.creating?.values?.data.reduce<Record<string, string>>(
        (acc, { key, value }) => ({ ...acc, [key]: value }),
        {},
      );
      if (dataAsRecord) {
        const isSuccess = await createSecret(assembleSecret(projectName, dataAsRecord, 'aws'), {
          dryRun: true,
        })
          .then(() => true)
          .catch((e) => {
            handleError(e);
            return false;
          });
        if (!isSuccess) {
          return;
        }
      }
    }

    handleStart();
    updateNotebookPromise(true)
      .then(() =>
        updateNotebookPromise(false)
          .then((notebook) => {
            if (notebook) {
              afterStart(notebook.metadata.name, 'updated');
            }
          })
          .catch(handleError),
      )
      .catch(handleError);
  };

  const onCreateNotebook = async () => {
    if (dataConnection.type === 'creating') {
      const dataAsRecord = dataConnection.creating?.values?.data.reduce<Record<string, string>>(
        (acc, { key, value }) => ({ ...acc, [key]: value }),
        {},
      );
      if (dataAsRecord) {
        const isSuccess = await createSecret(assembleSecret(projectName, dataAsRecord, 'aws'), {
          dryRun: true,
        })
          .then(() => true)
          .catch((e) => {
            handleError(e);
            return false;
          });
        if (!isSuccess) {
          return;
        }
      }
    }

    handleStart();

    const newDataConnection =
      dataConnection.enabled && dataConnection.type === 'creating' && dataConnection.creating
        ? [dataConnection.creating]
        : [];
    const existingDataConnection =
      dataConnection.enabled && dataConnection.type === 'existing' && dataConnection.existing
        ? [dataConnection.existing]
        : [];

    const pvcDetails = await createPvcDataForNotebook(projectName, storageData).catch(handleError);
    const envFrom = await createConfigMapsAndSecretsForNotebook(projectName, [
      ...envVariables,
      ...newDataConnection,
    ]).catch(handleError);

    if (!pvcDetails || !envFrom) {
      // Error happened, let the error code handle it
      return;
    }

    const { volumes, volumeMounts } = pvcDetails;
    const newStartData: StartNotebookData = {
      ...startNotebookData,
      volumes,
      volumeMounts,
      envFrom: [...envFrom, ...existingDataConnection],
      tolerationSettings,
    };

    createNotebook(newStartData, username, canEnablePipelines)
      .then((notebook) => afterStart(notebook.metadata.name, 'created'))
      .catch(handleError);
  };

  return (
    <Stack hasGutter>
      {error && (
        <StackItem>
          <Alert
            isInline
            variant="danger"
            title="Error creating workbench"
            actionLinks={
              // If this is a 409 conflict error
              error.statusObject.code === 409 ? (
                <>
                  <AlertActionLink
                    onClick={() =>
                      updateNotebookPromise(false)
                        .then((notebook) => {
                          if (notebook) {
                            afterStart(notebook.metadata.name, 'updated');
                          }
                        })
                        .catch(handleError)
                    }
                  >
                    Force update
                  </AlertActionLink>
                  <AlertActionLink onClick={() => location.reload()}>Refresh</AlertActionLink>
                </>
              ) : undefined
            }
          >
            {error.message}
          </Alert>
        </StackItem>
      )}
      <StackItem>
        <ActionList>
          <ActionListItem>
            <Button
              isDisabled={isButtonDisabled}
              variant="primary"
              data-testid="submit-button"
              id="create-button"
              onClick={editNotebook ? onUpdateNotebook : onCreateNotebook}
            >
              {editNotebook ? 'Update' : 'Create'} workbench
            </Button>
          </ActionListItem>
          <ActionListItem>
            <Button
              variant="link"
              id="cancel-button"
              onClick={() => {
                fireFormTrackingEvent(`Workbench ${editNotebook ? 'Updated' : 'Created'}`, {
                  outcome: TrackingOutcome.cancel,
                });
                navigate(`/projects/${projectName}?section=${ProjectSectionID.WORKBENCHES}`);
              }}
            >
              Cancel
            </Button>
          </ActionListItem>
        </ActionList>
      </StackItem>
    </Stack>
  );
};

export default SpawnerFooter;
