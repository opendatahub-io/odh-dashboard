import React from 'react';
import { Alert, AlertActionCloseButton, AlertActionLink } from '@patternfly/react-core';
import { useFetchState } from 'mod-arch-core';
import { useLocation, useNavigate } from 'react-router-dom';
import { getMaaSWhoAmI } from '~/app/api/whoami';
import {
  cancelScheduledPostDeployAlertDismiss,
  dismissPostDeployAlert,
  schedulePostDeployAlertDismiss,
  syncPostDeployAlertPath,
  useHasPostDeployAlert,
  usePostDeployAlert,
} from '~/app/utilities/postDeployAlertStore';

export const MAAS_PUBLISHED_INTERNAL_ALERT_ID = 'maas-model-published-internal';
export const MAAS_PUBLISHED_EXTERNAL_ALERT_ID = 'maas-model-published-external';

type MaaSPublishedPostDeployAlertProps = {
  alertId: string;
  modelName: string;
};

export const MaaSPublishedPostDeployAlert: React.FC<MaaSPublishedPostDeployAlertProps> = ({
  alertId,
  modelName,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isVisible = useHasPostDeployAlert(alertId);
  const [whoAmI, isMaasAdminLoaded] = useFetchState(getMaaSWhoAmI(), {
    sub: '',
    isAdmin: false,
  });
  const isMaasAdmin = whoAmI.isAdmin;

  React.useEffect(() => {
    if (!isVisible) {
      return;
    }
    cancelScheduledPostDeployAlertDismiss(alertId);
    syncPostDeployAlertPath(alertId, location.pathname);
    return () => {
      schedulePostDeployAlertDismiss(alertId);
    };
  }, [isVisible, alertId, location.pathname]);

  if (!isVisible) {
    return null;
  }

  return (
    <Alert
      className="pf-v6-u-mb-md"
      variant="info"
      isInline
      title={`Additional configuration required for ${modelName}`}
      data-testid="maas-published-post-deploy-alert"
      actionClose={<AlertActionCloseButton onClose={() => dismissPostDeployAlert(alertId)} />}
      actionLinks={
        isMaasAdminLoaded && isMaasAdmin ? (
          <AlertActionLink
            data-testid="maas-published-post-deploy-alert-link"
            onClick={() => {
              dismissPostDeployAlert(alertId);
              navigate('/maas/maas-governance/overview', {
                state: {
                  overviewFilter: {
                    modelName,
                  },
                },
              });
            }}
          >
            Go to MaaS governance
          </AlertActionLink>
        ) : undefined
      }
    >
      When you enable a model for subscribed users, its endpoints are not accessible until an admin
      configures a subscription and authorization policy under{' '}
      <strong> Settings &gt; MaaS governance</strong>. Users can view their API keys, subscriptions,
      and accessible models under <strong>Gen AI studio &gt; API keys</strong>.
    </Alert>
  );
};

/** No-props wrapper for the model-serving banner extension */
export const MaaSPublishedInternalPostDeployAlert: React.FC = () => {
  const { isVisible, modelName } = usePostDeployAlert(MAAS_PUBLISHED_INTERNAL_ALERT_ID);
  if (!isVisible || !modelName) {
    return null;
  }
  return (
    <MaaSPublishedPostDeployAlert
      alertId={MAAS_PUBLISHED_INTERNAL_ALERT_ID}
      modelName={modelName}
    />
  );
};

export const MaaSPublishedExternalPostDeployAlert: React.FC = () => {
  const { isVisible, modelName } = usePostDeployAlert(MAAS_PUBLISHED_EXTERNAL_ALERT_ID);
  if (!isVisible || !modelName) {
    return null;
  }
  return (
    <MaaSPublishedPostDeployAlert
      alertId={MAAS_PUBLISHED_EXTERNAL_ALERT_ID}
      modelName={modelName}
    />
  );
};
