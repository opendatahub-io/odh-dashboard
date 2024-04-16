import { Bullseye, Spinner } from '@patternfly/react-core';
import React from 'react';

export const LoadingState: React.FC = () => (
  <Bullseye style={{ minHeight: 150 }}>
    <Spinner />
  </Bullseye>
);
