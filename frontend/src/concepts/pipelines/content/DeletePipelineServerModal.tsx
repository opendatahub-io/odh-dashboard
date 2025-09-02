import * as React from 'react';
import DeleteModal from '#~/pages/projects/components/DeleteModal';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { deleteServer } from '#~/concepts/pipelines/utils';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import { fireFormTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '#~/concepts/analyticsTracking/trackingProperties';

type DeletePipelineServerModalProps = {
  onClose: (deleted: boolean) => void;
  removeConfirmation?: boolean;
};

const eventName = 'Pipeline Server Deleted';
const DeletePipelineServerModal: React.FC<DeletePipelineServerModalProps> = ({
  onClose,
  removeConfirmation = false,
}) => {
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();
  const { project, namespace, pipelinesServer } = usePipelinesAPI();

  const onBeforeClose = (deleted: boolean) => {
    onClose(deleted);
  };

  const deleteName = `${getDisplayNameFromK8sResource(project)} pipeline server`;

  return (
    <DeleteModal
      removeConfirmation={removeConfirmation}
      ß
      title="Delete pipeline server?"
      onClose={() => {
        console.log(
          'onClose; for cancelling ....namespace/pipelinesServer.name:',
          namespace,
          pipelinesServer.name,
        );
        onBeforeClose(false);
      }}
      deleting={deleting}
      error={error}
      onDelete={() => {
        setDeleting(true);
        deleteServer(namespace, pipelinesServer.name)
          .then(() => {
            onBeforeClose(true);
            fireFormTrackingEvent(eventName, {
              outcome: TrackingOutcome.submit,
              success: true,
            });
          })
          .catch((e) => {
            onBeforeClose(false);
            setError(e);
            fireFormTrackingEvent(eventName, {
              outcome: TrackingOutcome.submit,
              success: false,
              error: e,
            });
          });
      }}
      submitButtonLabel="Delete pipeline server"
      deleteName={deleteName}
    >
      The <b>{deleteName}</b> and all of its pipelines and runs will be deleted from{' '}
      <b>{deleteName}</b>. You will not be able to create new pipelines or pipeline runs until you
      create a new pipeline server.
    </DeleteModal>
  );
};

export default DeletePipelineServerModal;
