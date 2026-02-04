import { Button } from '@patternfly/react-core';
import React from 'react';
// import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { autoRagConfigurePathname } from '~/app/utilities/routes';

function AutoRagCreate(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <div>
      <Button
        variant="primary"
        onClick={() => {
          navigate(`${autoRagConfigurePathname}/FAKE_EXPERIMENT_ID`);
        }}
      >
        Create
      </Button>
    </div>
  );
}

export default AutoRagCreate;
