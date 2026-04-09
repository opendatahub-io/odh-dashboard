import {
  Button,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  NumberInput,
  Title,
} from '@patternfly/react-core';
import React from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import {
  ConfigureSchema,
  EXPERIMENT_SETTINGS_FIELDS,
  MAX_TOP_N_TABULAR,
  MAX_TOP_N_TIMESERIES,
  MIN_TOP_N,
} from '~/app/schemas/configure.schema';
import { TASK_TYPE_TIMESERIES } from '~/app/utilities/const';

type AutomlExperimentSettingsProps = {
  isOpen: boolean;
  onClose: () => void;
  revertChanges: () => void;
  saveChanges: () => void;
};

const AutomlExperimentSettings: React.FC<AutomlExperimentSettingsProps> = ({
  isOpen,
  onClose,
  revertChanges,
  saveChanges,
}) => {
  const {
    control,
    formState: { isDirty, errors },
  } = useFormContext<ConfigureSchema>();

  const taskType = useWatch({ control, name: 'task_type' });
  const maxTopN = taskType === TASK_TYPE_TIMESERIES ? MAX_TOP_N_TIMESERIES : MAX_TOP_N_TABULAR;

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
      <ModalHeader title="Experiment settings" />
      <ModalBody>
        <Title headingLevel="h6" className="pf-v6-u-mb-md">
          Top models to consider
        </Title>
        <Controller
          control={control}
          name="top_n"
          render={({ field, fieldState }) => (
            <>
              <NumberInput
                id="top-n-input"
                value={field.value}
                min={MIN_TOP_N}
                max={maxTopN}
                validated={fieldState.error ? 'error' : 'default'}
                onMinus={() => field.onChange(field.value - 1)}
                onPlus={() => field.onChange(field.value + 1)}
                onChange={(event: React.FormEvent<HTMLInputElement>) => {
                  const value = parseInt(event.currentTarget.value, 10);
                  if (!Number.isNaN(value)) {
                    field.onChange(value);
                  }
                }}
                data-testid="top-n-input"
              />
              {fieldState.error && (
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem variant="error">{fieldState.error.message}</HelperTextItem>
                  </HelperText>
                </FormHelperText>
              )}
            </>
          )}
        />
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={saveChanges}
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

export default AutomlExperimentSettings;
