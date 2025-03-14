import { Grid, GridItem } from '@patternfly/react-core';
import * as React from 'react';
import ParamsDefaultFields from '~/components/ParamsDefaultFields';
import { ParametersKF, RuntimeConfigParamValue } from '~/concepts/pipelines/kfTypes';
import { ModelCustomizationFormData } from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/validationUtils';
import { ValidationContext } from '~/utilities/useValidation';
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
}) => {
  const { getAllValidationIssues } = React.useContext(ValidationContext);

  // Memoize the sorted hyperparameters
  const sortedHyperparameters = React.useMemo(
    () =>
      Object.entries(hyperparameters).toSorted(([keyA], [keyB]) => {
        const indexA = Object.keys(HYPERPARAMETER_MAP).indexOf(keyA);
        const indexB = Object.keys(HYPERPARAMETER_MAP).indexOf(keyB);
        // if not in map, place at end
        if (indexA === -1) {
          return 1;
        }
        if (indexB === -1) {
          return -1;
        }
        return indexA - indexB; // sort by index in map
      }),
    [hyperparameters],
  );

  return (
    <Grid hasGutter>
      {!isEmpty &&
        sortedHyperparameters.map(([key, value]) => {
          if (key in HYPERPARAMETER_MAP) {
            const { label, renderField, span } = HYPERPARAMETER_MAP[key];
            if (renderField) {
              return (
                <GridItem span={12} lg={span ?? 6} key={key}>
                  {renderField(
                    label,
                    key,
                    !value.isOptional,
                    value.description,
                    onChange,
                    key in data.hyperparameters
                      ? data.hyperparameters[key] ?? ''
                      : value.defaultValue ?? '',
                    getAllValidationIssues(['hyperparameters', key]),
                  )}
                </GridItem>
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

          const { label, span } = key in HYPERPARAMETER_MAP ? HYPERPARAMETER_MAP[key] : {};

          return (
            <GridItem span={12} lg={span ?? 6} key={key}>
              <ParamsDefaultFields
                parameterType={value.parameterType}
                inputProps={inputProps}
                label={label ?? key}
                description={value.description}
                isOptional={value.isOptional}
                validationIssues={
                  inputProps.value ? getAllValidationIssues(['hyperparameters', key]) : []
                }
              />
            </GridItem>
          );
        })}
    </Grid>
  );
};

export default HyperparameterFieldsDisplay;
