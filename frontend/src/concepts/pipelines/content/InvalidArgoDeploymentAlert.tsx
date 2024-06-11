import { Alert, AlertActionCloseButton, AlertActionLink } from '@patternfly/react-core';
import React from 'react';
import { useBrowserStorage } from '~/components/browserStorage';
import { useIsAreaAvailable, SupportedArea } from '~/concepts/areas';
import { ODH_PRODUCT_NAME } from '~/utilities/const';

const INVALID_ARGO_DEPLOYMENT_SELF_DOCUMENTATION_URL =
  'https://access.redhat.com/documentation/en-us/red_hat_openshift_ai_self-managed/2.9/html/release_notes/new-features-and-enhancements_relnotes';

const INVALID_ARGO_DEPLOYMENT_CLOUD_DOCUMENTATION_URL =
  'https://access.redhat.com/documentation/en-us/red_hat_openshift_ai_cloud_service/1/html/release_notes/new-features-and-enhancements_relnotes';

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
      actionLinks={
        <>
          <AlertActionLink
            data-testid="self-managed-release-notes-link"
            component="a"
            href={INVALID_ARGO_DEPLOYMENT_SELF_DOCUMENTATION_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Self-Managed release notes
          </AlertActionLink>
          <AlertActionLink
            data-testid="cloud-service-release-notes-link"
            component="a"
            href={INVALID_ARGO_DEPLOYMENT_CLOUD_DOCUMENTATION_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Cloud Service release notes
          </AlertActionLink>
        </>
      }
      actionClose={
        <AlertActionCloseButton onClose={() => setInvalidArgoDeploymentAlertDismissed(true)} />
      }
      isInline
      variant="warning"
      title="Data Science Pipelines enablement failed"
    >
      Data Science Pipelines could not be enabled because a version of Argo Workflows that is not
      managed by Red Hat is installed on your cluster. To learn more, view the {ODH_PRODUCT_NAME}
      2.9 documentation.
    </Alert>
  );
};
