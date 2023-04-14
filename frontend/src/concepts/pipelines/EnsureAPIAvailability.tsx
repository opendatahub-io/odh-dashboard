import * as React from 'react';
import { Bullseye, Spinner } from '@patternfly/react-core';
import { usePipelinesAPI } from '~/concepts/pipelines/context';

type EnsureAPIAvailabilityProps = {
  children: React.ReactNode;
};

const EnsureAPIAvailability: React.FC<EnsureAPIAvailabilityProps> = ({ children }) => {
  const { apiAvailable } = usePipelinesAPI();

  if (!apiAvailable) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  return <>{children}</>;
};

export default EnsureAPIAvailability;
