import { Stack } from '@patternfly/react-core';
import * as React from 'react';
import { HyperparametersFormData } from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/validationUtils';
import {
  HYPERPARAMETER_EVALUATION_LIST,
  HYPERPARAMETER_LONG_NUMBER_LIST,
  HyperparameterFields,
} from '~/pages/pipelines/global/modelCustomization/const';
import { asEnumMember } from '~/utilities/utils';
import ParamsDefaultFields from '~/components/ParamsDefaultFields';
import { HYPERPARAMETER_MAP } from './HyperparameterFieldsUtils';

type HyperparameterFieldsDisplayProps = {
  hyperparameters: HyperparametersFormData;
  isEmpty: boolean;
  onChange: (
    hyperparameter: HyperparameterFields,
    hyperparameterValue: string | number | boolean,
  ) => void;
};

const HyperparameterFieldsDisplay: React.FC<HyperparameterFieldsDisplayProps> = ({
  hyperparameters,
  isEmpty,
  onChange,
}) => (
  <Stack hasGutter>
    {!isEmpty &&
      Object.entries(hyperparameters).map(([key, value]) => {
        const hyperparameterKey = asEnumMember(key, HyperparameterFields);
        if (hyperparameterKey) {
          const { label, renderField } = HYPERPARAMETER_MAP[hyperparameterKey];
          if (renderField) {
            if (HYPERPARAMETER_LONG_NUMBER_LIST.includes(hyperparameterKey)) {
              return renderField(
                label,
                value.defaultValue,
                hyperparameterKey,
                !value.isOptional,
                value.description,
                onChange,
              );
            }
            if (HYPERPARAMETER_EVALUATION_LIST.includes(hyperparameterKey)) {
              return renderField(
                label,
                value.defaultValue,
                hyperparameterKey,
                !value.isOptional,
                value.description,
                onChange,
              );
            }
            return renderField(
              label,
              value.defaultValue,
              hyperparameterKey,
              !value.isOptional,
              value.description,
              onChange,
              value.parameterType,
            );
          }
          const inputProps = {
            value: typeof value.defaultValue !== 'undefined' ? value.defaultValue : '',
            id: hyperparameterKey,
            name: hyperparameterKey,
            onChange: (
              _event: React.ChangeEvent<unknown> | null,
              hyperparameterValue: string | number | boolean,
            ) => onChange(hyperparameterKey, hyperparameterValue),
          };

          return (
            <ParamsDefaultFields
              key={label}
              parameterType={value.parameterType}
              inputProps={inputProps}
              label={label}
              description={value.description}
              isOptional={value.isOptional}
              value={inputProps.value}
            />
          );
        }
        return <></>;
      })}
  </Stack>
);

export default HyperparameterFieldsDisplay;
