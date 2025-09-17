import * as React from 'react';
import { EmptyState, EmptyStateBody, EmptyStateVariant } from '@patternfly/react-core';
import { CubeIcon } from '@patternfly/react-icons';

type AIAssetsEmptyStateProps = {
  message: string;
};

const AIAssetsEmptyState: React.FC<AIAssetsEmptyStateProps> = ({ message }) => (
  <EmptyState variant={EmptyStateVariant.lg} data-testid="ai-assets-empty-state" icon={CubeIcon}>
    <EmptyStateBody>{message}</EmptyStateBody>
  </EmptyState>
);

export default AIAssetsEmptyState;
