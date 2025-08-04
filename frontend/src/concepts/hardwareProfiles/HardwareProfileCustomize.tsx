import * as React from 'react';
import {
  FormGroup,
  Grid,
  GridItem,
  Stack,
  StackItem,
  Popover,
  Button,
  FormHelperText,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import { QuestionCircleIcon } from '@patternfly/react-icons';
import { ContainerResources, Identifier } from '#~/types';
import CPUField, { CPUFieldWithCheckbox } from '#~/components/CPUField';
import MemoryField, { MemoryFieldWithCheckbox } from '#~/components/MemoryField';
import NumberInputWrapper, {
  NumberInputWrapperWithCheckbox,
} from '#~/components/NumberInputWrapper';
import { ValidationContext } from '#~/utilities/useValidation';
import {
  formatResourceValue,
  hardwareProfileIdentifierHelpMessage,
} from '#~/concepts/hardwareProfiles/utils.ts';
import { HARDWARE_PROFILES_MISSING_REQUEST_MESSAGE } from '#~/concepts/hardwareProfiles/const.ts';
import DashboardHelpTooltip from '#~/concepts/dashboard/DashboardHelpTooltip';
import { ProfileIdentifier, ProfileIdentifierType } from './types';

type HardwareProfileCustomizeProps = {
  identifiers: Identifier[];
  hardwareValidationPath?: string[];
  hideLimitOption?: boolean;
  data: ContainerResources;
  setData: (data: ContainerResources) => void;
  isLegacyHardwareProfile?: boolean;
};

const HardwareProfileCustomize: React.FC<HardwareProfileCustomizeProps> = ({
  identifiers,
  hardwareValidationPath = [],
  hideLimitOption,
  data,
  setData,
  isLegacyHardwareProfile = false,
}) => {
  // Sort identifiers to put CPU and Memory first
  const sortedIdentifiers = React.useMemo(() => {
    const cpuIdentifier = identifiers.find((i) => i.identifier === ProfileIdentifier.CPU);
    const memoryIdentifier = identifiers.find((i) => i.identifier === ProfileIdentifier.MEMORY);
    const otherIdentifiers = identifiers.filter(
      (i) => i.identifier !== ProfileIdentifier.CPU && i.identifier !== ProfileIdentifier.MEMORY,
    );

    return [
      ...(cpuIdentifier ? [cpuIdentifier] : []),
      ...(memoryIdentifier ? [memoryIdentifier] : []),
      ...otherIdentifiers,
    ];
  }, [identifiers]);

  const { getAllValidationIssues } = React.useContext(ValidationContext);

  const renderField = (identifier: Identifier, type: ProfileIdentifierType) => {
    const value = data[type]?.[identifier.identifier];
    const onChange = (v: string | undefined) => {
      if (v === undefined && isLegacyHardwareProfile) {
        const restOfType = data[type] || {};
        delete restOfType[identifier.identifier];
        const nextData: ContainerResources = {
          ...data,
          [type]: restOfType,
        };
        if (type === ProfileIdentifierType.REQUEST) {
          const restOfLimits = data.limits || {};
          delete restOfLimits[identifier.identifier];
          nextData.limits = restOfLimits;
        }
        setData(nextData);
      } else {
        setData({
          ...data,
          [type]: {
            ...data[type],
            [identifier.identifier]: v,
          },
          ...(hideLimitOption && { limits: { ...data.limits, [identifier.identifier]: v } }),
        });
      }
    };

    const validationIssues = getAllValidationIssues([
      ...hardwareValidationPath,
      'resources',
      type,
      identifier.identifier,
    ]);
    const validated = validationIssues.length > 0 ? 'error' : 'default';
    const isDisabled =
      type === ProfileIdentifierType.LIMIT && !data.requests?.[identifier.identifier];
    const checkboxId = `${identifier.identifier}-${type}-checkbox`;
    const dataTestId = `${identifier.identifier}-${type}`;
    const helperMessage = hardwareProfileIdentifierHelpMessage(identifier.identifier, type);
    const checkboxTooltip = isDisabled ? HARDWARE_PROFILES_MISSING_REQUEST_MESSAGE : helperMessage;
    const field = (() => {
      switch (identifier.identifier) {
        case ProfileIdentifier.CPU:
          return isLegacyHardwareProfile ? (
            <CPUFieldWithCheckbox
              value={value}
              onChange={onChange}
              validated={validated}
              dataTestId={dataTestId}
              checkboxId={checkboxId}
              label={`CPU ${type}`}
              isDisabled={isDisabled}
              checkboxTooltip={checkboxTooltip}
              min={0}
            />
          ) : (
            <CPUField
              value={value}
              onChange={onChange}
              validated={validated}
              dataTestId={dataTestId}
              min={0}
            />
          );
        case ProfileIdentifier.MEMORY:
          return isLegacyHardwareProfile ? (
            <MemoryFieldWithCheckbox
              value={value}
              onChange={onChange}
              validated={validated}
              dataTestId={dataTestId}
              checkboxId={checkboxId}
              label={`Memory ${type}`}
              isDisabled={isDisabled}
              checkboxTooltip={checkboxTooltip}
              min={0}
            />
          ) : (
            <MemoryField
              value={value}
              onChange={onChange}
              validated={validated}
              dataTestId={dataTestId}
              min={0}
            />
          );
        default:
          return isLegacyHardwareProfile ? (
            <NumberInputWrapperWithCheckbox
              min={0}
              value={value ? Number(value) : undefined}
              onChange={(v) => onChange(v !== undefined ? String(v) : undefined)}
              validated={validated}
              dataTestId={dataTestId}
              checkboxId={checkboxId}
              label={`${identifier.displayName} ${type}`}
              isDisabled={isDisabled}
              checkboxTooltip={checkboxTooltip}
              intOnly
            />
          ) : (
            <NumberInputWrapper
              min={0}
              value={Number(value || identifier.defaultCount)}
              onChange={(v) => onChange(String(v))}
              validated={validated}
              data-testid={dataTestId}
              intOnly
            />
          );
      }
    })();

    const renderFormHelper = () => (
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
    );

    return isLegacyHardwareProfile ? (
      <FormGroup>
        {field}
        {renderFormHelper()}
      </FormGroup>
    ) : (
      <FormGroup
        label={`${identifier.displayName} ${type}`}
        labelHelp={<DashboardHelpTooltip content={helperMessage} />}
      >
        {field}
        {renderFormHelper()}
      </FormGroup>
    );
  };

  return (
    <Stack hasGutter data-testid="hardware-profile-customize-form">
      {sortedIdentifiers.map((identifier) => (
        <StackItem key={identifier.identifier}>
          <Grid hasGutter md={12} lg={6}>
            <GridItem>{renderField(identifier, ProfileIdentifierType.REQUEST)}</GridItem>
            {!hideLimitOption && (
              <GridItem>{renderField(identifier, ProfileIdentifierType.LIMIT)}</GridItem>
            )}
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
