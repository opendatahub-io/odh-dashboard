import * as React from 'react';
import { FormGroup, Grid } from '@patternfly/react-core';
import { ContainerResourceAttributes, ContainerResources } from '#~/types';
import CPUField from '#~/components/CPUField';
import MemoryField from '#~/components/MemoryField';
import { ModelServingSize } from '#~/pages/modelServing/screens/types';

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

  return (
    <Grid hasGutter md={6}>
      <FormGroup label="CPUs requested">
        <CPUField
          onChange={(value) => handleChange(ContainerResourceAttributes.CPU, 'requests', value)}
          value={data.resources.requests?.cpu}
        />
      </FormGroup>
      <FormGroup label="Memory requested">
        <MemoryField
          onChange={(value) => handleChange(ContainerResourceAttributes.MEMORY, 'requests', value)}
          value={data.resources.requests?.memory}
        />
      </FormGroup>
      <FormGroup label="CPU limit">
        <CPUField
          onChange={(value) => handleChange(ContainerResourceAttributes.CPU, 'limits', value)}
          value={data.resources.limits?.cpu}
        />
      </FormGroup>
      <FormGroup label="Memory limit">
        <MemoryField
          onChange={(value) => handleChange(ContainerResourceAttributes.MEMORY, 'limits', value)}
          value={data.resources.limits?.memory}
        />
      </FormGroup>
    </Grid>
  );
};

export default ServingRuntimeSizeExpandedField;
