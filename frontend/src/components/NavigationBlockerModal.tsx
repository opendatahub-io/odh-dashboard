import * as React from 'react';
import { useBlocker, Location } from 'react-router-dom';
import ContentModal from '#~/components/modals/ContentModal';

interface NavigationBlockerModalProps {
  hasUnsavedChanges: boolean;
  onDiscardEditsClick?: () => void;
}

/**
 * A modal that warns users they have unsaved changes when they try to navigate away.
 * Uses React Router's useBlocker hook to detect navigation attempts.
 */
const NavigationBlockerModal: React.FC<NavigationBlockerModalProps> = ({
  hasUnsavedChanges,
  onDiscardEditsClick,
}) => {
  const [showModal, setShowModal] = React.useState(false);

  const proceedRef = React.useRef<() => void>();
  const resetRef = React.useRef<() => void>();
  const handlingRef = React.useRef(false);

  const blocker = useBlocker(
    React.useCallback(
      ({ currentLocation, nextLocation }: { currentLocation: Location; nextLocation: Location }) =>
        hasUnsavedChanges &&
        currentLocation.pathname !== nextLocation.pathname &&
        !handlingRef.current,
      [hasUnsavedChanges],
    ),
  );

  React.useEffect(() => {
    if (!hasUnsavedChanges && showModal && proceedRef.current) {
      handlingRef.current = true;
      proceedRef.current();
      setShowModal(false);
    }
  }, [hasUnsavedChanges, showModal]);

  React.useEffect(() => {
    switch (blocker.state) {
      case 'blocked':
        proceedRef.current = blocker.proceed;
        resetRef.current = blocker.reset;
        setShowModal(true);
        break;
      case 'proceeding':
        handlingRef.current = true;
        setShowModal(false);
        break;
      default:
        handlingRef.current = false;
    }
  }, [blocker]);

  const handleConfirm = () => {
    handlingRef.current = true;
    onDiscardEditsClick?.();
    setShowModal(false);
    proceedRef.current?.();
  };

  const handleCancel = () => {
    setShowModal(false);
    resetRef.current?.();
    setTimeout(() => {
      handlingRef.current = false;
    }, 100);
  };

  if (!showModal) {
    return null;
  }

  return (
    <ContentModal
      title="Discard unsaved changes?"
      onClose={handleCancel}
      variant="small"
      dataTestId="navigation-blocker-modal"
      contents="One or more of your changes on this page are not saved yet. Discard your changes and leave this page, or cancel to continue editing."
      buttonActions={[
        {
          label: 'Discard',
          onClick: handleConfirm,
          variant: 'primary',
          dataTestId: 'confirm-discard-changes',
        },
        {
          label: 'Cancel',
          onClick: handleCancel,
          variant: 'link',
          dataTestId: 'cancel-discard-changes',
        },
      ]}
    />
  );
};

export default NavigationBlockerModal;
