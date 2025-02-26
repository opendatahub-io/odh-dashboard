import { Grid, GridItem } from '@patternfly/react-core';
import * as React from 'react';
import HyperparameterEvaluationField from '~/concepts/pipelines/content/modelCustomizationForm/hyperparameterFields/HyperparameterEvaluationField';
import HyperparameterLongNumberField from '~/concepts/pipelines/content/modelCustomizationForm/hyperparameterFields/HyperparameterLongNumberField';
import HyperparameterNumericField from '~/concepts/pipelines/content/modelCustomizationForm/hyperparameterFields/HyperparameterNumericField';
import { HyperparameterProps } from '~/concepts/pipelines/content/modelCustomizationForm/types';
import { InputDefinitionParameterType } from '~/concepts/pipelines/kfTypes';
import {
  HYPERPARAMETER_DISPLAY_NAMES,
  HYPERPARAMETER_LIST,
  HyperparameterFields,
} from '~/pages/pipelines/global/modelCustomization/const';

type HyperparameterFieldsDisplayProps = {
  hyperparameters: HyperparameterProps;
  isEmpty: boolean;
  onChange: (hyperparameter: HyperparameterFields, hyperparameterValue: string | number) => void;
};

const HyperparameterFieldsDisplay: React.FC<HyperparameterFieldsDisplayProps> = ({
  hyperparameters,
  isEmpty,
  onChange,
}) => (
  <Grid hasGutter>
    {HYPERPARAMETER_LIST.slice(0, 8).map((field, index) => (
      <GridItem key={index} span={6}>
        <HyperparameterNumericField
          label={HYPERPARAMETER_DISPLAY_NAMES[field]}
          value={
            !isEmpty &&
            (typeof hyperparameters[field].defaultValue === 'number' ||
              typeof hyperparameters[field].defaultValue === 'string')
              ? hyperparameters[field].defaultValue
              : 1
          }
          field={field}
          onChange={onChange}
          isInt={
            !isEmpty &&
            hyperparameters[field].parameterType === InputDefinitionParameterType.INTEGER
          }
        />
      </GridItem>
    ))}
    {HYPERPARAMETER_LIST.slice(8, 10).map((field, index) => (
      <GridItem key={index} span={6}>
        <HyperparameterLongNumberField
          label={HYPERPARAMETER_DISPLAY_NAMES[field]}
          value={
            !isEmpty && typeof hyperparameters[field].defaultValue === 'number'
              ? hyperparameters[field].defaultValue
              : 1
          }
          field={field}
          onChange={onChange}
        />
      </GridItem>
    ))}
    {HYPERPARAMETER_LIST.slice(10, 14).map((field, index) => (
      <GridItem key={index} span={6}>
        <HyperparameterNumericField
          label={HYPERPARAMETER_DISPLAY_NAMES[field]}
          value={
            !isEmpty && typeof hyperparameters[field].defaultValue === 'number'
              ? hyperparameters[field].defaultValue
              : 1
          }
          field={field}
          onChange={onChange}
          isInt={
            !isEmpty &&
            hyperparameters[field].parameterType === InputDefinitionParameterType.INTEGER
          }
        />
      </GridItem>
    ))}
    <HyperparameterNumericField
      label={HYPERPARAMETER_DISPLAY_NAMES[HyperparameterFields.QUESTION_ANSWER_PAIRS]}
      value={
        !isEmpty &&
        typeof hyperparameters[HyperparameterFields.QUESTION_ANSWER_PAIRS].defaultValue === 'number'
          ? hyperparameters[HyperparameterFields.QUESTION_ANSWER_PAIRS].defaultValue
          : 1
      }
      field={HyperparameterFields.QUESTION_ANSWER_PAIRS}
      onChange={onChange}
      isInt={
        !isEmpty &&
        hyperparameters[HyperparameterFields.QUESTION_ANSWER_PAIRS].parameterType ===
          InputDefinitionParameterType.INTEGER
      }
    />
    <GridItem>
      <HyperparameterEvaluationField
        label={HYPERPARAMETER_DISPLAY_NAMES[HyperparameterFields.EVALUATION_WORKERS]}
        value={
          !isEmpty &&
          (typeof hyperparameters[HyperparameterFields.EVALUATION_WORKERS].defaultValue ===
            'string' ||
            typeof hyperparameters[HyperparameterFields.EVALUATION_WORKERS].defaultValue ===
              'number')
            ? hyperparameters[HyperparameterFields.EVALUATION_WORKERS].defaultValue
            : 'auto'
        }
        field={HyperparameterFields.EVALUATION_WORKERS}
        onChange={onChange}
      />
    </GridItem>
    <GridItem>
      <HyperparameterEvaluationField
        label={HYPERPARAMETER_DISPLAY_NAMES[HyperparameterFields.EVALUATION_BATCH_SIZE]}
        value={
          !isEmpty &&
          (typeof hyperparameters[HyperparameterFields.EVALUATION_BATCH_SIZE].defaultValue ===
            'string' ||
            typeof hyperparameters[HyperparameterFields.EVALUATION_BATCH_SIZE].defaultValue ===
              'number')
            ? hyperparameters[HyperparameterFields.EVALUATION_BATCH_SIZE].defaultValue
            : 'auto'
        }
        field={HyperparameterFields.EVALUATION_BATCH_SIZE}
        onChange={onChange}
      />
    </GridItem>
  </Grid>
);

export default HyperparameterFieldsDisplay;
