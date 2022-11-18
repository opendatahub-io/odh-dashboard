import * as React from 'react';
import { FormGroup, Grid, NumberInput } from '@patternfly/react-core';
import IndentSection from 'pages/projects/components/IndentSection';
import { UpdateObjectAtPropAndValue } from 'pages/projects/types';
import { CreatingServingRuntimeObject, ServingRuntimeResources } from '../../types';

type ServingRuntimeSizeExpandedFieldProps = {
  data: CreatingServingRuntimeObject;
  setData: UpdateObjectAtPropAndValue<CreatingServingRuntimeObject>;
};

type ResourceKeys = keyof ServingRuntimeResources;
enum ResourceAttributes {
  CPU = 'cpu',
  MEMORY = 'memory',
}

const ServingRuntimeSizeExpandedField: React.FC<ServingRuntimeSizeExpandedFieldProps> = ({
  data,
  setData,
}) => {
  const onChangeResources = (
    event: React.FormEvent<HTMLInputElement>,
    resourceKey: ResourceKeys,
    resourceAttribute: ResourceAttributes,
  ) => {
    const target = event.target as HTMLInputElement;
    const suffix = resourceAttribute === 'memory' ? 'Gi' : '';

    setData('modelSize', {
      ...data.modelSize,
      resources: {
        ...data.modelSize.resources,
        [resourceKey]: {
          ...data.modelSize[resourceKey],
          [resourceAttribute]: `${target.value}${suffix}`,
        },
      },
    });
  };

  const parseResourceInput = (resourceValue: string): number => {
    return parseInt(resourceValue.split('Gi')[0]);
  };

  return (
    <IndentSection>
      <Grid hasGutter md={6}>
        <FormGroup label="CPUs requested">
          <NumberInput
            value={parseResourceInput(data.modelSize?.resources.requests.cpu)}
            widthChars={10}
            min={1}
            onChange={(event) => onChangeResources(event, 'requests', ResourceAttributes.CPU)}
            onMinus={() =>
              setData('modelSize', {
                ...data.modelSize,
                resources: {
                  ...data.modelSize.resources,
                  requests: {
                    ...data.modelSize.resources.requests,
                    cpu: `${parseResourceInput(data.modelSize.resources.requests.cpu) - 1}`,
                  },
                },
              })
            }
            onPlus={() =>
              setData('modelSize', {
                ...data.modelSize,
                resources: {
                  ...data.modelSize.resources,
                  requests: {
                    ...data.modelSize.resources.requests,
                    cpu: `${parseResourceInput(data.modelSize.resources.requests.cpu) + 1}`,
                  },
                },
              })
            }
          />
        </FormGroup>
        <FormGroup label="Memory requested">
          <NumberInput
            value={parseResourceInput(data.modelSize?.resources.requests.memory)}
            widthChars={10}
            min={1}
            onChange={(event) => onChangeResources(event, 'requests', ResourceAttributes.MEMORY)}
            onMinus={() =>
              setData('modelSize', {
                ...data.modelSize,
                resources: {
                  ...data.modelSize.resources,
                  requests: {
                    ...data.modelSize.resources.requests,
                    memory: `${parseResourceInput(data.modelSize.resources.requests.memory) - 1}Gi`,
                  },
                },
              })
            }
            onPlus={() =>
              setData('modelSize', {
                ...data.modelSize,
                resources: {
                  ...data.modelSize.resources,
                  requests: {
                    ...data.modelSize.resources.requests,
                    memory: `${parseResourceInput(data.modelSize.resources.requests.memory) + 1}Gi`,
                  },
                },
              })
            }
          />
        </FormGroup>
        <FormGroup label="CPU limit">
          <NumberInput
            value={parseResourceInput(data.modelSize?.resources.limits.cpu)}
            widthChars={10}
            min={1}
            onChange={(event) => onChangeResources(event, 'limits', ResourceAttributes.CPU)}
            onMinus={() =>
              setData('modelSize', {
                ...data.modelSize,
                resources: {
                  ...data.modelSize.resources,
                  limits: {
                    ...data.modelSize.resources.limits,
                    cpu: `${parseResourceInput(data.modelSize.resources.limits.cpu) - 1}`,
                  },
                },
              })
            }
            onPlus={() =>
              setData('modelSize', {
                ...data.modelSize,
                resources: {
                  ...data.modelSize.resources,
                  limits: {
                    ...data.modelSize.resources.limits,
                    cpu: `${parseResourceInput(data.modelSize.resources.limits.cpu) + 1}`,
                  },
                },
              })
            }
          />
        </FormGroup>
        <FormGroup label="Memory limit">
          <NumberInput
            value={parseResourceInput(data.modelSize?.resources.limits.memory)}
            widthChars={10}
            min={1}
            onChange={(event) => onChangeResources(event, 'limits', ResourceAttributes.MEMORY)}
            onMinus={() =>
              setData('modelSize', {
                ...data.modelSize,
                resources: {
                  ...data.modelSize.resources,
                  limits: {
                    ...data.modelSize.resources.limits,
                    memory: `${parseResourceInput(data.modelSize.resources.limits.memory) - 1}Gi`,
                  },
                },
              })
            }
            onPlus={() =>
              setData('modelSize', {
                ...data.modelSize,
                resources: {
                  ...data.modelSize.resources,
                  limits: {
                    ...data.modelSize.resources.limits,
                    memory: `${parseResourceInput(data.modelSize.resources.limits.memory) + 1}Gi`,
                  },
                },
              })
            }
          />
        </FormGroup>
      </Grid>
    </IndentSection>
  );
};

export default ServingRuntimeSizeExpandedField;
