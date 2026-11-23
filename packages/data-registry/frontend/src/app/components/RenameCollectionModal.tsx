import React from 'react';
import DashboardModalFooter from '@odh-dashboard/ui-core/components/DashboardModalFooter';
import {
  Alert,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Stack,
  StackItem,
  TextInput,
} from '@patternfly/react-core';
import { isConflictError, isMissingRouteError, renameCollection } from '~/app/api/dataRegistry';
import { collectionRenameError } from '~/app/utilities/collectionUtils';

type RenameCollectionModalProps = {
  isOpen: boolean;
  project: string;
  collectionName: string;
  onClose: () => void;
  onRenamed: (previousName: string, nextName: string) => void;
};

const RenameCollectionModal: React.FC<RenameCollectionModalProps> = ({
  isOpen,
  project,
  collectionName,
  onClose,
  onRenamed,
}) => {
  const [nextName, setNextName] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (isOpen) {
      setNextName('');
      setError('');
      setIsSubmitting(false);
    }
  }, [isOpen, collectionName]);

  const validationError = collectionRenameError(nextName, collectionName);

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  const handleRename = async () => {
    const trimmed = nextName.trim();
    if (!trimmed || validationError) {
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      await renameCollection(project, collectionName, trimmed);
      onRenamed(collectionName, trimmed);
    } catch (err) {
      if (isConflictError(err)) {
        setError(`Collection "${trimmed}" already exists. The name was not changed.`);
      } else if (isMissingRouteError(err)) {
        setError('This registry does not support rename yet. Nothing was changed.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to rename collection');
      }
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      variant="small"
      data-testid="rename-collection-modal"
    >
      <ModalHeader title="Rename collection" />
      <ModalBody>
        <Stack hasGutter>
          {error ? (
            <StackItem>
              <Alert variant="danger" isInline title="Rename failed">
                {error}
              </Alert>
            </StackItem>
          ) : null}
          <StackItem>
            <Alert variant="info" isInline title="What rename changes">
              The collection name is updated everywhere it is shown. Assets, labels, connections,
              and permissions stay with the collection. The collection address changes to the new
              name.
            </Alert>
          </StackItem>
          <StackItem>
            <Form>
              <FormGroup label="Current name">
                <TextInput value={collectionName} aria-label="Current collection name" readOnly />
              </FormGroup>
              <FormGroup label="New name" isRequired>
                <TextInput
                  value={nextName}
                  onChange={(_event, value) => setNextName(value)}
                  aria-label="New collection name"
                  validated={validationError ? 'error' : 'default'}
                  isDisabled={isSubmitting}
                  data-testid="rename-collection-name-input"
                />
                {validationError ? (
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem variant="error">{validationError}</HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                ) : null}
              </FormGroup>
            </Form>
          </StackItem>
        </Stack>
      </ModalBody>
      <ModalFooter>
        <DashboardModalFooter
          submitLabel="Rename"
          onSubmit={handleRename}
          onCancel={handleClose}
          isSubmitDisabled={!nextName.trim() || !!validationError || isSubmitting}
          isSubmitLoading={isSubmitting}
          submitButtonTestId="confirm-rename-button"
        />
      </ModalFooter>
    </Modal>
  );
};

export default RenameCollectionModal;
