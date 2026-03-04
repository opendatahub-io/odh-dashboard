import { Button } from '@patternfly/react-core';
import React from 'react';
import { useNavigate, useParams } from 'react-router';
import { autoragCreatePathname } from '~/app/utilities/routes';
import { useExperimentsQuery } from '~/app/hooks/queries';

function AutoragExperiments(): React.JSX.Element {
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
        onClick={() => {
          navigate(`${autoragCreatePathname}/${namespace}`);
        }}
      >
        Create AutoRAG experiment
      </Button>
    </div>
  );
}

export default AutoragExperiments;
