import React from 'react';
import {
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateVariant,
} from '@patternfly/react-core';
import { CogIcon, ExternalLinkAltIcon } from '@patternfly/react-icons';
import { WhosMyAdministrator } from '@odh-dashboard/ui-core';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import { useUser } from '@odh-dashboard/internal/redux/selectors/user';
import {
  MLFLOW_NOT_CONFIGURED_ADMIN_MESSAGE,
  MLFLOW_NOT_CONFIGURED_ADMIN_TITLE,
  MLFLOW_NOT_CONFIGURED_MESSAGE,
  MLFLOW_NOT_CONFIGURED_TITLE,
  MLFLOW_INSTALLATION_DOCS_URL,
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
        <EmptyStateFooter>
          <Button
            component="a"
            data-testid="mlflow-installation-docs-link"
            href={MLFLOW_INSTALLATION_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            variant="link"
            icon={<ExternalLinkAltIcon />}
            iconPosition="end"
          >
            Learn how to install and configure MLflow
          </Button>
        </EmptyStateFooter>
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
