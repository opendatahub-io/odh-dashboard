import * as React from 'react';
import {
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Grid,
  GridItem,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { ContainerResources, Identifier } from '~/types';
import CPUField from '~/components/CPUField';
import MemoryField from '~/components/MemoryField';
import NumberInputWrapper from '~/components/NumberInputWrapper';
import { ValidationContext } from '~/utilities/useValidation';

type HardwareProfileCustomizeProps = {
  identifiers: Identifier[];
  data: ContainerResources;
  setData: (data: ContainerResources) => void;
};

const HardwareProfileCustomize: React.FC<HardwareProfileCustomizeProps> = ({
  identifiers,
  data,
  setData,
}) => {
  // Sort identifiers to put CPU and Memory first
  const sortedIdentifiers = React.useMemo(() => {
    const cpuIdentifier = identifiers.find((i) => i.identifier === 'cpu');
    const memoryIdentifier = identifiers.find((i) => i.identifier === 'memory');
    const otherIdentifiers = identifiers.filter(
      (i) => i.identifier !== 'cpu' && i.identifier !== 'memory',
    );

    return [
      ...(cpuIdentifier ? [cpuIdentifier] : []),
      ...(memoryIdentifier ? [memoryIdentifier] : []),
      ...otherIdentifiers,
    ];
  }, [identifiers]);

  const { getAllValidationIssues } = React.useContext(ValidationContext);

  const renderField = (identifier: Identifier, type: 'requests' | 'limits') => {
    const value = data[type]?.[identifier.identifier];
    const onChange = (v: string) =>
      setData({
        ...data,
        [type]: {
          ...data[type],
          [identifier.identifier]: v,
        },
      });

    const validationIssues = getAllValidationIssues(['resources', type, identifier.identifier]);
    const validated = validationIssues.length > 0 ? 'error' : 'default';

    const field = (() => {
      switch (identifier.identifier) {
        case 'cpu':
          return (
            <CPUField
              value={value}
              onChange={onChange}
              validated={validated}
              dataTestId={`${identifier.identifier}-${type}`}
              min={0}
            />
          );
        case 'memory':
          return (
            <MemoryField
              value={value}
              onChange={onChange}
              validated={validated}
              dataTestId={`${identifier.identifier}-${type}`}
              min={0}
            />
          );
        default:
          return (
            <NumberInputWrapper
              min={0}
              value={Number(value || identifier.defaultCount)}
              onChange={(v) => onChange(String(v))}
              validated={validated}
              data-testid={`${identifier.identifier}-${type}`}
              intOnly
            />
          );
      }
    })();

    return (
      <FormGroup label={`${identifier.displayName} ${type}`}>
        {field}
        <FormHelperText>
          <HelperText>
            {validationIssues.length > 0 && (
              <HelperTextItem variant="error">
                {validationIssues.map((issue) => issue.message).join(', ')}
              </HelperTextItem>
            )}
            <HelperTextItem>
              Min = {identifier.minCount}, Max = {identifier.maxCount}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>
    );
  };

  return (
    <Stack hasGutter data-testid="hardware-profile-customize-form">
      {sortedIdentifiers.map((identifier) => (
        <StackItem key={identifier.identifier}>
          <Grid hasGutter md={12} lg={6}>
            <GridItem>{renderField(identifier, 'requests')}</GridItem>
            <GridItem>{renderField(identifier, 'limits')}</GridItem>
          </Grid>
        </StackItem>
      ))}
    </Stack>
  );
};

export default HardwareProfileCustomize;
