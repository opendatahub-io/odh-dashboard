import {
  Button,
  FormGroup,
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
import { ConfigureSchema } from '~/app/schemas/configure.schema';
import ExperimentSettingsModelSelection from './components/ExperimentSettingsModelSelection';

const OPTIMIZATION_METRICS: {
  value: ConfigureSchema['optimization']['metric'];
  label: string;
  description: string;
}[] = [
  {
    value: 'faithfulness',
    label: 'Answer faithfulness',
    description: 'How factually grounded the answer is in the retrieved context.',
  },
  {
    value: 'answer_correctness',
    label: 'Answer correctness',
    description: 'How correct the generated answer is compared to the ground truth.',
  },
  {
    value: 'context_correctness',
    label: 'Context correctness',
    description: 'How precisely the retrieval step identifies relevant chunks.',
  },
];

const MIN_RAG_PATTERNS = 1;
const MAX_RAG_PATTERNS = 10;

type ExperimentSettingsProps = {
  isOpen: boolean;
  onClose: () => void;
  revertChanges: () => void;
  saveChanges: () => void;
};

const ExperimentSettings: React.FC<ExperimentSettingsProps> = ({
  isOpen,
  onClose,
  revertChanges,
  saveChanges,
}) => {
  const { control } = useFormContext<ConfigureSchema>();

  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen={isOpen}
      onClose={onClose}
      data-testid="experiment-settings-modal"
    >
      <ModalHeader title="Experiment settings" />
      <ModalBody>
        <Stack hasGutter>
          <StackItem>
            <ExperimentSettingsModelSelection />
          </StackItem>
          <StackItem className="pf-v6-u-mt-lg">
            <Grid hasGutter>
              <GridItem span={8}>
                <Title headingLevel="h4" className="pf-v6-u-mb-md">
                  Metric to optimize
                </Title>
                <Controller
                  control={control}
                  name="optimization.metric"
                  render={({ field }) => (
                    <Stack hasGutter>
                      {OPTIMIZATION_METRICS.map((metric) => (
                        <StackItem key={metric.value}>
                          <Radio
                            id={`metric-${metric.value}`}
                            name="optimization.metric"
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
                <Controller
                  control={control}
                  name="optimization.max_number_of_rag_patterns"
                  render={({ field, fieldState }) => (
                    <FormGroup fieldId="max-rag-patterns" label="Max RAG patterns">
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
                    </FormGroup>
                  )}
                />
              </GridItem>
            </Grid>
          </StackItem>
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={saveChanges} data-testid="experiment-settings-save">
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

export default ExperimentSettings;
