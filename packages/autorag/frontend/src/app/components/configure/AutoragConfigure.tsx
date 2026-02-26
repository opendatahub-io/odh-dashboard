import { Button } from '@patternfly/react-core';
import React from 'react';
import { useNavigate } from 'react-router';
import { autoragResultsPathname } from '~/app/utilities/routes';

function AutoragConfigure(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <div>
      <Button
        variant="primary"
        onClick={() => {
          navigate(`${autoragResultsPathname}/FAKE_RUN_ID`);
        }}
      >
        Run experiment
      </Button>
    </div>
  );
}

export default AutoragConfigure;
