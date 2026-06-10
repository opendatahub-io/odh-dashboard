import React from 'react';
import { Alert } from '@patternfly/react-core';
import { useBffStatus } from '~/app/context/BffStatusContext';

const BffStatusAlert: React.FC = () => {
  const { connected, loaded, version, error } = useBffStatus();

  if (!loaded) {
    return <Alert variant="info" isInline title="Checking BFF connectivity..." />;
  }
  if (error) {
    return (
      <Alert variant="danger" isInline title="BFF is not reachable">
        Proxy and WebSocket features require a running BFF. {error}
      </Alert>
    );
  }
  return (
    <Alert
      variant="success"
      isInline
      title={connected && version ? `BFF connected (${version})` : 'BFF connected'}
    />
  );
};

export default BffStatusAlert;
