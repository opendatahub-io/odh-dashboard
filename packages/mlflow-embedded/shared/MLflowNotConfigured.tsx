import React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateVariant,
} from '@patternfly/react-core';
import { CogIcon } from '@patternfly/react-icons';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import WhosMyAdministrator from '@odh-dashboard/internal/components/WhosMyAdministrator';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import { useUser } from '@odh-dashboard/internal/redux/selectors/user';
import {
  MLFLOW_NOT_CONFIGURED_ADMIN_MESSAGE,
  MLFLOW_NOT_CONFIGURED_ADMIN_TITLE,
  MLFLOW_NOT_CONFIGURED_MESSAGE,
  MLFLOW_NOT_CONFIGURED_TITLE,
} from './const';
import SupportIcon from '../icons/SupportIcon';

const MLflowNotConfigured: React.FC = () => {
  const { isAdmin } = useUser();

  if (isAdmin) {
    return (
      <EmptyState
        headingLevel="h2"
        icon={CogIcon}
        titleText={MLFLOW_NOT_CONFIGURED_ADMIN_TITLE}
        variant={EmptyStateVariant.lg}
        data-testid="mlflow-not-configured-admin-empty-state"
      >
        <EmptyStateBody>{MLFLOW_NOT_CONFIGURED_ADMIN_MESSAGE}</EmptyStateBody>
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
