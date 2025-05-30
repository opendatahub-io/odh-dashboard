import * as React from 'react';
import { Bullseye, Spinner } from '@patternfly/react-core';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';

type EnsureAPIAvailabilityProps = {
  children: React.ReactNode;
};

const EnsureAPIAvailability: React.FC<EnsureAPIAvailabilityProps> = ({ children }) => {
  const { apiAvailable, pipelinesServer } = usePipelinesAPI();
  if (!apiAvailable && pipelinesServer.compatible) {
    return (
      <Bullseye style={{ minHeight: 150 }} data-testid="pipelines-api-not-available">
        <Spinner />
      </Bullseye>
    );
  }

  return <>{children}</>;
};

export default EnsureAPIAvailability;
