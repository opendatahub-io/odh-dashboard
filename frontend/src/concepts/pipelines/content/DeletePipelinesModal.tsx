import * as React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import DeleteModal from '#~/pages/projects/components/DeleteModal';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { PipelineKF, PipelineVersionKF } from '#~/concepts/pipelines/kfTypes';
import useDeleteStatuses from '#~/concepts/pipelines/content/useDeleteStatuses';
import DeletePipelineModalExpandableSection from '#~/concepts/pipelines/content/DeletePipelineModalExpandableSection';
import { getPipelineAndVersionDeleteString } from '#~/concepts/pipelines/content/utils';
import { fireFormTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import {
  FormTrackingEventProperties,
  TrackingOutcome,
} from '#~/concepts/analyticsTracking/trackingProperties';

type DeletePipelinesModalProps = {
  toDeletePipelines?: PipelineKF[];
  toDeletePipelineVersions?: { pipelineName: string; version: PipelineVersionKF }[];
  onClose: (deleted?: boolean) => void;
};

const DeletePipelinesModal: React.FC<DeletePipelinesModalProps> = ({
  toDeletePipelines = [],
  toDeletePipelineVersions = [],
  onClose,
}) => {
  const { api } = usePipelinesAPI();
  const toDeleteVersions = React.useMemo(
    () => toDeletePipelineVersions.map((version) => version.version),
    [toDeletePipelineVersions],
  );
  const { deleting, setDeleting, error, setError, deleteStatuses, onBeforeClose, abortSignal } =
    useDeleteStatuses({
      onClose,
      type: 'pipeline',
      toDeleteResources: [...toDeletePipelines, ...toDeleteVersions],
    });
  const resourceCount = toDeletePipelines.length + toDeletePipelineVersions.length;

  if (resourceCount === 0) {
    return null;
  }

  let deleteTitle;
  let deleteName;
  let isDeleteVersion = false;
  let deleteDescription = <>This action cannot be undone.</>;
  if (resourceCount > 1) {
    deleteTitle = 'Delete pipelines?';
    if (toDeletePipelines.length === 0) {
      deleteName = `Delete ${toDeletePipelineVersions.length} pipeline versions`;
    } else if (toDeletePipelineVersions.length === 0) {
      deleteName = `Delete ${toDeletePipelines.length} pipelines`;
      deleteDescription = (
        <>All versions from {toDeletePipelines.length} pipelines will be deleted.</>
      );
    } else {
      deleteName = `Delete ${getPipelineAndVersionDeleteString(
        toDeletePipelines,
        'pipeline',
      )} and ${getPipelineAndVersionDeleteString(toDeleteVersions, 'version')}`;
      deleteDescription = (
        <>
          All versions from {getPipelineAndVersionDeleteString(toDeletePipelines, 'pipeline')} and{' '}
          {getPipelineAndVersionDeleteString(toDeleteVersions, 'version')} from different pipelines
          will be deleted.
        </>
      );
    }
  } else if (toDeletePipelineVersions.length === 1) {
    deleteTitle = 'Delete pipeline version?';
    isDeleteVersion = true;
    deleteName = toDeletePipelineVersions[0].version.display_name;
    deleteDescription = (
      <>
        <strong>{toDeletePipelineVersions[0].version.display_name}</strong>, a version of your{' '}
        <strong>{toDeletePipelineVersions[0].pipelineName}</strong> pipeline, will be deleted.
      </>
    );
  } else {
    deleteTitle = 'Delete pipeline?';
    deleteName = toDeletePipelines[0].display_name;
  }

  const fireFormTrackingEventForPipeline = (properties: FormTrackingEventProperties) => {
    fireFormTrackingEvent(
      isDeleteVersion ? 'Pipeline Version Deleted' : 'Pipeline Deleted',
      properties,
    );
  };

  return (
    <DeleteModal
      title={deleteTitle}
      onClose={() => {
        onBeforeClose(false);
        fireFormTrackingEventForPipeline({
          outcome: TrackingOutcome.cancel,
        });
      }}
      deleting={deleting}
      error={error}
      onDelete={() => {
        if (resourceCount === 0) {
          return;
        }
        setDeleting(true);
        setError(undefined);

        const allPromises = [
          ...toDeletePipelines.map((resource) =>
            api.deletePipeline({ signal: abortSignal }, resource.pipeline_id),
          ),
          ...toDeletePipelineVersions.map((resource) =>
            api.deletePipelineVersion(
              { signal: abortSignal },
              resource.version.pipeline_id,
              resource.version.pipeline_version_id,
            ),
          ),
        ];

        if (allPromises.length === 1) {
          allPromises[0]
            .then(() => {
              onBeforeClose(true);
              fireFormTrackingEventForPipeline({
                outcome: TrackingOutcome.submit,
                success: true,
              });
            })
            .catch((e) => {
              setError(e);
              setDeleting(false);
              fireFormTrackingEventForPipeline({
                outcome: TrackingOutcome.submit,
                success: false,
                error: e,
              });
            });
        } else {
          //TODO: prefer a refactor for the use case to not depend on the index in the delete modal.
          // eslint-disable-next-line no-restricted-properties
          Promise.allSettled(allPromises).then((results) =>
            onBeforeClose(
              true,
              results.map((result) => (result.status === 'fulfilled' ? true : result.reason)),
            ),
          );
          fireFormTrackingEventForPipeline({
            outcome: TrackingOutcome.submit,
            success: true,
          });
        }
      }}
      submitButtonLabel="Delete"
      deleteName={deleteName}
      testId="delete-pipeline-modal"
    >
      {resourceCount <= 1 ? (
        deleteDescription
      ) : (
        <Stack hasGutter>
          <StackItem>{deleteDescription}</StackItem>
          {toDeletePipelines.length !== 0 && (
            <StackItem>
              <DeletePipelineModalExpandableSection
                toDeleteResources={toDeletePipelines}
                type="pipelines"
                deleting={deleting}
                deleteStatuses={deleteStatuses}
              >
                {(pipeline) => <div>{pipeline.display_name}</div>}
              </DeletePipelineModalExpandableSection>
            </StackItem>
          )}
          {toDeletePipelineVersions.length !== 0 && (
            <StackItem>
              <DeletePipelineModalExpandableSection
                toDeleteResources={toDeleteVersions}
                type="pipeline versions"
                deleting={deleting}
                deleteStatuses={deleteStatuses}
              >
                {(version) => <div>{version.display_name}</div>}
              </DeletePipelineModalExpandableSection>
            </StackItem>
          )}
        </Stack>
      )}
    </DeleteModal>
  );
};

export default DeletePipelinesModal;
