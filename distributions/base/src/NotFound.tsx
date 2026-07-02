import React from 'react';
import { PageSection, EmptyState, EmptyStateBody } from '@patternfly/react-core';

type NotFoundProps = {
  hasRoutes?: boolean;
};

const NotFound: React.FC<NotFoundProps> = ({ hasRoutes = true }) => (
  <PageSection hasBodyWrapper={false}>
    <EmptyState headingLevel="h1" titleText={hasRoutes ? 'Page not found' : 'No features loaded'}>
      <EmptyStateBody>
        {hasRoutes
          ? 'The requested page could not be found. Check the URL or navigate using the sidebar.'
          : 'This is the base shell framework. Add a distribution layer to enable features.'}
      </EmptyStateBody>
    </EmptyState>
  </PageSection>
);

export default NotFound;
