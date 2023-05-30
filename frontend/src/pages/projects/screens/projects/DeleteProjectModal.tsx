import * as React from 'react';
import { ProjectKind } from '~/k8sTypes';
import { getProjectDisplayName } from '~/pages/projects/utils';
import { deleteProject } from '~/api';
import DeleteModal from '~/pages/projects/components/DeleteModal';
import { ProjectsContext } from '~/concepts/projects/ProjectsContext';

type DeleteProjectModalProps = {
  onClose: (deleted: boolean) => void;
  deleteData?: ProjectKind;
};

const DeleteProjectModal: React.FC<DeleteProjectModalProps> = ({ deleteData, onClose }) => {
  const { refresh } = React.useContext(ProjectsContext);
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const onBeforeClose = (deleted: boolean) => {
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
          deleteProject(deleteData?.metadata.name)
            .then(() => refresh())
            .then(() => onBeforeClose(true))
            .catch((e) => {
              onBeforeClose(false);
              setError(e);
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
