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
  Popover,
  Button,
} from '@patternfly/react-core';
import { QuestionCircleIcon } from '@patternfly/react-icons';
import { ContainerResources, Identifier } from '#~/types';
import CPUField from '#~/components/CPUField';
import MemoryField from '#~/components/MemoryField';
import NumberInputWrapper from '#~/components/NumberInputWrapper';
import { ValidationContext } from '#~/utilities/useValidation';
import DashboardHelpTooltip from '#~/concepts/dashboard/DashboardHelpTooltip';
import { formatResourceValue } from './utils';

type HardwareProfileCustomizeProps = {
  identifiers: Identifier[];
  hardwareValidationPath?: string[];
  hideLimitOption?: boolean;
  data: ContainerResources;
  setData: (data: ContainerResources) => void;
};

const HardwareProfileCustomize: React.FC<HardwareProfileCustomizeProps> = ({
  identifiers,
  hardwareValidationPath = [],
  hideLimitOption,
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
        ...(hideLimitOption && { limits: { ...data.limits, [identifier.identifier]: v } }),
      });

    const validationIssues = getAllValidationIssues([
      ...hardwareValidationPath,
      'resources',
      type,
      identifier.identifier,
    ]);
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
      <FormGroup
        label={`${identifier.displayName} ${type}`}
        labelHelp={
          <DashboardHelpTooltip
            content={
              type === 'requests'
                ? `The minimum amount of ${identifier.identifier} that will be reserved for this workload. The scheduler will only place the workload on nodes that can provide this amount.`
                : `The maximum amount of ${identifier.identifier} that this workload is allowed to use. If exceeded, the workload may be terminated or throttled.`
            }
          />
        }
      >
        {field}
        <FormHelperText>
          <HelperText>
            {validationIssues.length > 0 && (
              <HelperTextItem variant="error">
                {validationIssues.map((issue) => issue.message).join(', ')}
              </HelperTextItem>
            )}
            <HelperTextItem>
              Min = {formatResourceValue(identifier.minCount, identifier.resourceType)}, Max ={' '}
              {identifier.maxCount === undefined
                ? 'unrestricted'
                : formatResourceValue(identifier.maxCount, identifier.resourceType)}
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
            {!hideLimitOption && <GridItem>{renderField(identifier, 'limits')}</GridItem>}
          </Grid>
        </StackItem>
      ))}
      <StackItem>
        <Popover
          headerContent="Requests and Limits"
          minWidth="50rem"
          bodyContent={
            <Stack hasGutter>
              <StackItem>
                <p>
                  <strong>Requests:</strong> A request is the guaranteed minimum amount of a
                  resource to be used by a container. Your workload will be scheduled on a node with
                  the requested amount of resources available.
                </p>
              </StackItem>
              <StackItem>
                <p>
                  <strong>Limits:</strong> A limit is the maximum amount of a resource that can be
                  used by a container. If CPU or GPU limits are exceeded, they are throttled and the
                  container is slowed. If the memory limit is exceeded, the container is killed.
                </p>
              </StackItem>
              <StackItem>
                <p>
                  Request and limit values must be within the minimum and maximum bounds defined by
                  your administrator.
                </p>
              </StackItem>
            </Stack>
          }
        >
          <Button
            variant="link"
            isInline
            icon={<QuestionCircleIcon />}
            data-testid="requests-limits-info-button"
          >
            Learn more about requests and limits
          </Button>
        </Popover>
      </StackItem>
    </Stack>
  );
};

export default HardwareProfileCustomize;
