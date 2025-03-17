import React from 'react';
import {
  ExpandableSection,
  FormGroup,
  Grid,
  GridItem,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { ZodIssue } from 'zod';
import { ContainerResources } from '~/types';
import MemoryField from '~/components/MemoryField';
import CPUField from '~/components/CPUField';
import { ZodErrorHelperText } from '~/components/ZodErrorFormHelperText';

type ContainerCustomSizeProps = {
  resources: ContainerResources;
  setSize: React.Dispatch<React.SetStateAction<ContainerResources>>;
  cpuValidationIssue?: ZodIssue[];
  memoryValidationIssue?: ZodIssue[];
};

export const ContainerCustomSize: React.FC<ContainerCustomSizeProps> = ({
  resources,
  setSize,
  cpuValidationIssue = [],
  memoryValidationIssue = [],
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const renderField = (identifier: string, renderType: 'requests' | 'limits') => {
    const value = resources[renderType]?.[identifier];
    const onChange = (v: string) =>
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
                validated={cpuValidationIssue.length > 0 ? 'error' : 'default'}
              />
              <ZodErrorHelperText zodIssue={cpuValidationIssue} />
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
                validated={memoryValidationIssue.length > 0 ? 'error' : 'default'}
              />
              <ZodErrorHelperText zodIssue={memoryValidationIssue} />
            </>
          );
        default:
          return null;
      }
    })();

    return <FormGroup label={`${identifier} ${renderType}`}>{field}</FormGroup>;
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
