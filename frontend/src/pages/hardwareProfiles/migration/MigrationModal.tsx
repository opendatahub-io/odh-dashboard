import * as React from 'react';
import {
  Alert,
  Button,
  List,
  ListItem,
  Stack,
  StackItem,
  Modal,
  ModalBody,
  ModalHeader,
  ModalFooter,
} from '@patternfly/react-core';
import { getHardwareProfileDisplayName } from '#~/pages/hardwareProfiles/utils.ts';
import { MigrationAction, MigrationSourceType } from './types';
import { MIGRATION_SOURCE_TYPE_LABELS } from './const';

type MigrationModalProps = {
  onClose: () => void;
  onMigrate: () => Promise<unknown>;
  migrationAction: MigrationAction;
};

const MigrationModal: React.FC<MigrationModalProps> = ({ onClose, onMigrate, migrationAction }) => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>(undefined);
  const migrationNameSanitized = React.useMemo(
    () => migrationAction.source.label.trim().replace(/\s+/g, ' '),
    [migrationAction],
  );

  const handleMigrate = () => {
    setLoading(true);
    onMigrate()
      .then(() => {
        setLoading(false);
        onClose();
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  };

  return (
    <Modal isOpen onClose={onClose} variant="small" data-testid="migration-modal">
      <ModalHeader title="Migrate hardware profile" titleIconVariant="warning" />
      <ModalBody>
        <Stack hasGutter>
          <StackItem>
            <Stack hasGutter>
              <StackItem>
                You are migrating a legacy hardware profile that was created from the{' '}
                <strong>{migrationAction.source.label}</strong>{' '}
                {MIGRATION_SOURCE_TYPE_LABELS[migrationAction.source.type]}
                {migrationAction.source.type !== MigrationSourceType.ACCELERATOR_PROFILE
                  ? ' in the ODH dashboard config.'
                  : '.'}
              </StackItem>
              <StackItem>
                Migrating this profile creates a matching resource in Kubernetes, and deletes its
                source resource. Deployed workloads using this legacy profile will be unaffected by
                the migration.
              </StackItem>
              <StackItem>
                This migration will make the following changes:
                <List>
                  <ListItem>
                    A new hardware profile will be created:{' '}
                    <strong>
                      {`${getHardwareProfileDisplayName(migrationAction.targetProfile)} (${
                        migrationAction.targetProfile.metadata.name
                      })`}
                    </strong>
                  </ListItem>
                  {migrationAction.dependentProfiles.length > 0 && (
                    <ListItem>
                      Legacy hardware profiles dependent on the source resource will be created:{' '}
                      <strong>
                        {migrationAction.dependentProfiles
                          .map(
                            (profile) =>
                              `${getHardwareProfileDisplayName(profile)} (${
                                profile.metadata.name
                              })`,
                          )
                          .join(', ')}
                      </strong>
                    </ListItem>
                  )}
                  <ListItem>
                    The source {MIGRATION_SOURCE_TYPE_LABELS[migrationAction.source.type]} will be
                    deleted
                  </ListItem>
                </List>
              </StackItem>
            </Stack>
          </StackItem>

          {error && (
            <StackItem>
              <Alert
                data-testid="migration-modal-error-message-alert"
                title={`Error migrating ${migrationNameSanitized}`}
                isInline
                variant="danger"
              >
                {error.message}
              </Alert>
            </StackItem>
          )}
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button
          key="delete-button"
          variant="danger"
          isLoading={loading}
          isDisabled={loading}
          onClick={handleMigrate}
        >
          Migrate
        </Button>
        <Button key="cancel-button" variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default MigrationModal;
