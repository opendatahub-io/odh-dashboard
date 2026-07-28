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
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import { K8sStatusError } from '@odh-dashboard/k8s-core';
import { type FormTrackingEventProperties, TrackingOutcome } from '@odh-dashboard/ui-core';
import { createNotebook, mergePatchUpdateNotebook, restartNotebook, updateNotebook } from '#~/api';
import {
  EnvVariable,
  SecretCategory,
  StartNotebookData,
  StorageData,
} from '#~/pages/projects/types';
import { useUser } from '#~/redux/selectors';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import { ProjectSectionID } from '#~/pages/projects/screens/detail/types';
import { Connection } from '#~/concepts/connectionTypes/types';
import { fireFormTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import { NotebookKind } from '#~/k8sTypes';
import { getNotebookPVCNames } from '#~/pages/projects/pvc/utils';
import {
  getWorkbenchKueueTrackingProperties,
  WorkbenchTrackingEvent,
} from '#~/concepts/kueue/workbenchTracking';
import { KUEUE_QUEUE_LABEL } from '#~/concepts/kueue/index';
import { useExistingSecrets } from './environmentVariables/useExistingSecrets';
import {
  createConfigMapsAndSecretsForNotebook,
  createPvcDataForNotebook,
  getSecretKeyRefEnvVars,
  updateConfigMapsAndSecretsForNotebook,
  updatePvcDataForNotebook,
} from './service';
import { checkRequiredFieldsForNotebookStart, getPvcVolumeDetails } from './spawnerUtils';
import type { SelectedFeatureStoreConfig } from './featureStore/useWorkbenchFeatureStores';
import { generateFeastMetadata } from './featureStore/utils';

type SpawnerFooterProps = {
  startNotebookData: StartNotebookData;
  storageData: StorageData[];
  envVariables: EnvVariable[];
  connections: Connection[];
  canEnablePipelines: boolean;
  selectedFeatureStores?: SelectedFeatureStoreConfig[];
  /** Present when editing; prefer this over looking up the notebook from context. */
  existingNotebook?: NotebookKind;
};

const SpawnerFooter: React.FC<SpawnerFooterProps> = ({
  startNotebookData,
  storageData,
  envVariables,
  connections = [],
  canEnablePipelines,
  selectedFeatureStores = [],
  existingNotebook,
}) => {
  const [error, setError] = React.useState<K8sStatusError>();
  const {
    notebooks: { data: notebooks, refresh: refreshNotebooks },
    connections: { refresh: refreshConnections },
    kueueStatusByNotebookName,
  } = React.useContext(ProjectDetailsContext);
  const { notebookName } = useParams();
  const notebookState = notebooks.find(
    (currentNotebookState) => currentNotebookState.notebook.metadata.name === notebookName,
  );

  const isProjectScopedAvailable = useIsAreaAvailable(SupportedArea.DS_PROJECT_SCOPED).status;

  const editNotebook = existingNotebook ?? notebookState?.notebook;
  const { projectName } = startNotebookData;
  const navigate = useNavigate();
  const [createInProgress, setCreateInProgress] = React.useState(false);
  const isHardwareProfileValid =
    startNotebookData.hardwareProfileOptions.validateHardwareProfileForm();
  const { secrets: availableSecrets, loaded: secretsLoaded } = useExistingSecrets(projectName);
  const hasDeletedOrMissingRefs = React.useMemo(() => {
    if (!secretsLoaded) {
      return false;
    }
    const secretKeyMap = new Map(availableSecrets.map((s) => [s.name, new Set(s.keys)]));
    return envVariables.some(
      (v) =>
        v.values?.category === SecretCategory.EXISTING &&
        v.existingSecretRefs?.some((ref) => {
          const keys = secretKeyMap.get(ref.secretName);
          if (!keys) {
            return true;
          }
          return ref.selectedKeys.some((k) => !keys.has(k));
        }),
    );
  }, [envVariables, availableSecrets, secretsLoaded]);

  const isButtonDisabled =
    createInProgress ||
    !checkRequiredFieldsForNotebookStart(startNotebookData, envVariables) ||
    hasDeletedOrMissingRefs ||
    !isHardwareProfileValid ||
    (!isProjectScopedAvailable &&
      startNotebookData.image.imageStream?.metadata.namespace === projectName);

  const { username } = useUser();
  const workbenchesHref = `/projects/${projectName}?section=${ProjectSectionID.WORKBENCHES}`;

  const afterStart = (name: string, type: 'created' | 'updated') => {
    const {
      image,
      hardwareProfileOptions: {
        podSpecOptionsState: {
          podSpecOptions,
          hardwareProfile: { formData: hardwareProfileFormData },
        },
      },
    } = startNotebookData;
    const kueueStatus = kueueStatusByNotebookName[name] ?? null;
    const kueueQueueName =
      hardwareProfileFormData.selectedProfile?.spec.scheduling?.kueue?.localQueueName ||
      editNotebook?.metadata.labels?.[KUEUE_QUEUE_LABEL];
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
      outcome: TrackingOutcome.submit,
      success: true,
      ...getWorkbenchKueueTrackingProperties({
        kueueStatus,
        kueueQueueName,
        isStarting: true,
        isRunning: false,
        isStopping: false,
      }),
    };

    fireFormTrackingEvent(
      type === 'created' ? WorkbenchTrackingEvent.Created : WorkbenchTrackingEvent.Updated,
      tep,
    );

    refreshNotebooks();
    refreshConnections();

    navigate(workbenchesHref);
  };
  const handleError = (e: unknown) => {
    const name = editNotebook?.metadata.name || startNotebookData.notebookData.k8sName.value;
    const kueueQueueName =
      startNotebookData.hardwareProfileOptions.podSpecOptionsState.hardwareProfile.formData
        .selectedProfile?.spec.scheduling?.kueue?.localQueueName ||
      editNotebook?.metadata.labels?.[KUEUE_QUEUE_LABEL];

    fireFormTrackingEvent(
      editNotebook ? WorkbenchTrackingEvent.Updated : WorkbenchTrackingEvent.Created,
      {
        outcome: TrackingOutcome.submit,
        success: false,
        error: e instanceof K8sStatusError ? `k8s_${e.statusObject.code}` : 'unknown_error',
        projectName,
        notebookName: name,
        ...getWorkbenchKueueTrackingProperties({
          kueueStatus: kueueStatusByNotebookName[name] ?? null,
          kueueQueueName,
          isStarting: true,
          isRunning: false,
          isStopping: false,
        }),
      },
    );
    if (e instanceof K8sStatusError) {
      setError(e);
    }
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

    const { envFrom, secretKeyRefEnvVars } = await updateConfigMapsAndSecretsForNotebook(
      projectName,
      editNotebook,
      envVariables,
      connections,
      dryRun,
    );

    const annotations = { ...editNotebook.metadata.annotations };
    if (envFrom.length > 0 || secretKeyRefEnvVars.length > 0) {
      annotations['notebooks.opendatahub.io/notebook-restart'] = 'true';
    }

    const { volumes, volumeMounts } = pvcVolumeDetails;
    const feastData = generateFeastMetadata(selectedFeatureStores, editNotebook, true);
    const newStartNotebookData: StartNotebookData = {
      ...startNotebookData,
      volumes,
      volumeMounts,
      envFrom,
      secretKeyRefEnvVars,
      connections,
      feastData,
    };
    if (dryRun) {
      return updateNotebook(editNotebook, newStartNotebookData, username, { dryRun });
    }
    return mergePatchUpdateNotebook(editNotebook, newStartNotebookData, username);
  };

  const onUpdateNotebook = async () => {
    if (!editNotebook) {
      return;
    }
    handleStart();
    updateNotebookPromise(true)
      .then(() =>
        updateNotebookPromise(false)
          .then((notebook) => {
            afterStart(notebook?.metadata.name ?? editNotebook.metadata.name, 'updated');
          })
          .catch(handleError),
      )
      .catch(handleError);
  };

  const createNotebookPromise = async (dryRun: boolean) => {
    const { pvcRequests, restartConnectedNotebooksPromises } = getPvcRequests(dryRun);

    const pvcResponses = await Promise.all(pvcRequests);
    const pvcVolumeDetails = getPvcVolumeDetails(pvcResponses);

    await Promise.all(restartConnectedNotebooksPromises);

    const envFrom = await createConfigMapsAndSecretsForNotebook(
      projectName,
      [...envVariables],
      dryRun,
    );

    const { volumes, volumeMounts } = pvcVolumeDetails;
    const feastData = generateFeastMetadata(selectedFeatureStores, undefined, false);

    const newStartData: StartNotebookData = {
      ...startNotebookData,
      volumes,
      volumeMounts,
      envFrom: [...envFrom],
      secretKeyRefEnvVars: getSecretKeyRefEnvVars(envVariables),
      connections,
      feastData,
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
            title={editNotebook ? 'Error updating workbench' : 'Error creating workbench'}
            data-testid="spawner-error-alert"
            actionLinks={
              // If this is a 409 conflict error on the notebook (not PVC or Secret or ConfigMap)
              error.statusObject.code === 409 &&
              error.statusObject.details?.kind === 'notebooks' ? (
                <>
                  <AlertActionLink
                    data-testid="force-update-button"
                    onClick={() =>
                      updateNotebookPromise(false)
                        .then((notebook) => {
                          if (editNotebook) {
                            afterStart(
                              notebook?.metadata.name ?? editNotebook.metadata.name,
                              'updated',
                            );
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
              data-testid="cancel-button"
              onClick={() => {
                fireFormTrackingEvent(
                  editNotebook ? WorkbenchTrackingEvent.Updated : WorkbenchTrackingEvent.Created,
                  {
                    outcome: TrackingOutcome.cancel,
                  },
                );
                navigate(workbenchesHref);
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
