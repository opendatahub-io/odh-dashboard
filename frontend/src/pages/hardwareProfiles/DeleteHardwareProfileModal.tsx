import React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import { deleteHardwareProfile } from '~/api';
import { HardwareProfileKind } from '~/k8sTypes';
import DeleteModal from '~/pages/projects/components/DeleteModal';
import { MigrationAction, MigrationSourceType } from './migration/types';

type DeleteHardwareProfileModalProps = {
  hardwareProfile: HardwareProfileKind;
  migrationAction?: MigrationAction;
  onClose: (deleted: boolean) => void;
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
      title={migrationAction ? 'Delete hardware profile and source?' : 'Delete hardware profile?'}
      onClose={() => onBeforeClose(false)}
      submitButtonLabel="Delete"
      deleteName={
        migrationAction
          ? `Delete ${migrationAction.targetProfiles.length + 1} and hardware profile`
          : hardwareProfile.spec.displayName
      }
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
    >
      <Stack hasGutter>
        <StackItem>
          {migrationAction ? (
            <>
              The proposed hardware profiles <b>{hardwareProfile.spec.displayName}</b>
              {migrationAction.targetProfiles.length > 0 && (
                <>
                  {' and '}
                  <b>{migrationAction.targetProfiles.join(', ')}</b>
                </>
              )}{' '}
              and their source
              {migrationAction.source.type === MigrationSourceType.ACCELERATOR_PROFILE
                ? ' accelerator profile'
                : migrationAction.source.type === MigrationSourceType.SERVING_CONTAINER_SIZE
                ? ' model serving container size'
                : ' notebook container size'}
              , {migrationAction.source.label}, will be deleted. Deployed workloads using these
              profiles will not be affected.
            </>
          ) : (
            'This action cannot be undone. Workloads already deployed using this profile will not be affected by this action.'
          )}
        </StackItem>
      </Stack>
    </DeleteModal>
  );
};

export default DeleteHardwareProfileModal;
