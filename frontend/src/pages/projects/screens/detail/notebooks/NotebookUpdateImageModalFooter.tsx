import { ModalFooter, Button, StackItem, Alert, Stack } from '@patternfly/react-core';
import * as React from 'react';
import { K8sStatusError, patchNotebookImage } from '#~/api';
import { fireFormTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import {
  FormTrackingEventProperties,
  TrackingOutcome,
} from '#~/concepts/analyticsTracking/trackingProperties';
import { NotebookKind, ImageStreamSpecTagType, ImageStreamKind } from '#~/k8sTypes';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import { NotebookState } from '#~/pages/projects/notebook/types';
import { NotebookImage } from './types';
import { NotebookImageStatus } from './const';

type NotebookUpdateImageModalFooterProps = {
  notebookState: NotebookState;
  notebook: NotebookKind;
  notebookImage: NotebookImage;
  imageCard: string;
  currentImageCard: string;
  onModalClose: () => void;
  setIsUpdating: React.Dispatch<React.SetStateAction<boolean>>;
};

const NotebookUpdateImageModalFooter: React.FC<NotebookUpdateImageModalFooterProps> = ({
  notebookState,
  notebook,
  notebookImage,
  imageCard,
  currentImageCard,
  onModalClose,
  setIsUpdating,
}) => {
  const [error, setError] = React.useState<K8sStatusError>();
  const [createInProgress, setCreateInProgress] = React.useState(false);
  const isButtonDisabled = createInProgress || imageCard === currentImageCard;
  const { isStopped } = notebookState;

  const {
    notebooks: { data: notebooks },
  } = React.useContext(ProjectDetailsContext);

  const afterStart = (
    imageStream: ImageStreamKind,
    latestImageVersion?: ImageStreamSpecTagType,
  ) => {
    if (latestImageVersion) {
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
        imageBuildCommit: latestImageVersion.annotations?.['opendatahub.io/notebook-build-commit'],
        projectName: notebook.metadata.namespace,
        notebookName: notebook.metadata.name,
        outcome: TrackingOutcome.submit,
        success: true,
      };
      fireFormTrackingEvent('Workbench image updated', tep);
      notebooks.find((x) => x.notebook.metadata.name === notebook.metadata.name)?.refresh();
    }
    if (!isStopped) {
      setIsUpdating(true);
    }
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

  const onUpdateNotebook = async () => {
    handleStart();
    if (
      notebookImage.imageStatus !== NotebookImageStatus.DELETED &&
      notebookImage.latestImageVersion
    ) {
      patchNotebookImage(notebook, notebookImage.imageStream, notebookImage.latestImageVersion)
        .then(() => {
          afterStart(notebookImage.imageStream, notebookImage.latestImageVersion);
        })
        .catch(handleError);
    }
  };

  return (
    <ModalFooter>
      <Stack hasGutter>
        {error && (
          <StackItem>
            <Alert isInline variant="danger" title="Error creating workbench">
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
