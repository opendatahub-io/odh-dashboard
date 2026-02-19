import { Button } from '@patternfly/react-core';
import React, { useEffect } from 'react';
import { useFormState } from 'react-hook-form';
import { useNavigate } from 'react-router';
import experimentForm from '~/app/forms/experiment.form';
import { autoRagConfigurePathname } from '~/app/utilities/routes';
import ExperimentForm from './ExperimentForm';

function AutoRagCreate(): React.JSX.Element {
  const navigate = useNavigate();

  const formState = useFormState({ control: experimentForm.control });

  useEffect(() => {
    experimentForm.reset();
  }, []);

  return (
    <div>
      <ExperimentForm />
      <Button
        variant="primary"
        isDisabled={!formState.isValid}
        onClick={async () => {
          experimentForm.handleSubmit(() => {
            navigate(`${autoRagConfigurePathname}/FAKE_EXPERIMENT_ID`);
          })();
        }}
      >
        Create
      </Button>
    </div>
  );
}

export default AutoRagCreate;
