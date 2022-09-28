import * as React from 'react';
import { Button, Modal } from '@patternfly/react-core';
import { ProjectKind } from '../../../../k8sTypes';
import { getProjectDisplayName } from '../../utils';
import { deleteProject } from '../../../../api';
import useNotification from '../../../../utilities/useNotification';

type DeleteProjectModalProps = {
  onClose: (deleted: boolean) => void;
  deleteData?: ProjectKind;
};

const DeleteProjectModal: React.FC<DeleteProjectModalProps> = ({ deleteData, onClose }) => {
  const [deleting, setDeleting] = React.useState(false);
  const notification = useNotification();

  const onBeforeClose = (deleted: boolean) => {
    onClose(deleted);
    setDeleting(false);
  };

  return (
    <Modal
      title="Delete project"
      variant="small"
      isOpen={!!deleteData}
      onClose={() => onBeforeClose(false)}
      actions={[
        <Button
          key="delete-button"
          variant="danger"
          isLoading={deleting}
          isDisabled={deleting || !deleteData}
          onClick={() => {
            if (deleteData) {
              setDeleting(true);
              deleteProject(deleteData?.metadata.name)
                .then(() => onBeforeClose(true))
                .catch(() => {
                  onBeforeClose(false);
                  notification.error(
                    'Error deleting project',
                    `Could not delete project ${getProjectDisplayName(deleteData)}`,
                  );
                });
            }
          }}
        >
          Delete
        </Button>,
        <Button key="cancel-button" variant="secondary" onClick={() => onBeforeClose(false)}>
          Cancel
        </Button>,
      ]}
    >
      Are you sure you want to delete project{' '}
      {deleteData ? <b>{getProjectDisplayName(deleteData)}</b> : 'this project'}?
    </Modal>
  );
};

export default DeleteProjectModal;
