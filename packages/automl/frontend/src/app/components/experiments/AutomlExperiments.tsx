import { Button } from '@patternfly/react-core';
import React from 'react';
import { useNavigate, useParams } from 'react-router';
import { automlCreatePathname } from '~/app/utilities/routes';
import { useExperimentsQuery } from '~/app/hooks/queries';

function AutomlExperiments(): React.JSX.Element {
  const navigate = useNavigate();
  const { namespace } = useParams();

  const { data: experiments } = useExperimentsQuery();

  return (
    <div>
      {experiments?.map((experiment, index) => (
        <div key={index}>{JSON.stringify(experiment)}</div>
      ))}
      <Button
        variant="primary"
        isDisabled={!namespace}
        onClick={() => {
          if (!namespace) {
            return;
          }
          navigate(`${automlCreatePathname}/${namespace}`);
        }}
      >
        Create AutoML experiment
      </Button>
    </div>
  );
}

export default AutomlExperiments;
