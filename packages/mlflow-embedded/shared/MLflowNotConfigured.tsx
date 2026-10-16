import React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateVariant,
} from '@patternfly/react-core';
import { CogIcon } from '@patternfly/react-icons';
import { WhosMyAdministrator } from '@odh-dashboard/ui-core';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import { useUser } from '@odh-dashboard/internal/redux/selectors/user';
import { MLFLOW_NOT_CONFIGURED_MESSAGE, MLFLOW_NOT_CONFIGURED_TITLE } from './const';
import SupportIcon from '../icons/SupportIcon';

type MLflowNotConfiguredProps = {
  featureName: string;
};

const MLflowNotConfigured: React.FC<MLflowNotConfiguredProps> = ({ featureName }) => {
  const { isAdmin } = useUser();

  if (isAdmin) {
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
          and ensure that an MLflow custom resource has been created. To learn more about how to
          install and configure MLflow, view the documentation.
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
