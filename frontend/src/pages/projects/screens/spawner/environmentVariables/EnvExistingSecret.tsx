import * as React from 'react';
import { Alert } from '@patternfly/react-core';
import type { ExistingSecretRef } from '#~/pages/projects/types';

type EnvExistingSecretProps = {
  existingSecretRefs: ExistingSecretRef[];
  onUpdate: (refs: ExistingSecretRef[]) => void;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- stub; Task 4 will use onUpdate
const EnvExistingSecret: React.FC<EnvExistingSecretProps> = ({ existingSecretRefs, onUpdate }) => (
  <Alert
    variant="info"
    isInline
    isPlain
    title="Existing secret selection"
    data-testid="existing-secret-section"
  >
    {existingSecretRefs.length === 0
      ? 'Select secrets from the dropdown above.'
      : `${existingSecretRefs.length} secret(s) selected.`}
  </Alert>
);

export default EnvExistingSecret;
