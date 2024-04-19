import * as React from 'react';
import { ProjectKind } from '~/k8sTypes';
import { getProjectDisplayName } from '~/concepts/projects/utils';
import { deleteProject } from '~/api';
import DeleteModal from '~/pages/projects/components/DeleteModal';
import { fireTrackingEvent } from '~/utilities/segmentIOUtils';
import { TrackingOutcome } from '~/types';

type DeleteProjectModalProps = {
  onClose: (deleted: boolean) => void;
  deleteData?: ProjectKind;
};

const deleteProjectEventType = 'Project Deleted';
const DeleteProjectModal: React.FC<DeleteProjectModalProps> = ({ deleteData, onClose }) => {
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const onBeforeClose = (deleted: boolean) => {
    if (!deleted) {
      fireTrackingEvent(deleteProjectEventType, { outcome: TrackingOutcome.cancel });
    } else {
      fireTrackingEvent(deleteProjectEventType, {
        outcome: TrackingOutcome.submit,
        success: true,
      });
    }
    onClose(deleted);
    setDeleting(false);
    setError(undefined);
  };

  const displayName = deleteData ? getProjectDisplayName(deleteData) : 'this project';

  return (
    <DeleteModal
      title="Delete project?"
      isOpen={!!deleteData}
      onClose={() => onBeforeClose(false)}
      deleting={deleting}
      submitButtonLabel="Delete project"
      onDelete={() => {
        if (deleteData) {
          setDeleting(true);
          deleteProject(deleteData.metadata.name)
            .then(() => onBeforeClose(true))
            .catch((e) => {
              fireTrackingEvent(deleteProjectEventType, {
                outcome: TrackingOutcome.submit,
                success: false,
                error: e,
              });
              setError(e);
              setDeleting(false);
            });
        }
      }}
      deleteName={displayName}
      error={error}
    >
      This action cannot be undone. It will destroy all workbenches, storages, data connections and
      other resources in <strong>{displayName}</strong>.
    </DeleteModal>
  );
};

export default DeleteProjectModal;
