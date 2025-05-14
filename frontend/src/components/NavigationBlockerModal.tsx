import * as React from 'react';
import { useBlocker, Location } from 'react-router-dom';
import { Button } from '@patternfly/react-core';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';

interface NavigationBlockerModalProps {
  hasUnsavedChanges: boolean;
}

/**
 * A modal that warns users they have unsaved changes when they try to navigate away.
 * Uses React Router's useBlocker hook to detect navigation attempts.
 */
const NavigationBlockerModal: React.FC<NavigationBlockerModalProps> = ({ hasUnsavedChanges }) => {
  const [showModal, setShowModal] = React.useState(false);
  const [callbacks, setCallbacks] = React.useState<{
    proceed?: () => void;
    reset?: () => void;
  }>({});

  const blocker = useBlocker(
    React.useCallback(
      ({ currentLocation, nextLocation }: { currentLocation: Location; nextLocation: Location }) =>
        hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname,
      [hasUnsavedChanges],
    ),
  );

  React.useEffect(() => {
    if (blocker.state === 'blocked') {
      setShowModal(true);
      setCallbacks({
        proceed: blocker.proceed,
        reset: blocker.reset,
      });
    }
  }, [blocker]);

  const handleConfirm = React.useCallback(() => {
    setShowModal(false);
    if (callbacks.proceed) {
      callbacks.proceed();
    }
  }, [callbacks]);

  const handleCancel = React.useCallback(() => {
    setShowModal(false);
    if (callbacks.reset) {
      callbacks.reset();
    }
  }, [callbacks]);

  if (!showModal) {
    return null;
  }

  return (
    <Modal
      variant={ModalVariant.small}
      title="Discard unsaved changes?"
      isOpen
      onClose={handleCancel}
      actions={[
        <Button
          key="confirm"
          variant="primary"
          onClick={handleConfirm}
          data-testid="confirm-discard-changes"
        >
          Discard
        </Button>,
        <Button
          key="cancel"
          variant="link"
          onClick={handleCancel}
          data-testid="cancel-discard-changes"
        >
          Cancel
        </Button>,
      ]}
    >
      One or more of your changes on this page are not saved yet. Discard your changes and leave
      this page, or cancel to continue editing.
    </Modal>
  );
};

export default NavigationBlockerModal;
