import * as React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateVariant,
  Title,
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
  <EmptyState variant={variant} data-id="bias-metrics-empty-state">
    <EmptyStateIcon icon={WrenchIcon} />
    <Title headingLevel="h2" size="lg">
      {EMPTY_BIAS_CONFIGURATION_TITLE}
    </Title>
    <EmptyStateBody>{EMPTY_BIAS_CONFIGURATION_DESC}</EmptyStateBody>
    {actionButton}
  </EmptyState>
);

export default BiasConfigurationEmptyState;
