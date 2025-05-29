import React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import { deleteHardwareProfile } from '#~/api';
import { HardwareProfileKind } from '#~/k8sTypes';
import DeleteModal from '#~/pages/projects/components/DeleteModal';
import { MigrationAction } from './migration/types';
import { MIGRATION_SOURCE_TYPE_LABELS } from './migration/const';

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
          ? `Delete ${migrationAction.dependentProfiles.length + 2} resources` // dependent profiles + target profile + source
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
        {migrationAction && (
          <>
            <StackItem>
              The <b>{migrationAction.targetProfile.spec.displayName}</b> legacy hardware profile
              {migrationAction.dependentProfiles.length > 0 && (
                <>
                  , dependent legacy hardware profiles:{' '}
                  <b>
                    {migrationAction.dependentProfiles
                      .map((profile) => profile.spec.displayName)
                      .join(', ')}
                  </b>
                </>
              )}{' '}
              and the source {MIGRATION_SOURCE_TYPE_LABELS[migrationAction.source.type]},{' '}
              {migrationAction.source.label} will be deleted.
            </StackItem>
          </>
        )}
        <StackItem>
          Deployed workloads using{' '}
          {migrationAction && migrationAction.dependentProfiles.length > 0
            ? 'these profiles '
            : 'this profile '}
          will not be affected.
        </StackItem>
      </Stack>
    </DeleteModal>
  );
};

export default DeleteHardwareProfileModal;
