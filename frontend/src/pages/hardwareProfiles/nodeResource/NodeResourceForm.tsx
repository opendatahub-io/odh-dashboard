import React from 'react';
import { TextInput, FormGroup, Form } from '@patternfly/react-core';
import { Identifier } from '~/types';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import { UnitOption } from '~/utilities/valueUnits';
import { validateDefaultCount, validateMinCount } from './utils';
import CountFormField from './CountFormField';

type NodeResourceFormProps = {
  identifier: Identifier;
  setIdentifier: UpdateObjectAtPropAndValue<Identifier>;
  unitOptions?: UnitOption[];
  existingIdentifier?: boolean;
  isUniqueIdentifier?: boolean;
};

const NodeResourceForm: React.FC<NodeResourceFormProps> = ({
  identifier,
  setIdentifier,
  unitOptions,
  existingIdentifier,
  isUniqueIdentifier,
}) => {
  const [validated, setValidated] = React.useState<'default' | 'error' | 'success'>('default');

  React.useEffect(() => {
    setValidated(isUniqueIdentifier ? 'default' : 'error');
  }, [isUniqueIdentifier]);

  return (
    <Form>
      <FormGroup label="Resource label" fieldId="resource-label">
        <TextInput
          value={identifier.displayName || ''}
          onChange={(_, value) => setIdentifier('displayName', value)}
        />
      </FormGroup>

      <FormGroup label="Resource identifier" fieldId="resource-identifier">
        <TextInput
          value={identifier.identifier || ''}
          onChange={(_, value) => setIdentifier('identifier', value)}
          isDisabled={
            existingIdentifier &&
            (identifier.identifier === 'cpu' || identifier.identifier === 'memory')
          }
          validated={validated}
        />
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
        label="Default"
        fieldId="default"
        identifier={identifier.identifier}
        size={identifier.maxCount}
        setSize={(value) => setIdentifier('maxCount', value)}
      />
    </Form>
  );
};
export default NodeResourceForm;
