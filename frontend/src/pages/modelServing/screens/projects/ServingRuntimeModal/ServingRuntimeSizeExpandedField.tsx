import * as React from 'react';
import { Grid } from '@patternfly/react-core';
import { ContainerResourceAttributes, ContainerResources } from '#~/types';
import { CPUFieldWithCheckbox } from '#~/components/CPUField';
import { MemoryFieldWithCheckbox } from '#~/components/MemoryField';
import { useZodFormValidation } from '#~/hooks/useZodFormValidation.ts';
import { ModelServingSize, modelServingSizeSchema } from './validationUtils';

type ServingRuntimeSizeExpandedFieldProps = {
  data: ModelServingSize;
  setData: (value: ModelServingSize) => void;
};

type ResourceKeys = keyof ContainerResources;

const ServingRuntimeSizeExpandedField = ({
  data,
  setData,
}: ServingRuntimeSizeExpandedFieldProps): React.ReactNode => {
  const { getFieldValidation, getFieldValidationProps } = useZodFormValidation(
    data,
    modelServingSizeSchema,
    { ignoreTouchedFields: true },
  );

  const handleChange = (
    type: ContainerResourceAttributes.CPU | ContainerResourceAttributes.MEMORY,
    variant: ResourceKeys,
    value: string | undefined,
  ) => {
    setData({
      ...data,
      resources: {
        ...data.resources,
        [variant]: {
          ...data.resources[variant],
          [type]: value,
        },
      },
    });
  };

  return (
    <Grid hasGutter md={6}>
      <CPUFieldWithCheckbox
        checkboxId="cpu-requested-checkbox"
        label="CPU requested"
        onChange={(value) => {
          if (value === undefined) {
            setData({
              ...data,
              resources: {
                ...data.resources,
                requests: { ...data.resources.requests, cpu: undefined },
                limits: { ...data.resources.limits, cpu: undefined },
              },
            });
          } else {
            handleChange(ContainerResourceAttributes.CPU, 'requests', value);
          }
        }}
        value={data.resources.requests?.cpu}
        validated={getFieldValidationProps(['resources', 'requests', 'cpu']).validated}
        zodIssue={getFieldValidation(['resources', 'requests', 'cpu'])}
        dataTestId="cpu-requested"
      />
      <MemoryFieldWithCheckbox
        checkboxId="memory-requested-checkbox"
        label="Memory requested"
        onChange={(value) => {
          if (value === undefined) {
            setData({
              ...data,
              resources: {
                ...data.resources,
                requests: { ...data.resources.requests, memory: undefined },
                limits: { ...data.resources.limits, memory: undefined },
              },
            });
          } else {
            handleChange(ContainerResourceAttributes.MEMORY, 'requests', value);
          }
        }}
        value={data.resources.requests?.memory}
        validated={getFieldValidationProps(['resources', 'requests', 'memory']).validated}
        zodIssue={getFieldValidation(['resources', 'requests', 'memory'])}
        dataTestId="memory-requested"
      />
      <CPUFieldWithCheckbox
        checkboxId="cpu-limit-checkbox"
        isDisabled={data.resources.requests?.cpu === undefined}
        checkboxTooltip={
          data.resources.requests?.cpu === undefined
            ? 'Requests must be set in order to set a limit'
            : undefined
        }
        label="CPU limit"
        onChange={(value) => handleChange(ContainerResourceAttributes.CPU, 'limits', value)}
        value={data.resources.limits?.cpu}
        validated={getFieldValidationProps(['resources', 'limits', 'cpu']).validated}
        zodIssue={getFieldValidation(['resources', 'limits', 'cpu'])}
        dataTestId="cpu-limit"
      />
      <MemoryFieldWithCheckbox
        checkboxId="memory-limit-checkbox"
        isDisabled={data.resources.requests?.memory === undefined}
        label="Memory limit"
        checkboxTooltip={
          data.resources.requests?.memory === undefined
            ? 'Requests must be set in order to set a limit'
            : undefined
        }
        onChange={(value) => handleChange(ContainerResourceAttributes.MEMORY, 'limits', value)}
        value={data.resources.limits?.memory}
        validated={getFieldValidationProps(['resources', 'limits', 'memory']).validated}
        zodIssue={getFieldValidation(['resources', 'limits', 'memory'])}
        dataTestId="memory-limit"
      />
    </Grid>
  );
};

export default ServingRuntimeSizeExpandedField;
