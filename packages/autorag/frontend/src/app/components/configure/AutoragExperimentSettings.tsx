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
import { useRunTriggeredTracking } from '~/app/context/RunTriggeredTrackingContext';
import { fireAutoragModelsSelected, TrackingOutcome } from '~/app/utilities/tracking';
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
    getValues,
    formState: { isDirty, errors },
  } = useFormContext<ConfigureSchema>();
  const { onModelsConfigured } = useRunTriggeredTracking();

  const hasFieldErrors = EXPERIMENT_SETTINGS_FIELDS.some((field) => errors[field]);

  const fireModelsSelected = (outcome: TrackingOutcome) => {
    const { generation_models: foundationModels, embedding_models: embeddingModels } = getValues();
    fireAutoragModelsSelected({
      countOfFoundationModels: foundationModels.length,
      countOfEmbeddingModels: embeddingModels.length,
      outcome,
      success: true,
    });
    // Only a completed (submit) selection counts toward "AutoRAG Flow Exited" funnel progress —
    // a cancelled modal reverts to the prior selection, so it isn't a real milestone.
    if (outcome === TrackingOutcome.submit) {
      onModelsConfigured();
    }
  };

  const handleSaveClick = () => {
    const { generation_models: foundationModels, embedding_models: embeddingModels } = getValues();
    // The Save button's `isDisabled` below is derived from formState.errors, which react-hook-form
    // updates asynchronously (via a microtask) relative to the field values themselves, even for a
    // synchronous zod resolver. Re-check the live values here so a click landing in that gap can't
    // record a false "success" configuration event or close the modal with an actually-empty
    // (invalid) model selection — Cancel remains unaffected, since discarding an invalid selection
    // is always safe.
    if (foundationModels.length === 0 || embeddingModels.length === 0) {
      return;
    }
    fireModelsSelected(TrackingOutcome.submit);
    onClose();
  };

  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen={isOpen}
      onClose={() => {
        fireModelsSelected(TrackingOutcome.cancel);
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
          onClick={handleSaveClick}
          isDisabled={!isDirty || hasFieldErrors}
          data-testid="experiment-settings-save"
        >
          Save
        </Button>
        <Button
          variant="link"
          onClick={() => {
            fireModelsSelected(TrackingOutcome.cancel);
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
