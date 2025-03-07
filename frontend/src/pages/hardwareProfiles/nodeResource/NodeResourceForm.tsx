import React from 'react';
import {
  TextInput,
  FormGroup,
  Form,
  FormHelperText,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import { Identifier, IdentifierResourceType } from '~/types';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import { UnitOption } from '~/utilities/valueUnits';
import SimpleSelect from '~/components/SimpleSelect';
import { asEnumMember } from '~/utilities/utils';
import {
  DEFAULT_CPU_SIZE,
  DEFAULT_MEMORY_SIZE,
  EMPTY_IDENTIFIER,
} from '~/pages/hardwareProfiles/nodeResource/const';
import { validateDefaultCount, validateMinCount } from './utils';
import CountFormField from './CountFormField';

type NodeResourceFormProps = {
  identifier: Identifier;
  setIdentifier: UpdateObjectAtPropAndValue<Identifier>;
  setData: UpdateObjectAtPropAndValue<{
    resourceLabel: string;
    resourceIdentifier: string;
  }>;
  unitOptions?: UnitOption[];
  isUniqueIdentifier?: boolean;
  resourceLabelErrorMessage?: string;
  resourceIdentifierErrorMessage?: string;
};

const NodeResourceForm: React.FC<NodeResourceFormProps> = ({
  identifier,
  setIdentifier,
  setData,
  unitOptions,
  isUniqueIdentifier,
  resourceLabelErrorMessage,
  resourceIdentifierErrorMessage,
}) => {
  const validated = isUniqueIdentifier ? 'default' : 'error';

  return (
    <Form>
      <FormGroup isRequired label="Resource label" fieldId="resource-label">
        <TextInput
          id="node-resource-label-input"
          value={identifier.displayName || ''}
          onChange={(_, value) => {
            setData('resourceLabel', value);
            setIdentifier('displayName', value);
          }}
          data-testid="node-resource-label-input"
        />
        {resourceLabelErrorMessage && (
          <FormHelperText>
            <HelperText>
              <HelperTextItem data-testid="resource-label-limits-error" variant="error">
                {resourceLabelErrorMessage}
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        )}
      </FormGroup>

      <FormGroup isRequired label="Resource identifier" fieldId="resource-identifier">
        <TextInput
          id="node-resource-identifier-input"
          value={identifier.identifier || ''}
          onChange={(_, value) => {
            setData('resourceIdentifier', value);
            setIdentifier('identifier', value);
          }}
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
        {resourceIdentifierErrorMessage && (
          <FormHelperText>
            <HelperText>
              <HelperTextItem data-testid="resource-identifier-limits-error" variant="error">
                {resourceIdentifierErrorMessage}
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
            ...Object.values(IdentifierResourceType).map((v) => ({
              key: v,
              label: v,
            })),
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
        isValid={validateDefaultCount(identifier, unitOptions)}
        errorMessage="Default must be equal to or between the minimum and maximum allowed limits."
      />

      <CountFormField
        label="Minimum allowed"
        fieldId="minimum-allowed"
        type={identifier.resourceType}
        size={identifier.minCount}
        setSize={(value) => setIdentifier('minCount', value)}
        isValid={validateMinCount(identifier, unitOptions)}
        errorMessage="Minimum allowed value cannot exceed the maximum allowed value."
      />

      <CountFormField
        label="Maximum allowed"
        fieldId="maximum-allowed"
        type={identifier.resourceType}
        size={identifier.maxCount}
        setSize={(value) => setIdentifier('maxCount', value)}
      />
    </Form>
  );
};
export default NodeResourceForm;
