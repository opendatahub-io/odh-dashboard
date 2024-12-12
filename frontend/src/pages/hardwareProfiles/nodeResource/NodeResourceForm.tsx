import React from 'react';
import {
  TextInput,
  FormGroup,
  Form,
  FormHelperText,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import { Identifier } from '~/types';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import { UnitOption } from '~/utilities/valueUnits';
import { validateDefaultCount, validateMinCount } from './utils';
import CountFormField from './CountFormField';

type NodeResourceFormProps = {
  identifier: Identifier;
  setIdentifier: UpdateObjectAtPropAndValue<Identifier>;
  unitOptions?: UnitOption[];
  isExistingIdentifier?: boolean;
  isUniqueIdentifier?: boolean;
};

const NodeResourceForm: React.FC<NodeResourceFormProps> = ({
  identifier,
  setIdentifier,
  unitOptions,
  isExistingIdentifier,
  isUniqueIdentifier,
}) => {
  const validated = isUniqueIdentifier ? 'default' : 'error';

  return (
    <Form>
      <FormGroup isRequired label="Resource label" fieldId="resource-label">
        <TextInput
          value={identifier.displayName || ''}
          onChange={(_, value) => setIdentifier('displayName', value)}
        />
      </FormGroup>

      <FormGroup isRequired label="Resource identifier" fieldId="resource-identifier">
        <TextInput
          value={identifier.identifier || ''}
          onChange={(_, value) => setIdentifier('identifier', value)}
          isDisabled={
            isExistingIdentifier &&
            (identifier.identifier === 'cpu' || identifier.identifier === 'memory')
          }
          validated={validated}
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

      <CountFormField
        label="Default"
        fieldId="default"
        identifier={identifier.identifier}
        size={identifier.defaultCount}
        setSize={(value) => setIdentifier('defaultCount', value)}
        isValid={unitOptions ? validateDefaultCount(identifier, unitOptions) : true}
        errorMessage="Default must be equal to or between the minimum and maximum allowed limits."
      />

      <CountFormField
        label="Minimum allowed"
        fieldId="minimum-allowed"
        identifier={identifier.identifier}
        size={identifier.minCount}
        setSize={(value) => setIdentifier('minCount', value)}
        isValid={unitOptions ? validateMinCount(identifier, unitOptions) : true}
        errorMessage="Minimum allowed value cannot exceed the maximum allowed value."
      />

      <CountFormField
        label="Maximum allowed"
        fieldId="maximum-allowed"
        identifier={identifier.identifier}
        size={identifier.maxCount}
        setSize={(value) => setIdentifier('maxCount', value)}
      />
    </Form>
  );
};
export default NodeResourceForm;
