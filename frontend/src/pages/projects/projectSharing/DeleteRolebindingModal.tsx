import * as React from 'react';
import DeleteModal from '~/pages/projects/components/DeleteModal';
import useRelatedNotebooks, {
  ConnectedNotebookContext,
} from '~/pages/projects/notebook/useRelatedNotebooks';
import { removeNotebookSecret } from '~/api';
import DeleteModalConnectedAlert from '~/pages/projects/components/DeleteModalConnectedAlert';
import { RoleBindingKind } from '~/k8sTypes';
import { getRoleBindingDisplayName, getRoleBindingResourceName } from './utils';

type DeleteRolebindingModalProps = {
  roleBinding?: RoleBindingKind;
  onClose: (deleted: boolean) => void;
};

const DeleteRolebindingModal: React.FC<DeleteRolebindingModalProps> = ({
  roleBinding,
  onClose,
}) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();
  const resourceName = roleBinding ? getRoleBindingResourceName(roleBinding) : '';
  const {
    notebooks: connectedNotebooks,
    loaded: notebookLoaded,
    error: notebookError,
  } = useRelatedNotebooks(ConnectedNotebookContext.EXISTING_DATA_CONNECTION, resourceName);

  const onBeforeClose = (deleted: boolean) => {
    onClose(deleted);
    setIsDeleting(false);
    setError(undefined);
  };

  const displayName = roleBinding
    ? getRoleBindingDisplayName(roleBinding)
    : 'this data connection';

  return (
    <DeleteModal
      title="Delete data connection?"
      isOpen={!!roleBinding}
      onClose={() => onBeforeClose(false)}
      submitButtonLabel="Delete data connection"
      onDelete={() => {
        if (roleBinding) {
          setIsDeleting(true);
          // TODO: Delete rolebinding
        }
      }}
      deleting={isDeleting}
      error={error}
      deleteName={displayName}
    >
      <DeleteModalConnectedAlert
        connectedNotebooks={connectedNotebooks}
        error={notebookError}
        loaded={notebookLoaded}
      />
    </DeleteModal>
  );
};

export default DeleteRolebindingModal;
