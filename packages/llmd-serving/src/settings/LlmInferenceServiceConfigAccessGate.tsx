import * as React from 'react';
import { Bullseye, Spinner } from '@patternfly/react-core';
import { useAccessAllowed } from '@odh-dashboard/internal/concepts/userSSAR/useAccessAllowed';
import { verbModelAccess } from '@odh-dashboard/internal/concepts/userSSAR/utils';
import NotFound from '@odh-dashboard/ui-core/components/NotFound';
import { LLMInferenceServiceConfigModel } from '../types';

/**
 * Gates routes that manage `LLMInferenceServiceConfig` resources behind the create
 * and patch permissions their CRUD actions require, rendering NotFound otherwise.
 *
 * Delete permission is enforced per-row via SSAR on the kebab Delete action; users
 * without delete access can still view and edit configurations they can patch.
 *
 * The accelerator, topology, and routing configuration pages are all backed by this
 * same resource — they differ only by label selector — so they share this gate.
 */
const LlmInferenceServiceConfigAccessGate: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [canCreate, createLoaded] = useAccessAllowed(
    verbModelAccess('create', LLMInferenceServiceConfigModel),
  );
  const [canPatch, patchLoaded] = useAccessAllowed(
    verbModelAccess('patch', LLMInferenceServiceConfigModel),
  );

  if (!createLoaded || !patchLoaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (!canCreate || !canPatch) {
    return <NotFound />;
  }

  return <>{children}</>;
};

export default LlmInferenceServiceConfigAccessGate;
