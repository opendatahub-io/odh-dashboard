import * as React from 'react';
import { FormHelperText, HelperTextItem, HelperText } from '@patternfly/react-core';

const SystemAuthenticatedWarning: React.FC = () => (
  <FormHelperText data-testid="system-authenticated-warning">
    <HelperText>
      <HelperTextItem variant="warning">
        The <code>system:authenticated</code> group provides access to all users on this cluster.
      </HelperTextItem>
    </HelperText>
  </FormHelperText>
);

export default SystemAuthenticatedWarning;
