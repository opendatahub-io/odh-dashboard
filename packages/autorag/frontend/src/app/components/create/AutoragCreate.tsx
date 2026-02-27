import { zodResolver } from '@hookform/resolvers/zod';
import { ActionGroup, Button, Form, FormGroup, TextArea, TextInput } from '@patternfly/react-core';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router';
import createExperimentSchema from '~/app/schemas/experiment.schema';
import { autoragConfigurePathname } from '~/app/utilities/routes';
import { getRequiredFields } from '~/app/utilities/schema';

function AutoragCreate(): React.JSX.Element {
  const navigate = useNavigate();
  const { namespace } = useParams();

  const experimentSchema = createExperimentSchema();
  const requiredFields = getRequiredFields(experimentSchema);
  const form = useForm({
    mode: 'onChange',
    resolver: zodResolver(experimentSchema),
    defaultValues: experimentSchema.parse({}), // Clever way to pull default values out of zod schema.
  });

  return (
    <div>
      <Form>
        <Controller
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormGroup
              fieldId={field.name}
              label="Name"
              isRequired={requiredFields.includes(field.name)}
            >
              <TextInput
                {...field}
                id={field.name}
                type="text"
                isRequired={requiredFields.includes(field.name)}
              />
            </FormGroup>
          )}
        />

        <Controller
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormGroup
              fieldId={field.name}
              label="Description"
              isRequired={requiredFields.includes(field.name)}
            >
              <TextArea
                {...field}
                id={field.name}
                isRequired={requiredFields.includes(field.name)}
              />
            </FormGroup>
          )}
        />
        <ActionGroup>
          <Button
            variant="primary"
            isDisabled={!form.formState.isValid}
            onClick={async () => {
              form.handleSubmit(() => {
                navigate(`${autoragConfigurePathname}/${namespace}/FAKE_EXPERIMENT_ID`);
              })();
            }}
          >
            Create
          </Button>
        </ActionGroup>
      </Form>
    </div>
  );
}

export default AutoragCreate;
