import React from 'react';
import { TextInput, FormGroup, Form } from '@patternfly/react-core';
import { Identifier } from '~/types';

type NodeResourceFormProps = {
  identifier: Identifier;
  onUpdate: (data: Identifier) => void;
};

const NodeResourceForm: React.FC<NodeResourceFormProps> = ({ identifier, onUpdate }) => {
  const handleFieldUpdate = (field: keyof Identifier, value: unknown) => {
    onUpdate({ ...identifier, [field]: value });
  };

  return (
    <Form>
      <FormGroup label="Resource lable" fieldId="resource-lable">
        <TextInput
          value={identifier.displayName || ''}
          onChange={(_, value) => handleFieldUpdate('displayName', value)}
        />
      </FormGroup>

      <FormGroup label="Resource identifier" fieldId="resource-identifier">
        <TextInput
          value={identifier.identifier || ''}
          onChange={(_, value) => handleFieldUpdate('identifier', value)}
        />
      </FormGroup>

      <FormGroup label="Default" fieldId="default">
        <TextInput
          value={identifier.defaultCount || ''}
          onChange={(_, value) => handleFieldUpdate('defaultCount', value)}
        />
      </FormGroup>
      <FormGroup label="Minimum allowed" fieldId="minimum-allowed">
        <TextInput
          value={identifier.minCount || ''}
          onChange={(_, value) => handleFieldUpdate('minCount', value)}
        />
      </FormGroup>

      <FormGroup label="Maximum allowed" fieldId="maximum-allowed">
        <TextInput
          value={identifier.maxCount || ''}
          onChange={(_, value) => handleFieldUpdate('maxCount', value)}
        />
      </FormGroup>
    </Form>
  );
};

export default NodeResourceForm;
