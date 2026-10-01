import * as React from 'react';
import { EmptyState, EmptyStateBody } from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';

const RuntimeCatalogView: React.FC = () => (
  <EmptyState
    data-testid="runtime-catalog-landing"
    headingLevel="h2"
    icon={CubesIcon}
    titleText="Runtime images"
  >
    <EmptyStateBody>
      Browse container images and templates you can install as serving runtimes on this cluster.
    </EmptyStateBody>
  </EmptyState>
);

export default RuntimeCatalogView;
