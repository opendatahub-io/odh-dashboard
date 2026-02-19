import { Form, FormGroup, TextArea, TextInput } from '@patternfly/react-core';
import React from 'react';
import { Controller } from 'react-hook-form';
import experimentForm from '~/app/forms/experiment.form';
import Experiment from '~/app/schemas/experiment.schema';
import { getRequiredFields } from '~/app/utilities/schema';

const requiredFields = getRequiredFields(Experiment);

function ExperimentForm(): React.JSX.Element {
  return (
    <Form>
      <Controller
        control={experimentForm.control}
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
        control={experimentForm.control}
        name="description"
        render={({ field }) => (
          <FormGroup
            fieldId={field.name}
            label="Description"
            isRequired={requiredFields.includes(field.name)}
          >
            <TextArea {...field} id={field.name} isRequired={requiredFields.includes(field.name)} />
          </FormGroup>
        )}
      />
    </Form>
  );
}

export default ExperimentForm;
