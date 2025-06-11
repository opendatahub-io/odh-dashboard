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
  createNotebook,
  K8sStatusError,
  mergePatchUpdateNotebook,
  restartNotebook,
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
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';
import { Connection } from '~/concepts/connectionTypes/types';
import { fireFormTrackingEvent } from '~/concepts/analyticsTracking/segmentIOUtils';
import {
  FormTrackingEventProperties,
  TrackingOutcome,
} from '~/concepts/analyticsTracking/trackingProperties';
import { NotebookKind } from '~/k8sTypes';
import { getNotebookPVCNames } from '~/pages/projects/pvc/utils';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import { isHardwareProfileConfigValid } from '~/concepts/hardwareProfiles/validationUtils';
import {
  createConfigMapsAndSecretsForNotebook,
  createPvcDataForNotebook,
  updateConfigMapsAndSecretsForNotebook,
  updatePvcDataForNotebook,
} from './service';
import { checkRequiredFieldsForNotebookStart, getPvcVolumeDetails } from './spawnerUtils';
import { getNotebookDataConnection } from './dataConnection/useNotebookDataConnection';
import { setConnectionsOnEnvFrom } from './connections/utils';

type SpawnerFooterProps = {
  startNotebookData: StartNotebookData;
  storageData: StorageData[];
  envVariables: EnvVariable[];
  dataConnection: DataConnectionData;
  connections?: Connection[];
  canEnablePipelines: boolean;
};

