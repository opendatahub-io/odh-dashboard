import * as React from 'react';
import { FormGroup, Grid } from '@patternfly/react-core';
import IndentSection from '~/pages/projects/components/IndentSection';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import {
  CreatingInferenceServiceObject,
  CreatingServingRuntimeObject,
} from '~/pages/modelServing/screens/types';
import { ContainerResourceAttributes, ContainerResources } from '~/types';
import CPUField from '~/components/CPUField';
import MemoryField from '~/components/MemoryField';

type ServingRuntimeSizeExpandedFieldProps = {
  data: CreatingServingRuntimeObject | CreatingInferenceServiceObject;
  setData:
    | UpdateObjectAtPropAndValue<CreatingServingRuntimeObject>
    | UpdateObjectAtPropAndValue<CreatingInferenceServiceObject>;
};

type ResourceKeys = keyof ContainerResources;

const ServingRuntimeSizeExpandedField: React.FC<ServingRuntimeSizeExpandedFieldProps> = ({
  data,
  setData,
}) => {
  const handleChange = (
    type: ContainerResourceAttributes.CPU | ContainerResourceAttributes.MEMORY,
    variant: ResourceKeys,
    value: string,
  ) => {
    setData('modelSize', {
      ...data.modelSize,
      resources: {
        ...data.modelSize.resources,
        [variant]: {
          ...data.modelSize.resources[variant],
          [type]: value,
        },
      },
    });
  };

  return (
    <IndentSection>
      <Grid hasGutter md={6}>
        <FormGroup label="CPUs requested">
          <CPUField
            onChange={(value) => handleChange(ContainerResourceAttributes.CPU, 'requests', value)}
            value={data.modelSize.resources.requests?.cpu}
          />
        </FormGroup>
        <FormGroup label="Memory requested">
          <MemoryField
            onChange={(value) =>
              handleChange(ContainerResourceAttributes.MEMORY, 'requests', value)
            }
            value={data.modelSize.resources.requests?.memory}
          />
        </FormGroup>
        <FormGroup label="CPU limit">
          <CPUField
            onChange={(value) => handleChange(ContainerResourceAttributes.CPU, 'limits', value)}
            value={data.modelSize.resources.limits?.cpu}
          />
        </FormGroup>
        <FormGroup label="Memory limit">
          <MemoryField
            onChange={(value) => handleChange(ContainerResourceAttributes.MEMORY, 'limits', value)}
            value={data.modelSize.resources.limits?.memory}
          />
        </FormGroup>
      </Grid>
    </IndentSection>
  );
};

export default ServingRuntimeSizeExpandedField;
