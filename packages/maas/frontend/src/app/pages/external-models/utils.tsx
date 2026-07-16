import * as React from 'react';
import { ExternalModel } from '~/app/types/external-models';
import { PhaseStatus } from '~/app/utilities/phaseLabelUtils';

export const getExternalModelStatusMessage = (externalModel: ExternalModel): React.ReactNode => {
  const modelName = <strong>{externalModel.displayName ?? externalModel.name}</strong>;

  if (externalModel.phase === PhaseStatus.PENDING) {
    return (
      <>
        {modelName} is being reconciled. The controller is creating networking resources
        (HTTPRoutes, service entries) and validating provider connections. This typically completes
        within a few seconds.
      </>
    );
  }
  if (externalModel.phase === PhaseStatus.FAILED) {
    return (
      <>
        {modelName} could not be reconciled. Common causes include a missing ExternalProvider
        reference, a Secret that doesn&apos;t exist in the namespace, a missing config key
        referenced as a {'{key}'} placeholder in the path, or a network policy blocking Istio
        resource creation. Check the model&apos;s conditions for details.
      </>
    );
  }
  if (externalModel.phase === PhaseStatus.READY) {
    return (
      <>
        All networking resources for {modelName} have been created successfully. The HTTPRoute is
        active and inference requests are being routed to the configured provider(s).
      </>
    );
  }
  return null;
};
