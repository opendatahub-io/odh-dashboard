import { FormGroup, TextArea, TextInput } from '@patternfly/react-core';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';

function AutoragCreate(): React.JSX.Element {
  const form = useFormContext();

  return (
    <>
      <Controller
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormGroup fieldId={field.name} label="Name" isRequired>
            <TextInput {...field} id={field.name} type="text" />
          </FormGroup>
        )}
      />
      <Controller
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormGroup fieldId={field.name} label="Description">
            <TextArea {...field} id={field.name} />
          </FormGroup>
        )}
      />
    </>
  );
}

export default AutoragCreate;
