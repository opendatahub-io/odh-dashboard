import * as React from 'react';
import {
  Alert,
  Button,
  Flex,
  FlexItem,
  List,
  ListItem,
  Stack,
  StackItem,
  TextInput,
} from '@patternfly/react-core';
import { Modal } from '@patternfly/react-core/deprecated';
import { createHardwareProfileFromResource } from '~/api';
import { MigrationAction, MigrationSourceType } from './types';

type MigrationModalProps = {
  onClose: () => void;
  migrationAction: MigrationAction;
};

const MigrationModal: React.FC<MigrationModalProps> = ({ onClose, migrationAction }) => {
  const [value, setValue] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>(undefined);
  const migrationNameSanitized = React.useMemo(
    () => migrationAction.source.label.trim().replace(/\s+/g, ' '),
    [migrationAction],
  );

  const onMigrate = () => {
    setLoading(true);
    const getMigrationPromises = (dryRun: boolean) => [
      migrationAction.deleteSourceResource({ dryRun }),
      migrationAction.targetProfiles.map((profile) =>
        createHardwareProfileFromResource(profile, { dryRun }),
      ),
    ];
    Promise.all(getMigrationPromises(true))
      .then(() => Promise.all(getMigrationPromises(false)))
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
    <Modal
      title="Migrate hardware profile"
      titleIconVariant="warning"
      isOpen
      onClose={onClose}
      actions={[
        <Button
          key="delete-button"
          variant="danger"
          isLoading={loading}
          isDisabled={loading || value.trim() !== migrationNameSanitized}
          onClick={onMigrate}
        >
          Migrate
        </Button>,
        <Button key="cancel-button" variant="link" onClick={onClose}>
          Cancel
        </Button>,
      ]}
      variant="small"
      data-testid="migration-modal"
    >
      <Stack hasGutter>
        <StackItem>
          <Stack hasGutter>
            <StackItem>
              This action will migrate the{' '}
              {migrationAction.source.type === MigrationSourceType.ACCELERATOR_PROFILE
                ? 'accelerator profile'
                : migrationAction.source.type === MigrationSourceType.SERVING_CONTAINER_SIZE
                ? 'model serving container size'
                : 'notebook container size'}
              {', '}
              <strong>{migrationAction.source.label}</strong>, to a hardware profile.
            </StackItem>
            <StackItem>
              The following changes will occur:
              <List>
                <ListItem>
                  {migrationAction.targetProfiles.length === 1 ? (
                    'A new hardware profile will be created'
                  ) : (
                    <>
                      Multiple hardware profiles will be created:
                      <strong>
                        {' '}
                        {migrationAction.targetProfiles
                          .map((profile) => profile.metadata.name)
                          .join(', ')}
                      </strong>
                    </>
                  )}
                </ListItem>
                <ListItem>
                  The source{' '}
                  {migrationAction.source.type === MigrationSourceType.ACCELERATOR_PROFILE
                    ? 'accelerator profile'
                    : migrationAction.source.type === MigrationSourceType.SERVING_CONTAINER_SIZE
                    ? 'model serving container size'
                    : 'notebook container size'}{' '}
                  will be deleted
                </ListItem>
              </List>
            </StackItem>
            <StackItem>This action cannot be undone.</StackItem>
          </Stack>
        </StackItem>
        <StackItem>
          <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
            <FlexItem>
              Type <strong>{migrationNameSanitized}</strong> to confirm migration:
            </FlexItem>

            <TextInput
              id="migration-modal-input"
              data-testid="migration-modal-input"
              aria-label="Migration modal input"
              value={value}
              onChange={(_e, newValue) => setValue(newValue)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && value.trim() === migrationNameSanitized) {
                  onClose();
                }
              }}
            />
          </Flex>
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
    </Modal>
  );
};

export default MigrationModal;
