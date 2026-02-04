import { Button } from '@patternfly/react-core';
import React from 'react';
import { useNavigate } from 'react-router';
import { autoRagResultsPathname } from '~/app/utilities/routes';

function AutoRagConfigure(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <div>
      <Button
        variant="primary"
        onClick={() => {
          navigate(`${autoRagResultsPathname}/FAKE_RUN_ID`);
        }}
      >
        Run experiment
      </Button>
    </div>
  );
}

export default AutoRagConfigure;
