import { Stack } from '@patternfly/react-core';
import * as React from 'react';
import { HyperparameterDisplayFields } from '~/pages/pipelines/global/modelCustomization/const';
import { asEnumMember } from '~/utilities/utils';
import ParamsDefaultFields from '~/components/ParamsDefaultFields';
import { ParametersKF, RuntimeConfigParamValue } from '~/concepts/pipelines/kfTypes';
import { ModelCustomizationFormData } from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/validationUtils';
import { HYPERPARAMETER_MAP } from './HyperparameterFieldsUtils';

type HyperparameterFieldsDisplayProps = {
  hyperparameters: ParametersKF;
  data: ModelCustomizationFormData;
  isEmpty: boolean;
  onChange: (hyperparameter: string, hyperparameterValue?: RuntimeConfigParamValue) => void;
};

const HyperparameterFieldsDisplay: React.FC<HyperparameterFieldsDisplayProps> = ({
  hyperparameters,
  data,
  isEmpty,
  onChange,
}) => (
  <Stack hasGutter>
    {!isEmpty &&
      Object.entries(hyperparameters).map(([key, value]) => {
        const hyperparameterKey = asEnumMember(key, HyperparameterDisplayFields);
        if (hyperparameterKey) {
          const { label, renderField } = HYPERPARAMETER_MAP[hyperparameterKey];
          if (renderField) {
            return renderField(
              label,
              hyperparameterKey,
              !value.isOptional,
              value.description,
              onChange,
              key in data.hyperparameters
                ? data.hyperparameters[key] ?? ''
                : value.defaultValue ?? '',
            );
          }
        }

        const inputProps = {
          value:
            key in data.hyperparameters
              ? data.hyperparameters[key] ?? ''
              : value.defaultValue ?? '',
          id: key,
          name: key,
          onChange: (
            _event: React.ChangeEvent<unknown> | null,
            hyperparameterValue?: string | number | boolean,
          ) => onChange(key, hyperparameterValue),
        };

        return (
          <ParamsDefaultFields
            key={key}
            parameterType={value.parameterType}
            inputProps={inputProps}
            label={hyperparameterKey ? HYPERPARAMETER_MAP[hyperparameterKey].label : key}
            description={value.description}
            isOptional={value.isOptional}
          />
        );
      })}
  </Stack>
);

export default HyperparameterFieldsDisplay;
