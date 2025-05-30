import * as React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  EmptyStateFooter,
} from '@patternfly/react-core';
import { CogIcon } from '@patternfly/react-icons';
import {
  EMPTY_BIAS_CONFIGURATION_DESC,
  EMPTY_BIAS_CONFIGURATION_TITLE,
} from '#~/pages/modelServing/screens/metrics/const';

type BiasConfigurationEmptyStateProps = {
  actionButton: React.ReactNode;
  variant: EmptyStateVariant;
};

const BiasConfigurationEmptyState: React.FC<BiasConfigurationEmptyStateProps> = ({
  actionButton,
  variant,
}) => (
  <EmptyState
    headingLevel="h2"
    icon={CogIcon}
    titleText={EMPTY_BIAS_CONFIGURATION_TITLE}
    variant={variant}
    data-testid="bias-metrics-empty-state"
  >
    <EmptyStateBody>{EMPTY_BIAS_CONFIGURATION_DESC}</EmptyStateBody>
    <EmptyStateFooter>{actionButton}</EmptyStateFooter>
  </EmptyState>
);

export default BiasConfigurationEmptyState;
