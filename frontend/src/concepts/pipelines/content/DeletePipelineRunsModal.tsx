import * as React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import DeleteModal from '#~/pages/projects/components/DeleteModal';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { PipelineRecurringRunKF, PipelineRunKF } from '#~/concepts/pipelines/kfTypes';
import { K8sAPIOptions } from '#~/k8sTypes';
import { PipelineRunType } from '#~/pages/pipelines/global/runs/types';
import DeletePipelineModalExpandableSection from '#~/concepts/pipelines/content/DeletePipelineModalExpandableSection';
import useDeleteStatuses from '#~/concepts/pipelines/content/useDeleteStatuses';
import { runTypeCategory } from './createRun/types';

type DeletePipelineRunsModalProps = {
  onClose: (deleted?: boolean) => void;
} & (
  | {
      type: PipelineRunType.ARCHIVED;
      toDeleteResources: PipelineRunKF[];
    }
  | {
      type: PipelineRunType.SCHEDULED;
      toDeleteResources: PipelineRecurringRunKF[];
    }
);

const DeletePipelineRunsModal: React.FC<DeletePipelineRunsModalProps> = ({
  toDeleteResources,
  onClose,
  type,
}) => {
  const { api } = usePipelinesAPI();
  const { deleting, setDeleting, error, setError, deleteStatuses, onBeforeClose, abortSignal } =
    useDeleteStatuses({ onClose, type, toDeleteResources });
  const resourceCount = toDeleteResources.length;
  const typeCategory = runTypeCategory[type];

  if (!resourceCount) {
    return null;
  }

  return (
    <DeleteModal
      title={`Delete ${typeCategory}${resourceCount > 1 ? 's' : ''}?`}
      onClose={() => onBeforeClose(false)}
      deleting={deleting}
      error={error}
      onDelete={() => {
        if (resourceCount === 0) {
          return;
        }

        let callFunc: (opts: K8sAPIOptions, id: string) => Promise<void>;
        switch (type) {
          case PipelineRunType.ARCHIVED:
            callFunc = api.deletePipelineRun;
            break;
          case PipelineRunType.SCHEDULED:
            callFunc = api.deletePipelineRecurringRun;
            break;
          default:
            // eslint-disable-next-line no-console
            console.error(`Unable to delete due to unknown type (${typeCategory})`);
            setError(new Error('Unable to perform delete for unknown reasons.'));
            return;
        }
        setDeleting(true);
        setError(undefined);

        if (resourceCount === 1) {
          callFunc(
            { signal: abortSignal },
            type === PipelineRunType.SCHEDULED
              ? toDeleteResources[0].recurring_run_id
              : toDeleteResources[0].run_id,
          )
            .then(() => onBeforeClose(true))
            .catch((e) => {
              setError(e);
              setDeleting(false);
            });
        } else {
          //TODO: prefer a refactor for the use case to not depend on the index in the delete modal.
          // eslint-disable-next-line no-restricted-properties
          Promise.allSettled(
            toDeleteResources.map((_run, i) =>
              callFunc(
                { signal: abortSignal },
                type === PipelineRunType.SCHEDULED
                  ? toDeleteResources[i].recurring_run_id
                  : toDeleteResources[i].run_id,
              ),
            ),
          ).then((results) =>
            onBeforeClose(
              true,
              results.map((result) => (result.status === 'fulfilled' ? true : result.reason)),
            ),
          );
        }
      }}
      submitButtonLabel="Delete"
      deleteName={
        resourceCount === 1
          ? toDeleteResources[0].display_name
          : `Delete ${resourceCount} ${typeCategory}s`
      }
      testId={`delete-${typeCategory}-modal`}
    >
      {resourceCount === 1 ? (
        <>
          <b>{toDeleteResources[0].display_name}</b> and all of its resources will be deleted.
        </>
      ) : (
        <Stack hasGutter>
          <StackItem>
            <b>{resourceCount}</b> {typeCategory}s and all of their resources will be deleted.
          </StackItem>
          <StackItem>
            <DeletePipelineModalExpandableSection
              toDeleteResources={toDeleteResources}
              type="runs"
              deleting={deleting}
              deleteStatuses={deleteStatuses}
            >
              {(resource) => resource.display_name}
            </DeletePipelineModalExpandableSection>
          </StackItem>
        </Stack>
      )}
    </DeleteModal>
  );
};

export default DeletePipelineRunsModal;
