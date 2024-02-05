import * as React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import DeleteModal from '~/pages/projects/components/DeleteModal';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineRunKFv2 } from '~/concepts/pipelines/kfTypes';
import { K8sAPIOptions } from '~/k8sTypes';
// import { PipelineType } from '~/concepts/pipelines/content/tables/utils';
// import DeletePipelineModalExpandableSection from '~/concepts/pipelines/content/DeletePipelineModalExpandableSection';
import useDeleteStatuses from '~/concepts/pipelines/content/useDeleteStatuses';
// import PipelineJobReferenceName from './PipelineJobReferenceName';
// import PipelineRunTypeLabel from './PipelineRunTypeLabel';

type DeletePipelineRunsModalProps = {
  type: 'triggered run' | 'scheduled run';
  toDeleteResources: PipelineRunKFv2[];
  onClose: (deleted?: boolean) => void;
};

const DeletePipelineRunsModal: React.FC<DeletePipelineRunsModalProps> = ({
  toDeleteResources,
  onClose,
  type,
}) => {
  const { api } = usePipelinesAPI();
  // TODO: bring back during https://issues.redhat.com/browse/RHOAIENG-2225
  // const { deleting, setDeleting, error, setError, deleteStatuses, onBeforeClose, abortSignal } =
  //   useDeleteStatuses({ onClose, type, toDeleteResources })
  const { deleting, setDeleting, error, setError, onBeforeClose, abortSignal } = useDeleteStatuses({
    onClose,
    type,
    toDeleteResources,
  });

  const resourceCount = toDeleteResources.length;

  return (
    <DeleteModal
      title={`Delete ${resourceCount > 1 ? resourceCount : ''} ${type}${
        resourceCount > 1 ? 's' : ''
      }?`}
      isOpen={resourceCount !== 0}
      onClose={() => onBeforeClose(false)}
      deleting={deleting}
      error={error}
      onDelete={() => {
        if (resourceCount === 0) {
          return;
        }

        let callFunc: (opts: K8sAPIOptions, id: string) => Promise<void>;
        switch (type) {
          case 'scheduled run':
            callFunc = api.deletePipelineRunJob;
            break;
          case 'triggered run':
            callFunc = api.deletePipelineRun;
            break;
          default:
            // eslint-disable-next-line no-console
            console.error(`Unable to delete due to unknown type (${type})`);
            setError(new Error('Unable to perform delete for unknown reasons.'));
            return;
        }
        setDeleting(true);
        setError(undefined);

        if (resourceCount === 1) {
          callFunc({ signal: abortSignal }, toDeleteResources[0].run_id)
            .then(() => onBeforeClose(true))
            .catch((e) => {
              setError(e);
              setDeleting(false);
            });
        } else {
          Promise.allSettled(
            toDeleteResources.map((run) => callFunc({ signal: abortSignal }, run.run_id)),
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
        resourceCount === 1 ? toDeleteResources[0].display_name : `Delete ${resourceCount} ${type}s`
      }
    >
      {resourceCount <= 1 ? (
        <>This action cannot be undone.</>
      ) : (
        <Stack hasGutter>
          <StackItem>
            You are about to delete {resourceCount} {type}s. This action cannot be undone.
          </StackItem>
          <StackItem>
            {/* TODO: Out of scope for this PR: bring back during https://issues.redhat.com/browse/RHOAIENG-2225 */}
            {/* <DeletePipelineModalExpandableSection
              toDeleteResources={toDeleteResources}
              type="runs"
              deleting={deleting}
              deleteStatuses={deleteStatuses}
            >
              {(resource) => (
                <div>
                  <b>{resource.name}</b>{' '}
                  {type === PipelineType.TRIGGERED_RUN && (
                    <>
                      <PipelineRunTypeLabel resource={resource} isCompact />
                      <PipelineJobReferenceName resource={resource} />
                    </>
                  )}
                </div>
              )}
            </DeletePipelineModalExpandableSection> */}
          </StackItem>
        </Stack>
      )}
    </DeleteModal>
  );
};

export default DeletePipelineRunsModal;
