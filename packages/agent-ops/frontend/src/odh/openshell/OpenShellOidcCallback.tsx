import * as React from 'react';
import { Bullseye, Spinner } from '@patternfly/react-core';
import { handleOpenShellCallback } from './openShellAuth';

/**
 * Completes the OpenShell OIDC redirect / silent-renew. Registered at the
 * redirect_uri / silent_redirect_uri app routes. For the interactive redirect it
 * navigates back to the OpenShell home; for the silent iframe renew it simply
 * finalizes the token and the iframe is discarded by oidc-client-ts.
 */
const OpenShellOidcCallback: React.FC = () => {
  React.useEffect(() => {
    void handleOpenShellCallback();
  }, []);

  return (
    <Bullseye>
      <Spinner aria-label="Completing OpenShell sign-in" />
    </Bullseye>
  );
};

export default OpenShellOidcCallback;
