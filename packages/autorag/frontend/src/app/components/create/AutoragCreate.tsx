import { zodResolver } from '@hookform/resolvers/zod';
import { ActionGroup, Button, Form, FormGroup, TextArea, TextInput } from '@patternfly/react-core';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { experimentSchema } from '~/app/schemas/experiment.schema';
import { autoragConfigurePathname, autoragExperimentsPathname } from '~/app/utilities/routes';

function AutoragCreate(): React.JSX.Element {
  const navigate = useNavigate();

  const form = useForm({
    mode: 'onChange',
    resolver: zodResolver(experimentSchema),
    defaultValues: experimentSchema.parse({}), // Clever way to pull default values out of zod schema.
  });

  return (
    <Form>
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
      <ActionGroup>
        <Button
          variant="primary"
          isDisabled={!form.formState.isValid}
          onClick={() => {
            form.handleSubmit(() => {
              navigate(`${autoragConfigurePathname}/FAKE_EXPERIMENT_ID`);
            })();
          }}
        >
          Create
        </Button>
        <Button
          variant="link"
          onClick={() => {
            navigate(autoragExperimentsPathname);
          }}
        >
          Cancel
        </Button>
      </ActionGroup>
    </Form>
  );
}

export default AutoragCreate;
