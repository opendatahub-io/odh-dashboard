import {
  Button,
  FormHelperText,
  Grid,
  GridItem,
  HelperText,
  HelperTextItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  NumberInput,
  Radio,
  Stack,
  StackItem,
  Title,
  Tooltip,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import {
  ConfigureSchema,
  EXPERIMENT_SETTINGS_FIELDS,
  MIN_RAG_PATTERNS,
  MAX_RAG_PATTERNS,
  RAG_METRIC_FAITHFULNESS,
  RAG_METRIC_ANSWER_CORRECTNESS,
  RAG_METRIC_CONTEXT_CORRECTNESS,
} from '~/app/schemas/configure.schema';
import AutoragExperimentSettingsModelSelection from './AutoragExperimentSettingsModelSelection';

const OPTIMIZATION_METRICS: {
  value: ConfigureSchema['optimization_metric'];
  label: string;
  description: string;
}[] = [
  {
    value: RAG_METRIC_FAITHFULNESS,
    label: 'Answer faithfulness',
    description: 'How factually grounded the answer is in the retrieved context.',
  },
  {
    value: RAG_METRIC_ANSWER_CORRECTNESS,
    label: 'Answer correctness',
    description: 'How correct the generated answer is compared to the ground truth.',
  },
  {
    value: RAG_METRIC_CONTEXT_CORRECTNESS,
    label: 'Context correctness',
    description: 'How precisely the retrieval step identifies relevant chunks.',
  },
];

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
    control,
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
      <ModalHeader title="Experiment settings" />
      <ModalBody>
        <Stack hasGutter>
          <StackItem>
            <AutoragExperimentSettingsModelSelection />
          </StackItem>
          <StackItem className="pf-v6-u-mt-lg">
            <Grid hasGutter>
              <GridItem span={8}>
                <Title headingLevel="h6" className="pf-v6-u-mb-md">
                  Metric to optimize
                  <span className="pf-v6-u-text-color-required" aria-hidden="true">
                    {' *'}
                  </span>
                </Title>
                <Controller
                  control={control}
                  name="optimization_metric"
                  render={({ field }) => (
                    <Stack hasGutter>
                      {OPTIMIZATION_METRICS.map((metric) => (
                        <StackItem key={metric.value}>
                          <Radio
                            id={`metric-${metric.value}`}
                            name="optimization_metric"
                            label={
                              <span>
                                {metric.label}
                                {'  '}
                                <Tooltip content={metric.description}>
                                  <OutlinedQuestionCircleIcon className="pf-v6-u-ml-xs" />
                                </Tooltip>
                              </span>
                            }
                            isChecked={field.value === metric.value}
                            onChange={() => field.onChange(metric.value)}
                            data-testid={`metric-radio-${metric.value}`}
                          />
                        </StackItem>
                      ))}
                    </Stack>
                  )}
                />
              </GridItem>
              <GridItem span={4}>
                <Title headingLevel="h4" className="pf-v6-u-mb-md">
                  Max RAG patterns
                </Title>
                <Controller
                  control={control}
                  name="optimization_max_rag_patterns"
                  render={({ field, fieldState }) => (
                    <>
                      <NumberInput
                        id="max-rag-patterns"
                        value={field.value}
                        min={MIN_RAG_PATTERNS}
                        max={MAX_RAG_PATTERNS}
                        validated={fieldState.error ? 'error' : 'default'}
                        onMinus={() => field.onChange(field.value - 1)}
                        onPlus={() => field.onChange(field.value + 1)}
                        onChange={(event: React.FormEvent<HTMLInputElement>) => {
                          const selectedMaxRagPatterns = parseInt(event.currentTarget.value, 10);
                          if (!Number.isNaN(selectedMaxRagPatterns)) {
                            field.onChange(selectedMaxRagPatterns);
                          }
                        }}
                        data-testid="max-rag-patterns-input"
                      />
                      {fieldState.error && (
                        <FormHelperText>
                          <HelperText>
                            <HelperTextItem variant="error">
                              {fieldState.error.message}
                            </HelperTextItem>
                          </HelperText>
                        </FormHelperText>
                      )}
                    </>
                  )}
                />
              </GridItem>
            </Grid>
          </StackItem>
        </Stack>
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
