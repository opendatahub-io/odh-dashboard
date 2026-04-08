import * as React from 'react';
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from '@patternfly/react-core';

type ConfirmationDisplayConfig = {
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

type ConfirmationConfig = ConfirmationDisplayConfig & {
  onConfirmTracking?: () => void;
  onCancelTracking?: () => void;
  forceConfirm?: boolean;
};

type UseConfirmationReturn = {
  confirm: (onConfirm: () => void, config?: ConfirmationConfig) => void;
  modal: React.ReactNode;
};

const DEFAULT_CONFIG: Required<ConfirmationDisplayConfig> = {
  title: 'Discard unsaved changes?',
  message: 'You have unsaved changes that will be lost. Do you want to continue?',
  confirmLabel: 'Discard',
  cancelLabel: 'Cancel',
};

export function useConfirmation(hasUnsavedChanges: boolean): UseConfirmationReturn {
  const [isOpen, setIsOpen] = React.useState(false);
  const [config, setConfig] = React.useState<Required<ConfirmationDisplayConfig>>(DEFAULT_CONFIG);
  const pendingActionRef = React.useRef<(() => void) | null>(null);
  const trackingRef = React.useRef<{
    onConfirmTracking?: () => void;
    onCancelTracking?: () => void;
  }>({});

  const confirm = React.useCallback(
    (onConfirm: () => void, customConfig?: ConfirmationConfig) => {
      if (!hasUnsavedChanges && !customConfig?.forceConfirm) {
        onConfirm();
        return;
      }
      pendingActionRef.current = onConfirm;
      trackingRef.current = {
        onConfirmTracking: customConfig?.onConfirmTracking,
        onCancelTracking: customConfig?.onCancelTracking,
      };
      setConfig({ ...DEFAULT_CONFIG, ...customConfig });
      setIsOpen(true);
    },
    [hasUnsavedChanges],
  );

  const handleConfirm = React.useCallback(() => {
    setIsOpen(false);
    pendingActionRef.current?.();
    pendingActionRef.current = null;
    trackingRef.current.onConfirmTracking?.();
    trackingRef.current = {};
  }, []);

  const handleCancel = React.useCallback(() => {
    setIsOpen(false);
    pendingActionRef.current = null;
    trackingRef.current.onCancelTracking?.();
    trackingRef.current = {};
  }, []);

  const modal = (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      variant="small"
      aria-label={config.title}
      data-testid="confirmation-modal"
    >
      <ModalHeader title={config.title} titleIconVariant="warning" />
      <ModalBody>{config.message}</ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={handleConfirm} data-testid="confirmation-modal-confirm">
          {config.confirmLabel}
        </Button>
        <Button variant="link" onClick={handleCancel} data-testid="confirmation-modal-cancel">
          {config.cancelLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );

  return { confirm, modal };
}
