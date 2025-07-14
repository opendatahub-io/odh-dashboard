import * as React from 'react';
import { ZodIssue } from 'zod';
import { gridSpans } from '@patternfly/react-core';
import HyperparameterLongNumberField from '#~/concepts/pipelines/content/modelCustomizationForm/hyperparameterFields/HyperparameterLongNumberField';
import HyperparameterEvaluationField from '#~/concepts/pipelines/content/modelCustomizationForm/hyperparameterFields/HyperparameterEvaluationField';
import { RuntimeConfigParamValue } from '#~/concepts/pipelines/kfTypes';
import { KnownFineTuningPipelineParameters } from '#~/pages/pipelines/global/modelCustomization/const';

type RenderFieldProps = (
  label: string,
  field: string,
  isRequired: boolean,
  description: string | undefined,
  onChange: (hyperparameter: string, hyperparameterValue?: RuntimeConfigParamValue) => void,
  value?: RuntimeConfigParamValue,
  validationIssues?: ZodIssue[],
  onBlur?: () => void,
) => React.ReactNode;

const renderLongNumberField: RenderFieldProps = (
  label,
  field,
  isRequired,
  description,
  onChange: (hyperparameter: string, hyperparameterValue?: RuntimeConfigParamValue) => void,
  value,
  validationIssues,
  onBlur,
): React.ReactNode => (
  <HyperparameterLongNumberField
    key={label}
    label={label}
    value={value}
    field={field}
    description={description}
    isRequired={isRequired}
    onChange={onChange}
    validationIssues={validationIssues}
    onBlur={onBlur}
  />
);

const renderEvaluationField: RenderFieldProps = (
  label,
  field,
  isRequired,
  description,
  onChange: (hyperparameter: string, hyperparameterValue: string | number) => void,
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
);

export const HYPERPARAMETER_MAP: Record<
  string,
  { label: string; renderField?: RenderFieldProps; span?: gridSpans }
> = {
  [KnownFineTuningPipelineParameters.SDG_SCALE_FACTOR]: {
    label: 'SDG scale factor',
  },
  [KnownFineTuningPipelineParameters.TRAIN_MAX_BATCH_LEN]: {
    label: 'Maximum tokens per accelerator',
  },
  [KnownFineTuningPipelineParameters.SDG_SAMPLE_SIZE]: {
    label: 'SDG skill recipe sample size',
  },
  [KnownFineTuningPipelineParameters.TRAIN_NUM_WORKERS]: {
    label: 'Training workers',
  },
  [KnownFineTuningPipelineParameters.TRAIN_NUM_EPOCHS_PHASE_1]: {
    label: 'Epochs (phase 1)',
  },
  [KnownFineTuningPipelineParameters.TRAIN_NUM_EPOCHS_PHASE_2]: {
    label: 'Epochs (phase 2)',
  },
  [KnownFineTuningPipelineParameters.TRAIN_EFFECTIVE_BATCH_SIZE_PHASE_1]: {
    label: 'Batch size (phase 1)',
  },
  [KnownFineTuningPipelineParameters.TRAIN_EFFECTIVE_BATCH_SIZE_PHASE_2]: {
    label: 'Batch size (phase 2)',
  },
  [KnownFineTuningPipelineParameters.TRAIN_LEARNING_RATE_PHASE_1]: {
    label: 'Learning rate (phase 1)',
    renderField: renderLongNumberField,
  },
  [KnownFineTuningPipelineParameters.TRAIN_LEARNING_RATE_PHASE_2]: {
    label: 'Learning rate (phase 2)',
    renderField: renderLongNumberField,
  },
  [KnownFineTuningPipelineParameters.TRAIN_NUM_WARMUP_STEPS_PHASE_1]: {
    label: 'Warmup steps (phase 1)',
  },
  [KnownFineTuningPipelineParameters.TRAIN_NUM_WARMUP_STEPS_PHASE_2]: {
    label: 'Warmup steps (phase 2)',
  },
  [KnownFineTuningPipelineParameters.SDG_MAX_BATCH_LEN]: {
    label: 'Maximum batch length',
  },
  [KnownFineTuningPipelineParameters.TRAIN_SEED]: {
    label: 'Training seed',
  },
  [KnownFineTuningPipelineParameters.FINAL_EVAL_FEW_SHOTS]: {
    label: 'Question-answer pairs',
  },

  [KnownFineTuningPipelineParameters.FINAL_EVAL_MAX_WORKERS]: {
    label: 'Evaluation workers',
    renderField: renderEvaluationField,
    span: 12,
  },
  [KnownFineTuningPipelineParameters.FINAL_EVAL_BATCH_SIZE]: {
    label: 'Evaluation batch size',
    renderField: renderEvaluationField,
    span: 12,
  },
  [KnownFineTuningPipelineParameters.MT_BENCH_MAX_WORKERS]: {
    label: 'MT bench max workers',
    renderField: renderEvaluationField,
    span: 12,
  },
};
