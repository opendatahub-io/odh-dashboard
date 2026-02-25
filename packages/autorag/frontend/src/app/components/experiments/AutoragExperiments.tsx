import { Button } from '@patternfly/react-core';
import React from 'react';
import { useNavigate, useParams } from 'react-router';
import { autoRagCreatePathname } from '~/app/utilities/routes';
import { useExperimentsQuery } from '../../hooks/queries';

function AutoRagExperiments(): React.JSX.Element {
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
          navigate(`${autoRagCreatePathname}/${namespace}`);
        }}
      >
        Create AutoRAG experiment
      </Button>
    </div>
  );
}

export default AutoRagExperiments;
