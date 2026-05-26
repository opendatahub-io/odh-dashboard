import React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateVariant,
} from '@patternfly/react-core';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import WhosMyAdministrator from '@odh-dashboard/internal/components/WhosMyAdministrator';
import { MLFLOW_NOT_CONFIGURED_TITLE, MLFLOW_NOT_CONFIGURED_MESSAGE } from './const';
import supportIconSvg from '../images/Icon-Red_Hat-Support-A-Black-RGB.svg';

const SupportIcon: React.FC = () => (
  <span
    style={{ display: 'inline-flex', width: 60, height: 60, color: 'inherit' }}
    // eslint-disable-next-line react/no-danger
    dangerouslySetInnerHTML={{ __html: supportIconSvg }}
    aria-hidden
  />
);

const MLflowNotConfigured: React.FC = () => (
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

export default MLflowNotConfigured;
