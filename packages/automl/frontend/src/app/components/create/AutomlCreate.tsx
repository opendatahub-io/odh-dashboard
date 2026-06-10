import {
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  TextArea,
  TextInput,
} from '@patternfly/react-core';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { ConfigureSchema } from '~/app/schemas/configure.schema';

function AutomlCreate(): React.JSX.Element {
  const form = useFormContext<ConfigureSchema>();

  // Use a div instead of PF's <Form> to avoid nested <form> elements,
  // since AutomlConfigurePage already renders <Stack component="form">.
  return (
    <div className="pf-v6-c-form pf-m-limit-width">
      <Controller
        control={form.control}
        name="display_name"
        render={({ field, fieldState }) => (
          <FormGroup fieldId={field.name} label="Name" isRequired>
            <TextInput
              {...field}
              id={field.name}
              data-testid="automl-name-input"
              type="text"
              isRequired
              validated={fieldState.invalid ? 'error' : undefined}
            />
            {fieldState.error && (
              <FormHelperText>
                <HelperText>
                  <HelperTextItem variant="error">{fieldState.error.message}</HelperTextItem>
                </HelperText>
              </FormHelperText>
            )}
          </FormGroup>
        )}
      />
      <Controller
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormGroup fieldId={field.name} label="Description">
            <TextArea {...field} id={field.name} data-testid="automl-description-input" />
          </FormGroup>
        )}
      />
    </div>
  );
}

export default AutomlCreate;
