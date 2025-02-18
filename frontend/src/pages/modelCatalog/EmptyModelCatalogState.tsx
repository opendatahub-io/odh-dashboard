import * as React from 'react';
import { EmptyState, EmptyStateBody, Title } from '@patternfly/react-core';

type EmptyModelCatalogStateProps = {
  title: string;
  description: string;
  headerIcon: React.ComponentType;
  testid?: string;
};

const EmptyModelCatalogState: React.FC<EmptyModelCatalogStateProps> = ({
  title,
  description,
  headerIcon: HeaderIcon,
  testid,
}) => (
  <EmptyState data-testid={testid}>
    <HeaderIcon />
    <Title headingLevel="h4" size="lg">
      {title}
    </Title>
    <EmptyStateBody>{description}</EmptyStateBody>
  </EmptyState>
);

export default EmptyModelCatalogState;
