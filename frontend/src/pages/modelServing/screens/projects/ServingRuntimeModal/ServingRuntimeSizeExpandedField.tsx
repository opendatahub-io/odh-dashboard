import * as React from 'react';
import { FormGroup, Grid, NumberInput, ValidatedOptions } from '@patternfly/react-core';
import IndentSection from 'pages/projects/components/IndentSection';
import { UpdateObjectAtPropAndValue } from 'pages/projects/types';
import { CreatingServingRuntimeObject } from '../../types';
import { isHTMLInputElement, normalizeBetween } from 'utilities/utils';
import { ContainerResourceAttributes, ContainerResources } from '../../../../../types';

type ServingRuntimeSizeExpandedFieldProps = {
  data: CreatingServingRuntimeObject;
  setData: UpdateObjectAtPropAndValue<CreatingServingRuntimeObject>;
};

type ResourceKeys = keyof ContainerResources;

const ServingRuntimeSizeExpandedField: React.FC<ServingRuntimeSizeExpandedFieldProps> = ({
  data,
  setData,
}) => {
  const MIN_SIZE = 1;

  const onChangeResources = (
    event: React.FormEvent<HTMLInputElement>,
    resourceKey: ResourceKeys,
    resourceAttribute: ContainerResourceAttributes,
  ) => {
    if (isHTMLInputElement(event.target)) {
      const newSize = Number(event.target.value);
      const suffix = resourceAttribute === 'memory' ? 'Gi' : '';

      setData('modelSize', {
        ...data.modelSize,
        resources: {
          ...data.modelSize.resources,
          [resourceKey]: {
            ...data.modelSize.resources[resourceKey],
            [resourceAttribute]: `${
              isNaN(newSize) ? MIN_SIZE : normalizeBetween(newSize, MIN_SIZE)
            }${suffix}`,
          },
        },
      });
    }
  };

  const onStep = (
    currentValue: number,
    step: number,
    resourceKey: ResourceKeys,
    resourceAttribute: ContainerResourceAttributes,
  ) => {
    const suffix = resourceAttribute === 'memory' ? 'Gi' : '';

    setData('modelSize', {
      ...data.modelSize,
      resources: {
        ...data.modelSize.resources,
        [resourceKey]: {
          ...data.modelSize.resources[resourceKey],
          [resourceAttribute]: `${normalizeBetween(currentValue + step, MIN_SIZE)}${suffix}`,
        },
      },
    });
  };

  const parseResourceInput = (resourceValue: string | undefined): number => {
    if (!resourceValue) {
      return 0;
    }
    return parseInt(resourceValue.split('Gi')[0]);
  };

  const validateInput = (value: string | undefined): ValidatedOptions =>
    value && parseInt(value) >= 0 ? ValidatedOptions.default : ValidatedOptions.error;

  return (
    <IndentSection>
      <Grid hasGutter md={6}>
        <FormGroup label="CPUs requested">
          <NumberInput
            value={parseResourceInput(data.modelSize?.resources.requests?.cpu)}
            widthChars={10}
            min={1}
            validated={validateInput(data.modelSize?.resources.requests?.cpu)}
            onChange={(event) =>
              onChangeResources(event, 'requests', ContainerResourceAttributes.CPU)
            }
            onMinus={() =>
              onStep(
                parseResourceInput(data.modelSize?.resources.requests?.cpu),
                -1,
                'requests',
                ContainerResourceAttributes.CPU,
              )
            }
            onPlus={() =>
              onStep(
                parseResourceInput(data.modelSize?.resources.requests?.cpu),
                +1,
                'requests',
                ContainerResourceAttributes.CPU,
              )
            }
          />
        </FormGroup>
        <FormGroup label="Memory requested">
          <NumberInput
            value={parseResourceInput(data.modelSize?.resources.requests?.memory)}
            widthChars={10}
            min={1}
            validated={validateInput(data.modelSize?.resources.requests?.memory)}
            onChange={(event) =>
              onChangeResources(event, 'requests', ContainerResourceAttributes.MEMORY)
            }
            onMinus={() =>
              onStep(
                parseResourceInput(data.modelSize?.resources.requests?.memory),
                -1,
                'requests',
                ContainerResourceAttributes.MEMORY,
              )
            }
            onPlus={() =>
              onStep(
                parseResourceInput(data.modelSize?.resources.requests?.memory),
                +1,
                'requests',
                ContainerResourceAttributes.MEMORY,
              )
            }
          />
        </FormGroup>
        <FormGroup label="CPU limit">
          <NumberInput
            value={parseResourceInput(data.modelSize?.resources.limits?.cpu)}
            widthChars={10}
            min={1}
            validated={validateInput(data.modelSize?.resources.limits?.cpu)}
            onChange={(event) =>
              onChangeResources(event, 'limits', ContainerResourceAttributes.CPU)
            }
            onMinus={() =>
              onStep(
                parseResourceInput(data.modelSize?.resources.limits?.cpu),
                -1,
                'limits',
                ContainerResourceAttributes.CPU,
              )
            }
            onPlus={() =>
              onStep(
                parseResourceInput(data.modelSize?.resources.limits?.cpu),
                +1,
                'limits',
                ContainerResourceAttributes.CPU,
              )
            }
          />
        </FormGroup>
        <FormGroup label="Memory limit">
          <NumberInput
            value={parseResourceInput(data.modelSize?.resources.limits?.memory)}
            widthChars={10}
            min={1}
            validated={validateInput(data.modelSize?.resources.limits?.memory)}
            onChange={(event) =>
              onChangeResources(event, 'limits', ContainerResourceAttributes.MEMORY)
            }
            onMinus={() =>
              onStep(
                parseResourceInput(data.modelSize?.resources.limits?.memory),
                -1,
                'limits',
                ContainerResourceAttributes.MEMORY,
              )
            }
            onPlus={() =>
              onStep(
                parseResourceInput(data.modelSize?.resources.limits?.memory),
                +1,
                'limits',
                ContainerResourceAttributes.MEMORY,
              )
            }
          />
        </FormGroup>
      </Grid>
    </IndentSection>
  );
};

export default ServingRuntimeSizeExpandedField;
