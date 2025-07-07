import React from 'react';
import {
  ExpandableSection,
  FormGroup,
  Grid,
  GridItem,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { ContainerResources } from '#~/types';
import MemoryField from '#~/components/MemoryField';
import CPUField from '#~/components/CPUField';
import { ZodErrorHelperText } from '#~/components/ZodErrorFormHelperText';
import { useZodFormValidation } from '#~/hooks/useZodFormValidation';
import { podSpecSizeSchema } from '#~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/validationUtils';

type ContainerCustomSizeProps = {
  resources: ContainerResources;
  setSize: React.Dispatch<React.SetStateAction<ContainerResources>>;
};

export const ContainerCustomSize: React.FC<ContainerCustomSizeProps> = ({ resources, setSize }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const { getFieldValidation, getFieldValidationProps } = useZodFormValidation(
    { cpuCount: resources.requests?.cpu ?? 0, memoryCount: resources.requests?.memory },
    podSpecSizeSchema,
  );

  const renderField = (identifier: string, renderType: 'requests' | 'limits') => {
    const value = resources[renderType]?.[identifier];
    const onChange = (v: string | undefined) =>
      setSize({
        ...resources,
        [renderType]: {
          ...resources[renderType],
          [identifier]: v,
        },
      });

    const field = (() => {
      switch (identifier) {
        case 'cpu':
          return (
            <>
              <CPUField
                value={value}
                onChange={onChange}
                dataTestId={`${identifier}-${renderType}`}
                min={0}
                {...getFieldValidationProps(['cpuCount'])}
              />
              <ZodErrorHelperText zodIssue={getFieldValidation(['cpuCount'])} />
            </>
          );
        case 'memory':
          return (
            <>
              <MemoryField
                value={value}
                onChange={onChange}
                dataTestId={`${identifier}-${renderType}`}
                min={0}
                {...getFieldValidationProps(['memoryCount'])}
              />
              <ZodErrorHelperText zodIssue={getFieldValidation(['memoryCount'])} />
            </>
          );
        default:
          return null;
      }
    })();

    return (
      <FormGroup label={`${identifier} ${renderType}`} isRequired>
        {field}
      </FormGroup>
    );
  };

  return (
    <ExpandableSection
      isIndented
      toggleText="Customize resource requests and limits"
      isExpanded={isExpanded}
      onToggle={() => setIsExpanded(!isExpanded)}
      data-testid="container-customize"
    >
      <Stack hasGutter>
        {['cpu', 'memory'].map((identifier) => (
          <StackItem key={identifier}>
            <Grid hasGutter md={12} lg={6}>
              <GridItem>{renderField(identifier, 'requests')}</GridItem>
            </Grid>
          </StackItem>
        ))}
      </Stack>
    </ExpandableSection>
  );
};
