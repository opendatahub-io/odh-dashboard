import { Grid, GridItem } from '@patternfly/react-core';
import * as React from 'react';
import HyperparameterEvaluationField from '~/concepts/pipelines/content/modelCustomizationForm/hyperparameterFields/HyperparameterEvaluationField';
import HyperparameterLongNumberField from '~/concepts/pipelines/content/modelCustomizationForm/hyperparameterFields/HyperparameterLongNumberField';
import HyperparameterNumericField from '~/concepts/pipelines/content/modelCustomizationForm/hyperparameterFields/HyperparameterNumericField';
import { HyperparametersFormData } from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/validationUtils';
import { InputDefinitionParameterType } from '~/concepts/pipelines/kfTypes';
import {
  HYPERPARAMETER_DISPLAY_NAMES,
  HYPERPARAMETER_LIST,
  HyperparameterFields,
} from '~/pages/pipelines/global/modelCustomization/const';

type HyperparameterFieldsDisplayProps = {
  hyperparameters: HyperparametersFormData;
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
            typeof hyperparameters[field] !== 'undefined' &&
            (typeof hyperparameters[field].defaultValue === 'number' ||
              typeof hyperparameters[field].defaultValue === 'string')
              ? hyperparameters[field].defaultValue
              : 1
          }
          field={field}
          onChange={onChange}
          isInt={
            !isEmpty &&
            typeof hyperparameters[field] !== 'undefined' &&
            (hyperparameters[field].parameterType === InputDefinitionParameterType.INTEGER ||
              hyperparameters[field].parameterType === InputDefinitionParameterType.STRING)
          }
          isRequired={
            !isEmpty &&
            typeof hyperparameters[field] !== 'undefined' &&
            !hyperparameters[field].isOptional
          }
        />
      </GridItem>
    ))}
    {HYPERPARAMETER_LIST.slice(8, 10).map((field, index) => (
      <GridItem key={index} span={6}>
        <HyperparameterLongNumberField
          label={HYPERPARAMETER_DISPLAY_NAMES[field]}
          value={
            !isEmpty &&
            typeof hyperparameters[field] !== 'undefined' &&
            typeof hyperparameters[field].defaultValue === 'number'
              ? hyperparameters[field].defaultValue
              : 1
          }
          field={field}
          onChange={onChange}
          isRequired={
            !isEmpty &&
            typeof hyperparameters[field] !== 'undefined' &&
            !hyperparameters[field].isOptional
          }
        />
      </GridItem>
    ))}
    {HYPERPARAMETER_LIST.slice(10, 15).map((field, index) => (
      <GridItem key={index} span={6}>
        <HyperparameterNumericField
          label={HYPERPARAMETER_DISPLAY_NAMES[field]}
          value={
            !isEmpty &&
            typeof hyperparameters[field] !== 'undefined' &&
            typeof hyperparameters[field].defaultValue === 'number'
              ? hyperparameters[field].defaultValue
              : 1
          }
          field={field}
          onChange={onChange}
          isInt={
            !isEmpty &&
            typeof hyperparameters[field] !== 'undefined' &&
            hyperparameters[field].parameterType === InputDefinitionParameterType.INTEGER
          }
          isRequired={
            !isEmpty &&
            typeof hyperparameters[field] !== 'undefined' &&
            !hyperparameters[field].isOptional
          }
        />
      </GridItem>
    ))}
    <GridItem>
      <HyperparameterEvaluationField
        label={HYPERPARAMETER_DISPLAY_NAMES[HyperparameterFields.EVALUATION_WORKERS]}
        value={
          !isEmpty &&
          typeof hyperparameters[HyperparameterFields.EVALUATION_WORKERS] !== 'undefined' &&
          (typeof hyperparameters[HyperparameterFields.EVALUATION_WORKERS].defaultValue ===
            'string' ||
            typeof hyperparameters[HyperparameterFields.EVALUATION_WORKERS].defaultValue ===
              'number')
            ? hyperparameters[HyperparameterFields.EVALUATION_WORKERS].defaultValue
            : 'auto'
        }
        field={HyperparameterFields.EVALUATION_WORKERS}
        onChange={onChange}
        isRequired={
          !isEmpty &&
          typeof hyperparameters[HyperparameterFields.EVALUATION_WORKERS] !== 'undefined' &&
          !hyperparameters[HyperparameterFields.EVALUATION_WORKERS].isOptional
        }
      />
    </GridItem>
    <GridItem>
      <HyperparameterEvaluationField
        label={HYPERPARAMETER_DISPLAY_NAMES[HyperparameterFields.EVALUATION_BATCH_SIZE]}
        value={
          !isEmpty &&
          typeof hyperparameters[HyperparameterFields.EVALUATION_BATCH_SIZE] !== 'undefined' &&
          (typeof hyperparameters[HyperparameterFields.EVALUATION_BATCH_SIZE].defaultValue ===
            'string' ||
            typeof hyperparameters[HyperparameterFields.EVALUATION_BATCH_SIZE].defaultValue ===
              'number')
            ? hyperparameters[HyperparameterFields.EVALUATION_BATCH_SIZE].defaultValue
            : 'auto'
        }
        field={HyperparameterFields.EVALUATION_BATCH_SIZE}
        onChange={onChange}
        isRequired={
          !isEmpty &&
          typeof hyperparameters[HyperparameterFields.EVALUATION_BATCH_SIZE] !== 'undefined' &&
          !hyperparameters[HyperparameterFields.EVALUATION_BATCH_SIZE].isOptional
        }
      />
    </GridItem>
  </Grid>
);

export default HyperparameterFieldsDisplay;
