import React from 'react';
import { AlertActionLink } from '@patternfly/react-core';

const INVALID_ARGO_DEPLOYMENT_SELF_DOCUMENTATION_URL =
  'https://docs.redhat.com/en/documentation/red_hat_openshift_ai_self-managed/3.4/html/working_with_ai_pipelines/pr01';

const INVALID_ARGO_DEPLOYMENT_CLOUD_DOCUMENTATION_URL =
  'https://docs.redhat.com/en/documentation/red_hat_openshift_ai_self-managed/3.4/html/working_with_ai_pipelines/pr01';

const PipelineMigrationNoteLinks: React.FC = () => (
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
);

export default PipelineMigrationNoteLinks;
