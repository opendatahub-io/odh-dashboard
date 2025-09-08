import React from 'react';
import {
  TextInput,
  FormGroup,
  Form,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Radio,
  Split,
  SplitItem,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { Identifier, IdentifierResourceType } from '#~/types';
import { UpdateObjectAtPropAndValue } from '#~/pages/projects/types';
import { UnitOption } from '#~/utilities/valueUnits';
import SimpleSelect, { SimpleSelectOption } from '#~/components/SimpleSelect';
import { asEnumMember } from '#~/utilities/utils';
import {
  DEFAULT_ACCELERATOR_SIZE,
  DEFAULT_CPU_SIZE,
  DEFAULT_MEMORY_SIZE,
  EMPTY_IDENTIFIER,
  HARDWARE_PROFILE_COLUMN_HELP_TOOLTIP,
} from '#~/pages/hardwareProfiles/nodeResource/const';
import DashboardHelpTooltip from '#~/concepts/dashboard/DashboardHelpTooltip';
import {
  getValidationMessage,
  validateDefaultCount,
  validateMaxCount,
  validateMinCount,
} from './utils';
import CountFormField from './CountFormField';

type NodeResourceFormProps = {
  identifier: Identifier;
  setIdentifier: UpdateObjectAtPropAndValue<Identifier>;
  unitOptions?: UnitOption[];
  isUniqueIdentifier?: boolean;
};

const NodeResourceForm: React.FC<NodeResourceFormProps> = ({
  identifier,
  setIdentifier,
  unitOptions,
  isUniqueIdentifier,
}) => {
  const validated = isUniqueIdentifier ? 'default' : 'error';
  const defaultCountValidation = validateDefaultCount(identifier, unitOptions);
  const minCountValidation = validateMinCount(identifier, unitOptions);
  const maxCountValidation = validateMaxCount(identifier, unitOptions);
  const [isUnlimitedMax, setUnlimitedMax] = React.useState(false);

  return (
    <Form>
      <FormGroup isRequired label="Resource name" fieldId="resource-name">
        <TextInput
          id="node-resource-name-input"
          value={identifier.displayName || ''}
          onChange={(_, value) => setIdentifier('displayName', value)}
          data-testid="node-resource-name-input"
        />
      </FormGroup>

      <FormGroup isRequired label="Resource identifier" fieldId="resource-identifier">
        <TextInput
          id="node-resource-identifier-input"
          value={identifier.identifier || ''}
          onChange={(_, value) => setIdentifier('identifier', value)}
          validated={validated}
          data-testid="node-resource-identifier-input"
        />
        {!isUniqueIdentifier && (
          <FormHelperText>
            <HelperText>
              <HelperTextItem data-testid="resource-identifier-error" variant="error">
                Another resource with the same identifier already exists. The resource identifier
                must be unique.
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        )}
      </FormGroup>

      <FormGroup isRequired label="Resource type" fieldId="resource-type">
        <SimpleSelect
          dataTestId="node-resource-type-select"
          isFullWidth
          options={[
            ...Object.values(IdentifierResourceType).map(
              (v): SimpleSelectOption => ({
                key: v,
                label: v,
              }),
            ),
            { key: 'Other', label: 'Other' },
          ]}
          value={identifier.resourceType || 'Other'}
          onChange={(value) => {
            const resourceType = asEnumMember(value, IdentifierResourceType);
            switch (resourceType) {
              case IdentifierResourceType.CPU:
                setIdentifier('resourceType', resourceType);
                setIdentifier('minCount', DEFAULT_CPU_SIZE.minCount);
                setIdentifier('maxCount', DEFAULT_CPU_SIZE.maxCount);
                setIdentifier('defaultCount', DEFAULT_CPU_SIZE.defaultCount);
                break;
              case IdentifierResourceType.MEMORY:
                setIdentifier('resourceType', resourceType);
                setIdentifier('minCount', DEFAULT_MEMORY_SIZE.minCount);
                setIdentifier('maxCount', DEFAULT_MEMORY_SIZE.maxCount);
                setIdentifier('defaultCount', DEFAULT_MEMORY_SIZE.defaultCount);
                break;
              case IdentifierResourceType.ACCELERATOR:
                setIdentifier('resourceType', resourceType);
                setIdentifier('minCount', DEFAULT_ACCELERATOR_SIZE.minCount);
                setIdentifier('maxCount', DEFAULT_ACCELERATOR_SIZE.maxCount);
                setIdentifier('defaultCount', DEFAULT_ACCELERATOR_SIZE.defaultCount);
                break;
              default:
                setIdentifier('resourceType', undefined);
                setIdentifier('minCount', EMPTY_IDENTIFIER.minCount);
                setIdentifier('maxCount', EMPTY_IDENTIFIER.maxCount);
                setIdentifier('defaultCount', EMPTY_IDENTIFIER.defaultCount);
            }
          }}
        />
      </FormGroup>

      <CountFormField
        label="Default"
        fieldId="default"
        type={identifier.resourceType}
        size={identifier.defaultCount}
        setSize={(value) => setIdentifier('defaultCount', value)}
        isValid={defaultCountValidation.isValid}
        errorMessage={getValidationMessage(defaultCountValidation.issues)}
        tooltip={HARDWARE_PROFILE_COLUMN_HELP_TOOLTIP.defaultCount}
        isRequired
      />

      <CountFormField
        label="Minimum allowed"
        fieldId="minimum-allowed"
        type={identifier.resourceType}
        size={identifier.minCount}
        setSize={(value) => setIdentifier('minCount', value)}
        isValid={minCountValidation.isValid}
        errorMessage={getValidationMessage(minCountValidation.issues)}
        tooltip={HARDWARE_PROFILE_COLUMN_HELP_TOOLTIP.minCount}
        isRequired
      />

      <FormGroup
        label="Maximum allowed"
        fieldId="maximum-allowed"
        labelHelp={<DashboardHelpTooltip content={HARDWARE_PROFILE_COLUMN_HELP_TOOLTIP.maxCount} />}
      >
        <Stack hasGutter>
          <StackItem>
            <Split hasGutter>
              <SplitItem>
                <Radio
                  id="limited-radio"
                  name="max-limit"
                  label="Set maximum limit"
                  isChecked={!isUnlimitedMax}
                  onChange={() => {
                    setUnlimitedMax(false);
                    setIdentifier('maxCount', identifier.minCount || 1);
                  }}
                  data-testid="node-resource-max-limited"
                />
              </SplitItem>
              <SplitItem>
                <Radio
                  id="unlimited-radio"
                  name="max-limit"
                  label="No maximum limit"
                  isChecked={isUnlimitedMax}
                  onChange={() => {
                    setUnlimitedMax(true);
                    setIdentifier('maxCount', undefined);
                  }}
                  data-testid="node-resource-max-unlimited"
                />
              </SplitItem>
            </Split>
          </StackItem>
          <StackItem>
            {!isUnlimitedMax && (
              <CountFormField
                fieldId="maximum-allowed"
                type={identifier.resourceType}
                size={identifier.maxCount ?? 1}
                setSize={(value) => setIdentifier('maxCount', value)}
                isValid={maxCountValidation.isValid}
                errorMessage={getValidationMessage(maxCountValidation.issues)}
              />
            )}
          </StackItem>
        </Stack>
      </FormGroup>
    </Form>
  );
};
export default NodeResourceForm;
