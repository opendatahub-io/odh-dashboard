import * as React from 'react';
import { EmptyState, EmptyStateBody } from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';
import { RUNTIME_CATALOG_TITLE } from './const';

const RuntimeCatalogView: React.FC = () => (
  <EmptyState
    titleText={RUNTIME_CATALOG_TITLE}
    icon={CubesIcon}
    headingLevel="h2"
    data-testid="runtime-catalog-placeholder"
  >
    <EmptyStateBody>
      The runtime image library is under construction. Check back soon.
    </EmptyStateBody>
  </EmptyState>
);

export default RuntimeCatalogView;
