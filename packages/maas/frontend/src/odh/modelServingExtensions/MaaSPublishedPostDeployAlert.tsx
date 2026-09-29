import React from 'react';
import { Alert, AlertActionCloseButton, AlertActionLink } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import {
  dismissPostDeployAlert,
  useHasPostDeployAlert,
} from '@odh-dashboard/model-serving/concepts/postDeployAlertStore';
import { useIsMaasAdmin } from '~/app/hooks/useIsMaasAdmin';

export const MAAS_PUBLISHED_INTERNAL_ALERT_ID = 'maas-model-published-internal';
export const MAAS_PUBLISHED_EXTERNAL_ALERT_ID = 'maas-model-published-external';

type MaaSPublishedPostDeployAlertProps = {
  alertId: string;
};

export const MaaSPublishedPostDeployAlert: React.FC<MaaSPublishedPostDeployAlertProps> = ({
  alertId,
}) => {
  const navigate = useNavigate();
  const isVisible = useHasPostDeployAlert(alertId);
  const [isMaasAdmin, isMaasAdminLoaded] = useIsMaasAdmin();

  if (!isVisible) {
    return null;
  }

  return (
    <Alert
      className="pf-v6-u-mb-md"
      variant="info"
      isInline
      title="Additional configuration required"
      data-testid="maas-published-post-deploy-alert"
      actionClose={<AlertActionCloseButton onClose={() => dismissPostDeployAlert(alertId)} />}
      actionLinks={
        isMaasAdminLoaded && isMaasAdmin ? (
          <AlertActionLink
            data-testid="maas-published-post-deploy-alert-link"
            onClick={() => navigate('/maas/maas-governance')}
          >
            Go to MaaS governance
          </AlertActionLink>
        ) : undefined
      }
    >
      When you enable a model for subscribed users, its endpoints are not accessible until an admin
      configures a subscription and authorization policy on the <strong>MaaS governance</strong>{' '}
      page. Users can view their API keys, subscriptions, and accessible models on the{' '}
      <strong>API keys</strong> page.
    </Alert>
  );
};

/** No-props wrapper for the model-serving banner extension */
export const MaaSPublishedInternalPostDeployAlert: React.FC = () => (
  <MaaSPublishedPostDeployAlert alertId={MAAS_PUBLISHED_INTERNAL_ALERT_ID} />
);
