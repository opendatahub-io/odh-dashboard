import React from 'react';
import DashboardModalFooter from '@odh-dashboard/ui-core/components/DashboardModalFooter';
import {
  Alert,
  Form,
  FormGroup,
  FormSelect,
  FormSelectOption,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { isConflictError, isMissingRouteError, moveAsset } from '~/app/api/dataRegistry';

type MoveAssetModalProps = {
  isOpen: boolean;
  project: string;
  assetName: string;
  sourceCollection: string;
  collections: string[];
  onClose: () => void;
  onMoved: (destinationCollection: string) => void;
};

const MoveAssetModal: React.FC<MoveAssetModalProps> = ({
  isOpen,
  project,
  assetName,
  sourceCollection,
  collections,
  onClose,
  onMoved,
}) => {
  const [destination, setDestination] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');

  const destinations = React.useMemo(
    () => collections.filter((name) => name && name !== sourceCollection),
    [collections, sourceCollection],
  );

  React.useEffect(() => {
    if (isOpen) {
      setDestination('');
      setError('');
      setIsSubmitting(false);
    }
  }, [isOpen, assetName, sourceCollection]);

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  const handleMove = async () => {
    if (!destination) {
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      await moveAsset(project, sourceCollection, assetName, destination);
      onMoved(destination);
    } catch (err) {
      if (isConflictError(err)) {
        setError(
          `An asset named "${assetName}" already exists in "${destination}". The asset was not moved.`,
        );
      } else if (isMissingRouteError(err)) {
        setError('This registry does not support moving assets yet. Nothing was changed.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to move asset');
      }
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} variant="small" data-testid="move-asset-modal">
      <ModalHeader title={`Move ${assetName}`} />
      <ModalBody>
        <Stack hasGutter>
          {error ? (
            <StackItem>
              <Alert variant="danger" isInline title="Move failed">
                {error}
              </Alert>
            </StackItem>
          ) : null}
          <StackItem>
            <Alert variant="info" isInline title="What move keeps">
              The asset keeps its name, description, labels, connection, schema, and history. It
              leaves {sourceCollection} and appears in the collection you choose. If that collection
              already has this name, nothing is changed.
            </Alert>
          </StackItem>
          {destinations.length === 0 ? (
            <StackItem>
              <Alert variant="warning" isInline title="No other collection">
                Create another collection before moving this asset.
              </Alert>
            </StackItem>
          ) : (
            <StackItem>
              <Form>
                <FormGroup label="Destination collection" isRequired>
                  <FormSelect
                    value={destination}
                    onChange={(_event, value) => setDestination(value)}
                    aria-label="Destination collection"
                    isDisabled={isSubmitting}
                    data-testid="move-asset-destination"
                  >
                    <FormSelectOption label="Select a collection" value="" isDisabled />
                    {destinations.map((name) => (
                      <FormSelectOption key={name} value={name} label={name} />
                    ))}
                  </FormSelect>
                </FormGroup>
              </Form>
            </StackItem>
          )}
        </Stack>
      </ModalBody>
      <ModalFooter>
        <DashboardModalFooter
          submitLabel="Move"
          onSubmit={handleMove}
          onCancel={handleClose}
          isSubmitDisabled={!destination || isSubmitting || destinations.length === 0}
          isSubmitLoading={isSubmitting}
          submitButtonTestId="confirm-move-button"
        />
      </ModalFooter>
    </Modal>
  );
};

export default MoveAssetModal;
