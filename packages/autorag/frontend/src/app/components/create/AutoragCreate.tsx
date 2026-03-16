import { FormGroup, TextArea, TextInput } from '@patternfly/react-core';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useParams } from 'react-router';
import { ConfigureSchema } from '~/app/schemas/configure.schema';
import SecretSelector, { SecretSelection } from '../common/SecretSelector';

function AutoragCreate(): React.JSX.Element {
  const { namespace } = useParams();
  const [selectedLlamaStackSecret, setSelectedLlamaStackSecret] = React.useState<
    SecretSelection | undefined
  >();

  const form = useFormContext<ConfigureSchema>();

  return (
    <>
      <Controller
        control={form.control}
        name="display_name"
        render={({ field }) => (
          <FormGroup fieldId={field.name} label="Name" isRequired>
            <TextInput {...field} id={field.name} type="text" isRequired />
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
      <Controller
        control={form.control}
        name="llama_stack_secret_name"
        render={({ field }) => (
          <FormGroup fieldId={field.name} label="Llama Stack instance" isRequired>
            <SecretSelector
              dataTestId="lls-secret-selector"
              placeholder="Select Llama Stack secret"
              type="lls"
              namespace={namespace ?? ''}
              value={selectedLlamaStackSecret?.uuid}
              onChange={(secret) => {
                setSelectedLlamaStackSecret(secret);
                field.onChange(!secret || secret.invalid ? '' : secret.name);
              }}
            />
          </FormGroup>
        )}
      />
    </>
  );
}

export default AutoragCreate;
