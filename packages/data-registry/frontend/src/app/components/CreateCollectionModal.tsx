import React from 'react';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  TextInput,
  TextArea,
  Alert,
} from '@patternfly/react-core';
import { createCollection } from '~/app/api/dataRegistry';

type CreateCollectionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  project: string;
  onCreated: () => void;
};

const COLLECTION_NAME_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;

const CreateCollectionModal: React.FC<CreateCollectionModalProps> = ({
  isOpen,
  onClose,
  project,
  onCreated,
}) => {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');

  const nameValidationError = React.useMemo(() => {
    const trimmed = name.trim();
    if (!trimmed) {
      return '';
    }
    if (trimmed.length > 63) {
      return 'Name must be 63 characters or fewer.';
    }
    if (!COLLECTION_NAME_REGEX.test(trimmed)) {
      return 'Name must contain only lowercase letters, numbers, and hyphens.';
    }
    return '';
  }, [name]);

  const handleSubmit = React.useCallback(async () => {
    if (!name.trim()) {
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      await createCollection(project, {
        namespace: [name.trim()],
        properties: description ? { description } : undefined,
      });
      setName('');
      setDescription('');
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create collection');
    } finally {
      setIsSubmitting(false);
    }
  }, [name, description, project, onCreated, onClose]);

  const handleClose = React.useCallback(() => {
    setName('');
    setDescription('');
    setError('');
    onClose();
  }, [onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      variant="small"
      data-testid="create-collection-modal"
    >
      <ModalHeader title="Create collection" />
      <ModalBody>
        {error ? (
          <Alert variant="danger" isInline title="Error creating collection">
            {error}
          </Alert>
        ) : null}
        <Form>
          <FormGroup label="Name" isRequired fieldId="collection-name">
            <TextInput
              id="collection-name"
              value={name}
              onChange={(_event, value) => setName(value)}
              isRequired
              validated={nameValidationError ? 'error' : 'default'}
              data-testid="collection-name-input"
            />
            {nameValidationError ? (
              <FormHelperText>
                <HelperText>
                  <HelperTextItem variant="error">{nameValidationError}</HelperTextItem>
                </HelperText>
              </FormHelperText>
            ) : null}
          </FormGroup>
          <FormGroup label="Description" fieldId="collection-description">
            <TextArea
              id="collection-description"
              value={description}
              onChange={(_event, value) => setDescription(value)}
              data-testid="collection-description-input"
            />
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={handleSubmit}
          isDisabled={!name.trim() || !!nameValidationError || isSubmitting}
          isLoading={isSubmitting}
          data-testid="create-collection-submit"
        >
          Create
        </Button>
        <Button variant="link" onClick={handleClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default CreateCollectionModal;