const SpawnerFooter: React.FC<SpawnerFooterProps> = ({
  startNotebookData,
  storageData,
  envVariables,
  dataConnection,
  connections = [],
  canEnablePipelines,
}) => {
  const [error, setError] = React.useState<K8sStatusError>();

  const {
    notebooks: { data: notebooks, refresh: refreshNotebooks },
    dataConnections: { data: existingDataConnections, refresh: refreshDataConnections },
    connections: { data: projectConnections, refresh: refreshConnections },
  } = React.useContext(ProjectDetailsContext);
  const { notebookName } = useParams();
  const notebookState = notebooks.find(
    (currentNotebookState) => currentNotebookState.notebook.metadata.name === notebookName,
  );

  const hardwareProfilesAvailable = useIsAreaAvailable(SupportedArea.HARDWARE_PROFILES).status;

  const editNotebook = notebookState?.notebook;
  const { projectName } = startNotebookData;
  const navigate = useNavigate();
  const [createInProgress, setCreateInProgress] = React.useState(false);
  const isHardwareProfileValid = hardwareProfilesAvailable
    ? isHardwareProfileConfigValid({
        selectedProfile: startNotebookData.podSpecOptions.selectedHardwareProfile,
        useExistingSettings: false, // does not matter for validation
        resources: startNotebookData.podSpecOptions.resources,
      })
    : true;
  const isButtonDisabled =
    createInProgress ||
    !checkRequiredFieldsForNotebookStart(startNotebookData, envVariables, dataConnection) ||
    !isHardwareProfileValid;
  const { username } = useUser();
  const existingNotebookDataConnection = getNotebookDataConnection(
    editNotebook,
    existingDataConnections,
  );

  const afterStart = (name: string, type: 'created' | 'updated') => {
    const { image, podSpecOptions } = startNotebookData;
    const tep: FormTrackingEventProperties = {
      containerResources: Object.entries(podSpecOptions.resources || {})
        .map(([key, value]) =>
          Object.entries(value).map(([k, v]) => `${key}.${k}: ${v?.toString() || ''}`),
        )
        .join(', '),
      lastSelectedImage: image.imageVersion?.from
        ? `${image.imageVersion.from.name}`
        : `${image.imageStream?.metadata.name || 'unknown image'} - ${
            image.imageVersion?.name || 'unknown version'
          }`,
      imageName: image.imageStream?.metadata.name,
      projectName,
      notebookName: name,
      dataConnectionType: dataConnection.creating?.type?.toString(),
      dataConnectionCategory: dataConnection.creating?.values?.category?.toString(),
      dataConnectionEnabled: dataConnection.enabled,
      outcome: TrackingOutcome.submit,
      success: true,
    };

    fireFormTrackingEvent(`Workbench ${type === 'created' ? 'Created' : 'Updated'}`, tep);

    refreshNotebooks();
    refreshDataConnections();
    refreshConnections();

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

  const getPvcRequests = (dryRun: boolean) => {
    const restartConnectedNotebooksPromises: Promise<NotebookKind>[] = [];

    const pvcRequests = storageData.map((pvcData) => {
      if (pvcData.existingPvc) {
        // Restart connected notebooks if the PVC size has changed
        if (pvcData.existingPvc.spec.resources.requests.storage !== pvcData.size) {
          notebooks
            .filter(
              (nbs) =>
                (nbs.isRunning || nbs.isStarting) &&
                getNotebookPVCNames(nbs.notebook).includes(
                  pvcData.existingPvc?.metadata.name || '',
                ),
            )
            .map((connectedNotebook) =>
              restartConnectedNotebooksPromises.push(
                restartNotebook(connectedNotebook.notebook.metadata.name, projectName, { dryRun }),
              ),
            );
        }
        return updatePvcDataForNotebook(projectName, pvcData, pvcData.existingPvc, dryRun);
      }

      return createPvcDataForNotebook(projectName, pvcData, dryRun);
    });

    return { pvcRequests, restartConnectedNotebooksPromises };
  };

  const updateNotebookPromise = async (dryRun: boolean) => {
    if (!editNotebook) {
      return;
    }

    const { pvcRequests, restartConnectedNotebooksPromises } = getPvcRequests(dryRun);

    const pvcResponses = await Promise.all(pvcRequests);
    const pvcVolumeDetails = getPvcVolumeDetails(pvcResponses);

    await Promise.all(restartConnectedNotebooksPromises);

    let envFrom = await updateConfigMapsAndSecretsForNotebook(
      projectName,
      editNotebook,
      envVariables,
      dataConnection,
      existingNotebookDataConnection,
      connections,
      dryRun,
    );
    envFrom = setConnectionsOnEnvFrom(connections, envFrom, projectConnections);

    const annotations = { ...editNotebook.metadata.annotations };
    if (envFrom.length > 0) {
      annotations['notebooks.opendatahub.io/notebook-restart'] = 'true';
    }

    const { volumes, volumeMounts } = pvcVolumeDetails;
    const newStartNotebookData: StartNotebookData = {
      ...startNotebookData,
      volumes,
      volumeMounts,
      envFrom,
    };
    if (dryRun) {
      return updateNotebook(editNotebook, newStartNotebookData, username, { dryRun });
    }
    return mergePatchUpdateNotebook(editNotebook, newStartNotebookData, username);
  };

  const onUpdateNotebook = async () => {
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

  const createNotebookPromise = async (dryRun: boolean) => {
    const newDataConnection =
      dataConnection.enabled && dataConnection.type === 'creating' && dataConnection.creating
        ? [dataConnection.creating]
        : [];
    const existingDataConnection =
      dataConnection.enabled && dataConnection.type === 'existing' && dataConnection.existing
        ? [dataConnection.existing]
        : [];

    const { pvcRequests, restartConnectedNotebooksPromises } = getPvcRequests(dryRun);

    const pvcResponses = await Promise.all(pvcRequests);
    const pvcVolumeDetails = getPvcVolumeDetails(pvcResponses);

    await Promise.all(restartConnectedNotebooksPromises);

    let envFrom = await createConfigMapsAndSecretsForNotebook(
      projectName,
      [...envVariables, ...newDataConnection],
      dryRun,
    );

    const { volumes, volumeMounts } = pvcVolumeDetails;
    envFrom = setConnectionsOnEnvFrom(connections, envFrom, projectConnections);

    const newStartData: StartNotebookData = {
      ...startNotebookData,
      volumes,
      volumeMounts,
      envFrom: [...envFrom, ...existingDataConnection],
    };
    return createNotebook(newStartData, username, canEnablePipelines, { dryRun });
  };

  const onCreateNotebook = async () => {
    handleStart();
    createNotebookPromise(true)
      .then(() =>
        createNotebookPromise(false)
          .then((notebook) => {
            afterStart(notebook.metadata.name, 'created');
          })
          .catch(handleError),
      )
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
              // If this is a 409 conflict error on the notebook (not PVC or Secret or ConfigMap)
              error.statusObject.code === 409 &&
              error.statusObject.details?.kind === 'notebooks' ? (
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
                navigate(-1);
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
