import * as React from 'react';
import HyperparameterNumericField from '~/concepts/pipelines/content/modelCustomizationForm/hyperparameterFields/HyperparameterNumericField';
import HyperparameterLongNumberField from '~/concepts/pipelines/content/modelCustomizationForm/hyperparameterFields/HyperparameterLongNumberField';
import HyperparameterEvaluationField from '~/concepts/pipelines/content/modelCustomizationForm/hyperparameterFields/HyperparameterEvaluationField';
import { InputDefinitionParameterType } from '~/concepts/pipelines/kfTypes';
import { HyperparameterFields } from '~/pages/pipelines/global/modelCustomization/const';

type RenderFieldProps = (
  label: string,
  value: number | string | boolean | undefined,
  field: HyperparameterFields,
  isRequired: boolean,
  description: string | undefined,
  onChange: (hyperparameter: HyperparameterFields, hyperparameterValue: string | number) => void,
  parameterType?: InputDefinitionParameterType,
) => React.ReactNode;

export const HYPERPARAMETER_MAP: Record<
  HyperparameterFields,
  {
    label: string;
    renderField: RenderFieldProps | null;
  }
> = {
  [HyperparameterFields.SDG_SCALE_FACTOR]: {
    label: 'SDG scale factor',
    renderField: (
      label,
      value,
      field,
      isRequired,
      description,
      onChange: (
        hyperparameter: HyperparameterFields,
        hyperparameterValue: string | number,
      ) => void,
      parameterType,
    ): React.ReactNode => (
      <HyperparameterNumericField
        label={label}
        value={typeof value === 'number' || typeof value === 'string' ? value : undefined}
        field={field}
        description={description}
        isRequired={isRequired}
        onChange={onChange}
        isInt={parameterType === InputDefinitionParameterType.INTEGER}
      />
    ),
  },
  [HyperparameterFields.MAXIMUM_TOKENS_PER_ACCELERATOR]: {
    label: 'Maximum tokens per accelerator',
    renderField: (
      label,
      value,
      field,
      isRequired,
      description,
      onChange: (
        hyperparameter: HyperparameterFields,
        hyperparameterValue: string | number,
      ) => void,
      parameterType,
    ): React.ReactNode => (
      <HyperparameterNumericField
        label={label}
        value={typeof value === 'number' || typeof value === 'string' ? value : undefined}
        field={field}
        description={description}
        isRequired={isRequired}
        onChange={onChange}
        isInt={parameterType === InputDefinitionParameterType.INTEGER}
      />
    ),
  },
  [HyperparameterFields.SDG_SAMPLE_SIZE]: {
    label: 'SDG skill recipe sample size',
    renderField: (
      label,
      value,
      field,
      isRequired,
      description,
      onChange: (
        hyperparameter: HyperparameterFields,
        hyperparameterValue: string | number,
      ) => void,
      parameterType,
    ): React.ReactNode => (
      <HyperparameterNumericField
        label={label}
        value={typeof value === 'number' || typeof value === 'string' ? value : undefined}
        field={field}
        description={description}
        isRequired={isRequired}
        onChange={onChange}
        isInt={parameterType === InputDefinitionParameterType.INTEGER}
      />
    ),
  },
  [HyperparameterFields.TRAINING_WORKERS]: {
    label: 'Training workers',
    renderField: (
      label,
      value,
      field,
      isRequired,
      description,
      onChange: (
        hyperparameter: HyperparameterFields,
        hyperparameterValue: string | number,
      ) => void,
      parameterType,
    ): React.ReactNode => (
      <HyperparameterNumericField
        label={label}
        value={typeof value === 'number' || typeof value === 'string' ? value : undefined}
        field={field}
        description={description}
        isRequired={isRequired}
        onChange={onChange}
        isInt={parameterType === InputDefinitionParameterType.INTEGER}
      />
    ),
  },
  [HyperparameterFields.TRAIN_NUM_EPOCHS_PHASE_1]: {
    label: 'Epochs (phase 1)',
    renderField: (
      label,
      value,
      field,
      isRequired,
      description,
      onChange: (
        hyperparameter: HyperparameterFields,
        hyperparameterValue: string | number,
      ) => void,
      parameterType,
    ): React.ReactNode => (
      <HyperparameterNumericField
        label={label}
        value={typeof value === 'number' || typeof value === 'string' ? value : undefined}
        field={field}
        isRequired={isRequired}
        description={description}
        onChange={onChange}
        isInt={parameterType === InputDefinitionParameterType.INTEGER}
      />
    ),
  },
  [HyperparameterFields.TRAIN_NUM_EPOCHS_PHASE_2]: {
    label: 'Epochs (phase 2)',
    renderField: (
      label,
      value,
      field,
      isRequired,
      description,
      onChange: (
        hyperparameter: HyperparameterFields,
        hyperparameterValue: string | number,
      ) => void,
      parameterType,
    ): React.ReactNode => (
      <HyperparameterNumericField
        label={label}
        value={typeof value === 'number' || typeof value === 'string' ? value : undefined}
        field={field}
        isRequired={isRequired}
        description={description}
        onChange={onChange}
        isInt={parameterType === InputDefinitionParameterType.INTEGER}
      />
    ),
  },
  [HyperparameterFields.BATCH_SIZE_PHASE_1]: {
    label: 'Batch size (phase 1)',
    renderField: (
      label,
      value,
      field,
      isRequired,
      description,
      onChange: (
        hyperparameter: HyperparameterFields,
        hyperparameterValue: string | number,
      ) => void,
      parameterType,
    ): React.ReactNode => (
      <HyperparameterNumericField
        label={label}
        value={typeof value === 'number' || typeof value === 'string' ? value : undefined}
        field={field}
        isRequired={isRequired}
        description={description}
        onChange={onChange}
        isInt={parameterType === InputDefinitionParameterType.INTEGER}
      />
    ),
  },
  [HyperparameterFields.BATCH_SIZE_PHASE_2]: {
    label: 'Batch size (phase 2)',
    renderField: (
      label,
      value,
      field,
      isRequired,
      description,
      onChange: (
        hyperparameter: HyperparameterFields,
        hyperparameterValue: string | number,
      ) => void,
      parameterType,
    ): React.ReactNode => (
      <HyperparameterNumericField
        label={label}
        value={typeof value === 'number' || typeof value === 'string' ? value : undefined}
        field={field}
        isRequired={isRequired}
        description={description}
        onChange={onChange}
        isInt={parameterType === InputDefinitionParameterType.INTEGER}
      />
    ),
  },
  [HyperparameterFields.LEARNING_RATE_PHASE_1]: {
    label: 'Learning rate (phase 1)',
    renderField: (
      label,
      value,
      field,
      isRequired,
      description,
      onChange: (
        hyperparameter: HyperparameterFields,
        hyperparameterValue: string | number,
      ) => void,
    ): React.ReactNode => (
      <HyperparameterLongNumberField
        label={label}
        value={typeof value === 'number' ? value : undefined}
        field={field}
        isRequired={isRequired}
        description={description}
        onChange={onChange}
      />
    ),
  },
  [HyperparameterFields.LEARNING_RATE_PHASE_2]: {
    label: 'Learning rate (phase 2)',
    renderField: (
      label,
      value,
      field,
      isRequired,
      description,
      onChange: (
        hyperparameter: HyperparameterFields,
        hyperparameterValue: string | number,
      ) => void,
    ): React.ReactNode => (
      <HyperparameterLongNumberField
        label={label}
        value={typeof value === 'number' ? value : undefined}
        field={field}
        description={description}
        isRequired={isRequired}
        onChange={onChange}
      />
    ),
  },
  [HyperparameterFields.WARMUP_STEPS_PHASE_1]: {
    label: 'Warmup steps (phase 1)',
    renderField: (
      label,
      value,
      field,
      isRequired,
      description,
      onChange: (
        hyperparameter: HyperparameterFields,
        hyperparameterValue: string | number,
      ) => void,
      parameterType,
    ): React.ReactNode => (
      <HyperparameterNumericField
        label={label}
        value={typeof value === 'number' || typeof value === 'string' ? value : undefined}
        field={field}
        isRequired={isRequired}
        onChange={onChange}
        description={description}
        isInt={parameterType === InputDefinitionParameterType.INTEGER}
      />
    ),
  },
  [HyperparameterFields.WARMUP_STEPS_PHASE_2]: {
    label: 'Warmup steps (phase 2)',
    renderField: (
      label,
      value,
      field,
      isRequired,
      description,
      onChange: (
        hyperparameter: HyperparameterFields,
        hyperparameterValue: string | number,
      ) => void,
      parameterType,
    ): React.ReactNode => (
      <HyperparameterNumericField
        label={label}
        value={typeof value === 'number' || typeof value === 'string' ? value : undefined}
        field={field}
        isRequired={isRequired}
        description={description}
        onChange={onChange}
        isInt={parameterType === InputDefinitionParameterType.INTEGER}
      />
    ),
  },
  [HyperparameterFields.MAXIMUM_BATCH_LENGTH]: {
    label: 'Maximum batch length',
    renderField: (
      label,
      value,
      field,
      isRequired,
      description,
      onChange: (
        hyperparameter: HyperparameterFields,
        hyperparameterValue: string | number,
      ) => void,
      parameterType,
    ): React.ReactNode => (
      <HyperparameterNumericField
        label={label}
        value={typeof value === 'number' || typeof value === 'string' ? value : undefined}
        field={field}
        isRequired={isRequired}
        description={description}
        onChange={onChange}
        isInt={parameterType === InputDefinitionParameterType.INTEGER}
      />
    ),
  },
  [HyperparameterFields.TRAINING_SEED]: {
    label: 'Training seed',
    renderField: (
      label,
      value,
      field,
      isRequired,
      description,
      onChange: (
        hyperparameter: HyperparameterFields,
        hyperparameterValue: string | number,
      ) => void,
      parameterType,
    ): React.ReactNode => (
      <HyperparameterNumericField
        label={label}
        value={typeof value === 'number' || typeof value === 'string' ? value : undefined}
        field={field}
        isRequired={isRequired}
        description={description}
        onChange={onChange}
        isInt={parameterType === InputDefinitionParameterType.INTEGER}
      />
    ),
  },
  [HyperparameterFields.QUESTION_ANSWER_PAIRS]: {
    label: 'Question-answer pairs',
    renderField: (
      label,
      value,
      field,
      isRequired,
      description,
      onChange: (
        hyperparameter: HyperparameterFields,
        hyperparameterValue: string | number,
      ) => void,
      parameterType,
    ): React.ReactNode => (
      <HyperparameterNumericField
        label={label}
        value={typeof value === 'number' || typeof value === 'string' ? value : undefined}
        field={field}
        isRequired={isRequired}
        description={description}
        onChange={onChange}
        isInt={parameterType === InputDefinitionParameterType.INTEGER}
      />
    ),
  },
  [HyperparameterFields.EVALUATION_WORKERS]: {
    label: 'Evaluation workers',
    renderField: (
      label,
      value,
      field,
      isRequired,
      description,
      onChange: (
        hyperparameter: HyperparameterFields,
        hyperparameterValue: string | number,
      ) => void,
    ): React.ReactNode => (
      <HyperparameterEvaluationField
        label={label}
        value={typeof value === 'number' || typeof value === 'string' ? value : undefined}
        field={field}
        isRequired={isRequired}
        description={description}
        onChange={onChange}
      />
    ),
  },
  [HyperparameterFields.EVALUATION_BATCH_SIZE]: {
    label: 'Evaluation batch size',
    renderField: (
      label,
      value,
      field,
      isRequired,
      description,
      onChange: (
        hyperparameter: HyperparameterFields,
        hyperparameterValue: string | number,
      ) => void,
    ): React.ReactNode => (
      <HyperparameterEvaluationField
        label={label}
        value={typeof value === 'number' || typeof value === 'string' ? value : undefined}
        field={field}
        isRequired={isRequired}
        description={description}
        onChange={onChange}
      />
    ),
  },
  [HyperparameterFields.TRAIN_SAVE_SAMPLES]: {
    label: HyperparameterFields.TRAIN_SAVE_SAMPLES,
    renderField: null,
  },
  [HyperparameterFields.MT_BENCH_MAX_WORKERS]: {
    label: HyperparameterFields.MT_BENCH_MAX_WORKERS,
    renderField: null,
  },
  [HyperparameterFields.MT_BENCH_MERGE_SYSTEM_USER_MESSAGE]: {
    label: HyperparameterFields.MT_BENCH_MERGE_SYSTEM_USER_MESSAGE,
    renderField: null,
  },
  [HyperparameterFields.FINAL_EVAL_MERGE_SYSEM_USE_MESSAGE]: {
    label: HyperparameterFields.FINAL_EVAL_MERGE_SYSEM_USE_MESSAGE,
    renderField: null,
  },
  [HyperparameterFields.SDG_REPO_PR]: {
    label: HyperparameterFields.SDG_REPO_PR,
    renderField: null,
  },
  [HyperparameterFields.SDG_PIPELINE]: {
    label: HyperparameterFields.SDG_PIPELINE,
    renderField: null,
  },
  [HyperparameterFields.K8S_STORAGE_CLASS_NAME]: {
    label: HyperparameterFields.K8S_STORAGE_CLASS_NAME,
    renderField: null,
  },
};
