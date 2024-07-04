import * as React from 'react';
import { Modal, ModalProps } from '@patternfly/react-core';
import { fireTrackingEvent } from '~/concepts/analyticsTracking/segmentIOUtils';
import {
  FormTrackingEventProperties,
  TrackingOutcome,
} from '~/concepts/analyticsTracking/trackingProperties';

export type TrackedModalProps = {
  children?: React.ReactNode;
  actions?: any;
  title?: string;
  isOpen?: boolean;
  onClose: (modalCancelled: boolean, submitSuccess?: boolean, error?: string) => void;
  titleIconVariant?: ModalProps['titleIconVariant'];
  variant?: ModalProps['variant'];
  trackingEventName: string;
  testId?: string;
};

const TrackedModal: React.FC<TrackedModalProps> = ({
  children,
  actions,
  title,
  isOpen,
  onClose,
  testId,
  titleIconVariant,
  variant,
  trackingEventName,
}) => {
  const onBeforeClose = (cancelled: boolean, success?: boolean, error?: string) => {
    const props: FormTrackingEventProperties = {
      outcome: cancelled ? TrackingOutcome.cancel : TrackingOutcome.submit,
      success,
      error,
    };
    fireTrackingEvent(trackingEventName, props);
    onClose(cancelled, success, error);
  };

  return (
    <Modal
      title={title}
      titleIconVariant={titleIconVariant}
      isOpen={isOpen}
      onClose={() => onBeforeClose(true)}
      actions={actions}
      variant={variant}
      data-testid={testId}
    >
      <div>{children}</div>
    </Modal>
  );
};

export default TrackedModal;
