import * as React from 'react';
import { getRoleDisplayName } from '#~/concepts/permissions/utils';
import { usePermissionsContext } from '#~/concepts/permissions/PermissionsContext';
import { deleteRole } from '#~/api/k8s/roles';
import DeleteModal from '#~/pages/projects/components/DeleteModal';
import type { RoleListRow } from './types';

type DeleteRoleModalProps = {
  row: RoleListRow;
  namespace: string;
  onClose: (deleted: boolean) => void;
};

const DeleteRoleModal: React.FC<DeleteRoleModalProps> = ({ row, namespace, onClose }) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error>();
  const { roleBindings } = usePermissionsContext();

  const { roleRef, role } = row;
  const displayName = getRoleDisplayName(roleRef, role);

  const affectedSubjectCount = React.useMemo(() => {
    const subjects = new Set<string>();
    roleBindings.data.forEach((rb) => {
      if (rb.roleRef.name === roleRef.name && rb.roleRef.kind === 'Role') {
        rb.subjects?.forEach((subject) => {
          subjects.add(`${subject.kind}:${subject.name}`);
        });
      }
    });
    return subjects.size;
  }, [roleBindings.data, roleRef.name]);

  const handleDelete = () => {
    setIsDeleting(true);
    setError(undefined);
    deleteRole(roleRef.name, namespace)
      .then(() => onClose(true))
      .catch((e) => {
        setError(e);
        setIsDeleting(false);
      });
  };

  return (
    <DeleteModal
      title="Delete role?"
      onClose={() => onClose(false)}
      deleting={isDeleting}
      onDelete={handleDelete}
      deleteName={displayName}
      submitButtonLabel="Delete role"
      error={error}
      testId="delete-role-modal"
    >
      {affectedSubjectCount > 0 ? (
        <>
          The <strong>{displayName}</strong> role will be deleted and unassigned from{' '}
          <strong>
            {affectedSubjectCount}{' '}
            {affectedSubjectCount === 1 ? 'user or group' : 'users or groups'}
          </strong>
          .
        </>
      ) : (
        <>
          The <strong>{displayName}</strong> role will be deleted.
        </>
      )}
    </DeleteModal>
  );
};

export default DeleteRoleModal;
