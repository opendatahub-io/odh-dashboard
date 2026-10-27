import React from 'react';
import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateVariant,
  Spinner,
} from '@patternfly/react-core';
import { CogIcon } from '@patternfly/react-icons';
import { WhosMyAdministrator } from '@odh-dashboard/ui-core';
import { checkAccess } from '@odh-dashboard/k8s-core/api/accessReview';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import { useUser } from '@odh-dashboard/internal/redux/selectors/user';
import { MLFLOW_NOT_CONFIGURED_MESSAGE, MLFLOW_NOT_CONFIGURED_TITLE } from './const';
import SupportIcon from '../icons/SupportIcon';

type MLflowNotConfiguredProps = {
  featureName: string;
};

const MLflowNotConfigured: React.FC<MLflowNotConfiguredProps> = ({ featureName }) => {
  const { isAdmin } = useUser();
  const [canManageMLflowCR, setCanManageMLflowCR] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    if (!isAdmin) {
      return undefined;
    }

    let active = true;
    // MLflow CRs are cluster-scoped, so these SSARs must omit the namespace.
    const resource = { group: 'mlflow.opendatahub.io', resource: 'mlflows' };
    const options = { failureMode: 'reject' } as const;
    Promise.all([
      checkAccess({ ...resource, verb: 'create' }, options),
      checkAccess({ ...resource, verb: 'update' }, options),
      checkAccess({ ...resource, verb: 'patch' }, options),
    ])
      .then(([canCreate, canUpdate, canPatch]) => {
        if (active) {
          setCanManageMLflowCR(canCreate && (canUpdate || canPatch));
        }
      })
      .catch(() => {
        if (active) {
          setCanManageMLflowCR(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isAdmin]);

  if (isAdmin && canManageMLflowCR === null) {
    return (
      <Bullseye>
        <Spinner aria-label="Checking MLflow permissions" />
      </Bullseye>
    );
  }

  if (isAdmin && canManageMLflowCR) {
    return (
      <EmptyState
        headingLevel="h2"
        icon={CogIcon}
        titleText={`Enable ${featureName}`}
        variant={EmptyStateVariant.lg}
        data-testid="mlflow-not-configured-admin-empty-state"
      >
        <EmptyStateBody>
          To enable the use of {featureName} on this cluster, enable the MLflow Operator component
          and ensure that an MLflow custom resource has been created and is ready. To learn more
          about how to install and configure MLflow, view the documentation.
        </EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <EmptyState
      headingLevel="h2"
      icon={SupportIcon}
      titleText={MLFLOW_NOT_CONFIGURED_TITLE}
      variant={EmptyStateVariant.lg}
      data-testid="mlflow-not-configured-empty-state"
    >
      <EmptyStateBody>{MLFLOW_NOT_CONFIGURED_MESSAGE}</EmptyStateBody>
      <EmptyStateFooter>
        <WhosMyAdministrator linkTestId="mlflow-not-configured-admin-link" />
      </EmptyStateFooter>
    </EmptyState>
  );
};

export default MLflowNotConfigured;
