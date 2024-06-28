import * as React from 'react';
import { ProjectKind } from '~/k8sTypes';
import { deleteProject } from '~/api';
import DeleteModal from '~/pages/projects/components/DeleteModal';
import { fireTrackingEvent } from '~/concepts/analyticsTracking/segmentIOUtils';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';

import { FormTrackingEventProperties, TrackingOutcome } from '~/concepts/analyticsTracking/trackingProperties';

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
      const props : FormTrackingEventProperties = { outcome: TrackingOutcome.cancel };
      fireTrackingEvent(deleteProjectEventType, props);
    } else {
      const props : FormTrackingEventProperties = {
        outcome: TrackingOutcome.submit,
        success: true,
      };
      fireTrackingEvent(deleteProjectEventType,  props);
    }
    onClose(deleted);
    setDeleting(false);
    setError(undefined);
  };

  const displayName = deleteData ? getDisplayNameFromK8sResource(deleteData) : 'this project';

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
              const props : FormTrackingEventProperties = {
                outcome: TrackingOutcome.submit,
                success: false,
                error: e,
              }
              fireTrackingEvent(deleteProjectEventType, props);
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
