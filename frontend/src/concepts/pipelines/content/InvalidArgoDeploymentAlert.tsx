import React from 'react';
import { Alert, AlertActionCloseButton } from '@patternfly/react-core';
import { useBrowserStorage } from '#~/components/browserStorage/BrowserStorageContext';
import { useIsAreaAvailable, SupportedArea } from '#~/concepts/areas';
import PipelineMigrationNoteLinks from '#~/concepts/pipelines/content/PipelineMigrationNoteLinks';
import { ODH_PRODUCT_NAME } from '#~/utilities/const';

export const InvalidArgoDeploymentAlert: React.FC = () => {
  const [invalidArgoDeploymentAlertDismissed, setInvalidArgoDeploymentAlertDismissed] =
    useBrowserStorage('invalidArgoDeploymentAlertDismissed', false, true, true);

  const showMessage =
    useIsAreaAvailable(SupportedArea.DS_PIPELINES).customCondition(
      ({ dscStatus }) =>
        !!dscStatus?.conditions.some(
          (c) => c.type === 'CapabilityDSPv2Argo' && c.status === 'False',
        ),
    ) && !invalidArgoDeploymentAlertDismissed;

  if (!showMessage) {
    return null;
  }

  return (
    <Alert
      data-testid="invalid-argo-alert"
      actionLinks={<PipelineMigrationNoteLinks />}
      actionClose={
        <AlertActionCloseButton onClose={() => setInvalidArgoDeploymentAlertDismissed(true)} />
      }
      isInline
      variant="warning"
      title="Data Science Pipelines enablement failed"
    >
      Data Science Pipelines could not be enabled because a version of Argo Workflows that is not
      managed by Red Hat is installed on your cluster. To learn more, view the {ODH_PRODUCT_NAME}{' '}
      2.9 documentation.
    </Alert>
  );
};
