import React from 'react';
import { EmptyState, EmptyStateBody, EmptyStateVariant } from '@patternfly/react-core';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';
import { MLFLOW_UNAVAILABLE_TITLE, MLFLOW_UNAVAILABLE_MESSAGE } from './constants';

const MLflowUnavailable: React.FC = () => (
  <EmptyState
    headingLevel="h2"
    icon={ExclamationTriangleIcon}
    titleText={MLFLOW_UNAVAILABLE_TITLE}
    variant={EmptyStateVariant.lg}
    data-testid="mlflow-unavailable-empty-state"
  >
    <EmptyStateBody>{MLFLOW_UNAVAILABLE_MESSAGE}</EmptyStateBody>
  </EmptyState>
);

export default MLflowUnavailable;
