import React, { useEffect, useState } from 'react';
import { Form } from '@patternfly/react-core';
import { Modal } from '@patternfly/react-core/deprecated';
import { Toleration } from '~/types';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';
import TolerationFields from './TolerationFields';
import { EMPTY_TOLERATION } from './const';

type ManageTolerationModalProps = {
  onClose: () => void;
  initialToleration?: Toleration;
  onSave: (toleration: Toleration) => void;
};

const ManageTolerationModal: React.FC<ManageTolerationModalProps> = ({
  onClose,
  initialToleration,
  onSave,
}) => {
  const [toleration, setToleration] = useState<Toleration>(EMPTY_TOLERATION);

  const isButtonDisabled = !toleration.key;

  useEffect(() => {
    if (initialToleration) {
      setToleration(initialToleration);
    }
  }, [initialToleration]);

  const handleUpdate = (updatedToleration: Toleration) => {
    setToleration(updatedToleration);
  };

  const onBeforeClose = () => {
    setToleration(EMPTY_TOLERATION);
    onClose();
  };

  return (
    <Modal
      title={initialToleration ? 'Edit toleration' : 'Add toleration'}
      variant="medium"
      isOpen
      onClose={() => {
        onBeforeClose();
      }}
      footer={
        <DashboardModalFooter
          submitLabel={initialToleration ? 'Update' : 'Add'}
          onSubmit={() => {
            onSave(toleration);
            onBeforeClose();
          }}
          onCancel={() => onBeforeClose()}
          isSubmitDisabled={isButtonDisabled}
          alertTitle="Error saving toleration"
        />
      }
    >
      <Form>
        <TolerationFields toleration={toleration} onUpdate={handleUpdate} />
      </Form>
    </Modal>
  );
};

export default ManageTolerationModal;
