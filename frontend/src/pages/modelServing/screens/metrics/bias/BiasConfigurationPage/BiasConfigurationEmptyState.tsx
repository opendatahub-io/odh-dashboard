import * as React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateVariant,
  EmptyStateHeader,
  EmptyStateFooter,
} from '@patternfly/react-core';
import { WrenchIcon } from '@patternfly/react-icons';
import {
  EMPTY_BIAS_CONFIGURATION_DESC,
  EMPTY_BIAS_CONFIGURATION_TITLE,
} from '~/pages/modelServing/screens/metrics/const';

type BiasConfigurationEmptyStateProps = {
  actionButton: React.ReactNode;
  variant: EmptyStateVariant;
};

const BiasConfigurationEmptyState: React.FC<BiasConfigurationEmptyStateProps> = ({
  actionButton,
  variant,
}) => (
  <EmptyState variant={variant} data-testid="bias-metrics-empty-state">
    <EmptyStateHeader
      titleText={EMPTY_BIAS_CONFIGURATION_TITLE}
      icon={<EmptyStateIcon icon={WrenchIcon} />}
      headingLevel="h2"
    />
    <EmptyStateBody>{EMPTY_BIAS_CONFIGURATION_DESC}</EmptyStateBody>
    <EmptyStateFooter>{actionButton}</EmptyStateFooter>
  </EmptyState>
);

export default BiasConfigurationEmptyState;
