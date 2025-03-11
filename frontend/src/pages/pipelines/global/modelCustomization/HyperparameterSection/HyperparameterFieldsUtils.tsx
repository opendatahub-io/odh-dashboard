import * as React from 'react';
import HyperparameterLongNumberField from '~/concepts/pipelines/content/modelCustomizationForm/hyperparameterFields/HyperparameterLongNumberField';
import HyperparameterEvaluationField from '~/concepts/pipelines/content/modelCustomizationForm/hyperparameterFields/HyperparameterEvaluationField';
import { HyperparameterDisplayFields } from '~/pages/pipelines/global/modelCustomization/const';
import { RuntimeConfigParamValue } from '~/concepts/pipelines/kfTypes';

type RenderFieldProps = (
  label: string,
  field: HyperparameterDisplayFields,
  isRequired: boolean,
  description: string | undefined,
  onChange: (
    hyperparameter: HyperparameterDisplayFields,
    hyperparameterValue?: string | number,
  ) => void,
  value?: RuntimeConfigParamValue,
) => React.ReactNode;

export const HYPERPARAMETER_MAP: Record<
  HyperparameterDisplayFields | string,
  {
    label: string;
    renderField?: RenderFieldProps;
  }
> = {
  [HyperparameterDisplayFields.SDG_SCALE_FACTOR]: {
    label: 'SDG scale factor',
  },
  [HyperparameterDisplayFields.MAXIMUM_TOKENS_PER_ACCELERATOR]: {
    label: 'Maximum tokens per accelerator',
  },
  [HyperparameterDisplayFields.SDG_SAMPLE_SIZE]: {
    label: 'SDG skill recipe sample size',
  },
  [HyperparameterDisplayFields.TRAINING_WORKERS]: {
    label: 'Training workers',
  },
  [HyperparameterDisplayFields.TRAIN_NUM_EPOCHS_PHASE_1]: {
    label: 'Epochs (phase 1)',
  },
  [HyperparameterDisplayFields.TRAIN_NUM_EPOCHS_PHASE_2]: {
    label: 'Epochs (phase 2)',
  },
  [HyperparameterDisplayFields.BATCH_SIZE_PHASE_1]: {
    label: 'Batch size (phase 1)',
  },
  [HyperparameterDisplayFields.BATCH_SIZE_PHASE_2]: {
    label: 'Batch size (phase 2)',
  },
  [HyperparameterDisplayFields.WARMUP_STEPS_PHASE_1]: {
    label: 'Warmup steps (phase 1)',
  },
  [HyperparameterDisplayFields.WARMUP_STEPS_PHASE_2]: {
    label: 'Warmup steps (phase 2)',
  },
  [HyperparameterDisplayFields.MAXIMUM_BATCH_LENGTH]: {
    label: 'Maximum batch length',
  },
  [HyperparameterDisplayFields.TRAINING_SEED]: {
    label: 'Training seed',
  },
  [HyperparameterDisplayFields.QUESTION_ANSWER_PAIRS]: {
    label: 'Question-answer pairs',
  },
  [HyperparameterDisplayFields.LEARNING_RATE_PHASE_1]: {
    label: 'Learning rate (phase 1)',
    renderField: (
      label,
      field,
      isRequired,
      description,
      onChange: (
        hyperparameter: HyperparameterDisplayFields,
        hyperparameterValue: number | undefined,
      ) => void,
      value,
    ): React.ReactNode => (
      <HyperparameterLongNumberField
        key={label}
        label={label}
        value={typeof value === 'number' ? value : undefined}
        field={field}
        isRequired={isRequired}
        description={description}
        onChange={onChange}
      />
    ),
  },
  [HyperparameterDisplayFields.LEARNING_RATE_PHASE_2]: {
    label: 'Learning rate (phase 2)',
    renderField: (
      label,
      field,
      isRequired,
      description,
      onChange: (
        hyperparameter: HyperparameterDisplayFields,
        hyperparameterValue: number | undefined,
      ) => void,
      value,
    ): React.ReactNode => (
      <HyperparameterLongNumberField
        key={label}
        label={label}
        value={typeof value === 'number' ? value : undefined}
        field={field}
        description={description}
        isRequired={isRequired}
        onChange={onChange}
      />
    ),
  },
  [HyperparameterDisplayFields.EVALUATION_WORKERS]: {
    label: 'Evaluation workers',
    renderField: (
      label,
      field,
      isRequired,
      description,
      onChange: (
        hyperparameter: HyperparameterDisplayFields,
        hyperparameterValue: string | number,
      ) => void,
      value,
    ): React.ReactNode => (
      <HyperparameterEvaluationField
        key={label}
        label={label}
        value={typeof value === 'number' || typeof value === 'string' ? value : undefined}
        field={field}
        isRequired={isRequired}
        description={description}
        onChange={onChange}
      />
    ),
  },
  [HyperparameterDisplayFields.EVALUATION_BATCH_SIZE]: {
    label: 'Evaluation batch size',
    renderField: (
      label,
      field,
      isRequired,
      description,
      onChange: (
        hyperparameter: HyperparameterDisplayFields,
        hyperparameterValue: string | number,
      ) => void,
      value,
    ): React.ReactNode => (
      <HyperparameterEvaluationField
        key={label}
        label={label}
        value={typeof value === 'number' || typeof value === 'string' ? value : undefined}
        field={field}
        isRequired={isRequired}
        description={description}
        onChange={onChange}
      />
    ),
  },
};
