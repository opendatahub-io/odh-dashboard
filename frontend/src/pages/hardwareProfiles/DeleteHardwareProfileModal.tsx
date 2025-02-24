import React from 'react';
import { Alert, Stack, StackItem } from '@patternfly/react-core';
import { deleteHardwareProfile } from '~/api';
import { HardwareProfileKind } from '~/k8sTypes';
import DeleteModal from '~/pages/projects/components/DeleteModal';
import { MigrationAction, MigrationSourceType } from './migration/types';

type DeleteHardwareProfileModalProps = {
  hardwareProfile: HardwareProfileKind;
  migrationAction?: MigrationAction;
  onClose: (deleted: boolean) => void;
};

const migrationAlertMessage = (migrationAction: MigrationAction) => {
  switch (migrationAction.source.type) {
    case MigrationSourceType.ACCELERATOR_PROFILE:
      return (
        <>
          This action will delete the source accelerator profile,{' '}
          <b>{migrationAction.source.resource.metadata?.name ?? migrationAction.source.label}</b>,
          resulting in any dependent translated hardware profiles being lost.
        </>
      );
    case MigrationSourceType.SERVING_CONTAINER_SIZE:
    case MigrationSourceType.NOTEBOOK_CONTAINER_SIZE:
      return (
        <>
          This action will delete the source container size, <b>{migrationAction.source.label}</b>,
          from the dashboard config.
        </>
      );
  }
};
const DeleteHardwareProfileModal: React.FC<DeleteHardwareProfileModalProps> = ({
  hardwareProfile,
  migrationAction,
  onClose,
}) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();

  const onBeforeClose = (deleted: boolean) => {
    onClose(deleted);
    setIsDeleting(false);
    setError(undefined);
  };

  return (
    <DeleteModal
      title="Delete hardware profile?"
      onClose={() => onBeforeClose(false)}
      submitButtonLabel="Delete"
      onDelete={() => {
        setIsDeleting(true);

        const deletePromise = () => {
          if (migrationAction) {
            return migrationAction.deleteSourceResource();
          }

          return deleteHardwareProfile(
            hardwareProfile.metadata.name,
            hardwareProfile.metadata.namespace,
          );
        };

        deletePromise()
          .then(() => {
            onBeforeClose(true);
          })
          .catch((e) => {
            setError(e);
            setIsDeleting(false);
          });
      }}
      deleting={isDeleting}
      error={error}
      deleteName={hardwareProfile.spec.displayName}
    >
      <Stack hasGutter>
        <StackItem>
          This action cannot be undone. Workloads already deployed using this profile will not be
          affected by this action.
        </StackItem>
        {migrationAction && (
          <StackItem>
            <Alert
              isInline
              variant="warning"
              title="You are deleting a translated hardware profile's source."
            >
              {migrationAlertMessage(migrationAction)}
            </Alert>
          </StackItem>
        )}
      </Stack>
    </DeleteModal>
  );
};

export default DeleteHardwareProfileModal;
