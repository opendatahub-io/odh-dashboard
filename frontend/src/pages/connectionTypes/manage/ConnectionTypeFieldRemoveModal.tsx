import * as React from 'react';
import { Modal } from '@patternfly/react-core';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';

type Props = {
  field: string;
  isSection: boolean;
  onClose: (submit: boolean) => void;
};

export const ConnectionTypeFieldRemoveModal: React.FC<Props> = ({ field, isSection, onClose }) => (
  <Modal
    isOpen
    title={isSection ? 'Remove section heading?' : 'Remove field?'}
    onClose={() => onClose(false)}
    variant="small"
    footer={
      <DashboardModalFooter
        submitLabel="Remove"
        onCancel={() => onClose(false)}
        onSubmit={() => onClose(true)}
        alertTitle=""
        isSubmitDisabled={false}
      />
    }
  >
    The <b>{field}</b>{' '}
    {isSection
      ? `section heading will be removed. Associated fields will not be removed.`
      : `field will be removed.`}
  </Modal>
);
