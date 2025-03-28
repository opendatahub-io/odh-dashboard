import {
  ModalFooter,
  Button,
  StackItem,
  Alert,
  AlertActionLink,
  Stack,
} from '@patternfly/react-core';
import * as React from 'react';
import { K8sStatusError, mergePatchUpdateNotebookImage, updateNotebookImage } from '~/api';
import { fireFormTrackingEvent } from '~/concepts/analyticsTracking/segmentIOUtils';
import {
  FormTrackingEventProperties,
  TrackingOutcome,
} from '~/concepts/analyticsTracking/trackingProperties';
import { NotebookKind, ImageStreamSpecTagType, ImageStreamKind } from '~/k8sTypes';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { useUser } from '~/redux/selectors';

type NotebookUpdateImageModalFooterProps = {
  notebook: NotebookKind;
  notebookImageVersionData: {
    currentImageVersion: ImageStreamSpecTagType;
    latestImageVersion: ImageStreamSpecTagType;
    imageStream: ImageStreamKind;
  };
  imageCard: string;
  currentImageCard: string;
  onModalClose: () => void;
};

const NotebookUpdateImageModalFooter: React.FC<NotebookUpdateImageModalFooterProps> = ({
  notebook,
  notebookImageVersionData,
  imageCard,
  currentImageCard,
  onModalClose,
}) => {
  const [error, setError] = React.useState<K8sStatusError>();
  const [createInProgress, setCreateInProgress] = React.useState(false);
  const { latestImageVersion, imageStream } = notebookImageVersionData;
  const isButtonDisabled = createInProgress || imageCard === currentImageCard;
  const { username } = useUser();

  const {
    notebooks: { data: notebooks },
  } = React.useContext(ProjectDetailsContext);

  const afterStart = () => {
    const tep: FormTrackingEventProperties = {
      containers: Object.entries(notebook.spec.template.spec.containers.at(0)?.resources || {})
        .map(([key, value]) =>
          Object.entries(value).map(([k, v]) => `${key}.${k}: ${v?.toString() || ''}`),
        )
        .join(', '),
      lastSelectedImage: latestImageVersion.from
        ? latestImageVersion.from.name
        : `${imageStream.metadata.name || 'unknown image'} - ${
            latestImageVersion.name || 'unknown version'
          }`,
      imageName: imageStream.metadata.name,
      projectName: notebook.metadata.namespace,
      notebookName: notebook.metadata.name,
      dataConnectionType: undefined,
      dataConnectionEnabled: !!notebook.spec.template.spec.containers.at(0)?.envFrom,
      dataConnectionCategory: undefined,
      outcome: TrackingOutcome.submit,
      success: true,
    };
    fireFormTrackingEvent('Workbench image updated', tep);
    notebooks.find((x) => x.notebook.metadata.name === notebook.metadata.name)?.refresh();
    onModalClose();
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
    if (dryRun) {
      return updateNotebookImage(notebook, latestImageVersion, imageStream, username, { dryRun });
    }
    return mergePatchUpdateNotebookImage(notebook, latestImageVersion, imageStream, username);
  };

  const onUpdateNotebook = async () => {
    handleStart();
    updateNotebookPromise(true)
      .then(() =>
        updateNotebookPromise(false)
          .then(() => {
            afterStart();
          })
          .catch(handleError),
      )
      .catch(handleError);
  };

  return (
    <ModalFooter>
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
                          .then(() => {
                            afterStart();
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
          <Button
            key="update"
            variant="primary"
            onClick={() => {
              onUpdateNotebook();
            }}
            isDisabled={isButtonDisabled}
            data-testid="submit-update-latest-version"
          >
            Update
          </Button>
          <Button key="cancel" variant="link" onClick={onModalClose}>
            Cancel
          </Button>
        </StackItem>
      </Stack>
    </ModalFooter>
  );
};

export default NotebookUpdateImageModalFooter;
