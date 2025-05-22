import * as React from 'react';
import { FormGroup, Grid } from '@patternfly/react-core';
import { ContainerResourceAttributes, ContainerResources } from '~/types';
import CPUField from '~/components/CPUField';
import MemoryField from '~/components/MemoryField';
import { ModelServingSize } from '~/pages/modelServing/screens/types';

type ServingRuntimeSizeExpandedFieldProps = {
  data: ModelServingSize;
  setData: (value: ModelServingSize) => void;
};

type ResourceKeys = keyof ContainerResources;

const ServingRuntimeSizeExpandedField = ({
  data,
  setData,
}: ServingRuntimeSizeExpandedFieldProps): React.ReactNode => {
  const handleChange = (
    type: ContainerResourceAttributes.CPU | ContainerResourceAttributes.MEMORY,
    variant: ResourceKeys,
    value: string,
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
  const setInitialValue = (
    type: ContainerResourceAttributes,
    variant: ResourceKeys,
  ): string | number => {
    if (data.resources[variant]?.[type] === undefined) {
      handleChange(type, variant, '1');
      return '1';
    }
    return data.resources[variant][type];
  };

  return (
    <Grid hasGutter md={6}>
      <FormGroup label="CPUs requested">
        <CPUField
          onChange={(value) => handleChange(ContainerResourceAttributes.CPU, 'requests', value)}
          value={setInitialValue(ContainerResourceAttributes.CPU, 'requests')}
          dataTestId="cpu-request"
        />
      </FormGroup>
      <FormGroup label="Memory requested">
        <MemoryField
          onChange={(value) => handleChange(ContainerResourceAttributes.MEMORY, 'requests', value)}
          value={setInitialValue(ContainerResourceAttributes.MEMORY, 'requests')}
          dataTestId="memory-request"
        />
      </FormGroup>
      <FormGroup label="CPU limit">
        <CPUField
          onChange={(value) => handleChange(ContainerResourceAttributes.CPU, 'limits', value)}
          value={setInitialValue(ContainerResourceAttributes.CPU, 'limits')}
          dataTestId="cpu-limit"
        />
      </FormGroup>
      <FormGroup label="Memory limit">
        <MemoryField
          onChange={(value) => handleChange(ContainerResourceAttributes.MEMORY, 'limits', value)}
          value={setInitialValue(ContainerResourceAttributes.MEMORY, 'limits')}
          dataTestId="memory-limit"
        />
      </FormGroup>
    </Grid>
  );
};

export default ServingRuntimeSizeExpandedField;
