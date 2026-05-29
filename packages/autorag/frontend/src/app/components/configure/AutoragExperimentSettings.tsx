import {
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
} from '@patternfly/react-core';
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { ConfigureSchema, EXPERIMENT_SETTINGS_FIELDS } from '~/app/schemas/configure.schema';
import AutoragExperimentSettingsModelSelection from './AutoragExperimentSettingsModelSelection';

type AutoragExperimentSettingsProps = {
  isOpen: boolean;
  onClose: () => void;
  revertChanges: () => void;
};

const AutoragExperimentSettings: React.FC<AutoragExperimentSettingsProps> = ({
  isOpen,
  onClose,
  revertChanges,
}) => {
  const {
    formState: { isDirty, errors },
  } = useFormContext<ConfigureSchema>();

  const hasFieldErrors = EXPERIMENT_SETTINGS_FIELDS.some((field) => errors[field]);
  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen={isOpen}
      onClose={() => {
        revertChanges();
        onClose();
      }}
      data-testid="experiment-settings-modal"
    >
      <ModalHeader title="Model configuration" />
      <ModalBody>
        <AutoragExperimentSettingsModelSelection />
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={onClose}
          isDisabled={!isDirty || hasFieldErrors}
          data-testid="experiment-settings-save"
        >
          Save
        </Button>
        <Button
          variant="link"
          onClick={() => {
            revertChanges();
            onClose();
          }}
          data-testid="experiment-settings-cancel"
        >
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default AutoragExperimentSettings;
