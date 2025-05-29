import React from 'react';
import {
  StackItem,
  Alert,
  Stack,
  AlertActionLink,
  Checkbox,
  AlertActionCloseButton,
} from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { NotebookKind } from '#~/k8sTypes';
import useNamespaces from '#~/pages/notebookController/useNamespaces';
import { NotebookImageStatus } from '#~/pages/projects/screens/detail/notebooks/const';
import { getNotebookImageData } from '#~/pages/projects/screens/detail/notebooks/useNotebookImageData';
import useImageStreams from '#~/pages/projects/screens/spawner/useImageStreams';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { useBrowserStorage } from '#~/components/browserStorage/BrowserStorageContext';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import { ProjectSectionID } from '#~/pages/projects/screens/detail/types';
import { isElyraVersionOutOfDate, isElyraVersionUpToDate } from './utils';

type ElyraInvalidVersionProps = {
  notebooks: NotebookKind[];
  children: (showImpactedNotebookInfo: (notebook: NotebookKind) => boolean) => React.ReactNode;
};

export const ElyraInvalidVersionAlerts: React.FC<ElyraInvalidVersionProps> = ({
  notebooks,
  children,
}) => {
  const { dashboardNamespace } = useNamespaces();
  const [images, loaded, loadError] = useImageStreams(dashboardNamespace, true);
  const navigate = useNavigate();
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const { pipelinesServer } = usePipelinesAPI();
  const [viewImpactedImages, setViewImpactedImages] = React.useState(true);
  const [elyraInvalidVersionAlertDismissed, setElyraInvalidVersionAlertDismissed] =
    useBrowserStorage('elyraInvalidVersionAlertDismissed', false, true, true);
  const [unsupportedPipelineVersionAlertDismissed, setUnsupportedPipelineVersionAlertDismissed] =
    useBrowserStorage('unsupportedPipelineVersionAlertDismissed', false, true, true);

  const [outOfDateNotebooks, updatedNotebooks] = React.useMemo(() => {
    if (!loaded || loadError) {
      return [[], []];
    }

    return notebooks.reduce<[NotebookKind[], NotebookKind[]]>(
      ([outOfDate, updated], notebook) => {
        const imageData = getNotebookImageData(notebook, images);
        if (imageData && imageData.imageStatus !== NotebookImageStatus.DELETED) {
          // technically the image can have both out of date and up to date versions, but unlikely
          if (isElyraVersionUpToDate(imageData.imageVersion)) {
            updated.push(notebook);
          }
          if (isElyraVersionOutOfDate(imageData.imageVersion)) {
            outOfDate.push(notebook);
          }
        }
        return [outOfDate, updated];
      },
      [[], []],
    );
  }, [loaded, loadError, notebooks, images]);

  const showElyraInvalidVersionsAlert =
    outOfDateNotebooks.length > 0 &&
    pipelinesServer.installed &&
    pipelinesServer.compatible &&
    !elyraInvalidVersionAlertDismissed;

  const showUnsupportedPipelineVersionAlert =
    pipelinesServer.installed &&
    !pipelinesServer.compatible &&
    updatedNotebooks.length > 0 &&
    !unsupportedPipelineVersionAlertDismissed;

  const showImpactedNotebookInfo = (notebook: NotebookKind) =>
    outOfDateNotebooks.some((data) => data.metadata.name === notebook.metadata.name) &&
    viewImpactedImages &&
    showElyraInvalidVersionsAlert;

  return (
    <Stack hasGutter>
      {showElyraInvalidVersionsAlert && (
        <StackItem>
          <Alert
            data-testid="elyra-invalid-version-alert"
            variant="info"
            title="Images denoted with (i) don't support the latest pipeline version. To use Elyra for pipelines, update the images to the recommended version."
            isInline
            actionLinks={
              <Checkbox
                label="Show icons"
                isChecked={viewImpactedImages}
                onChange={(_e, checked) => setViewImpactedImages(checked)}
                id="impacted-images-checkbox"
              />
            }
            actionClose={
              <AlertActionCloseButton onClose={() => setElyraInvalidVersionAlertDismissed(true)} />
            }
          />
        </StackItem>
      )}
      {showUnsupportedPipelineVersionAlert && (
        <StackItem>
          <Alert
            data-testid="unsupported-pipeline-version-alert"
            variant="warning"
            title="This pipeline version is no longer supported. To remove unsupported versions, go to the Pipelines tab, delete this project's pipeline server, and create a new one."
            isInline
            actionLinks={
              <AlertActionLink
                onClick={() =>
                  navigate(
                    `/projects/${currentProject.metadata.name}?section=${ProjectSectionID.PIPELINES}`,
                  )
                }
              >
                Go to Pipelines
              </AlertActionLink>
            }
            actionClose={
              <AlertActionCloseButton
                onClose={() => setUnsupportedPipelineVersionAlertDismissed(true)}
              />
            }
          />
        </StackItem>
      )}
      <StackItem>{children(showImpactedNotebookInfo)}</StackItem>
    </Stack>
  );
};
